import { ProfileTab } from '../../components/features/customer/account/ProfileTab';
import { OrdersTab } from '../../components/features/customer/account/OrdersTab';
import { RentalsTab } from '../../components/features/customer/account/RentalsTab';
import { useState, useEffect } from 'react';
import { User, Package, MapPin, Phone, Mail, Edit, Save, X, LogOut, Loader2, ShieldCheck, Truck, Calendar, Clock, Coins, AlertCircle, CheckCircle2, ClipboardList, Lock, Key, Eye, EyeOff } from 'lucide-react'; 
import { Link, useNavigate } from 'react-router-dom'; 
import { ImageWithFallback } from '../../components/common/ImageWithFallback';
import { Button } from '../../components/common/button';
import { Input } from '../../components/common/input';
import { Label } from '../../components/common/label';
import { Card } from '../../components/common/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/common/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/common/alert-dialog';
import { Textarea } from '../../components/common/textarea';
import { toast } from 'sonner';
import { useAuth } from '../../store/AuthContext';
import { API_BASE_URL } from '../../config';
import { useTranslation } from 'react-i18next';
import { Pagination } from '../../components/common/Pagination';

export function UserAccount() {
  const { user, setUser, logout } = useAuth(); 
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPageSize, setOrdersPageSize] = useState(5);
  const [rentalsPage, setRentalsPage] = useState(1);
  const [rentalsPageSize, setRentalsPageSize] = useState(5);
  
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [tempProfile, setTempProfile] = useState(profile);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSaving, setIsSaving] = useState(false); // New loading state for saving
  const [isCancelling, setIsCancelling] = useState(false);
  const [rentals, setRentals] = useState([]);
  const [loadingRentals, setLoadingRentals] = useState(true);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isOldPasswordVerified, setIsOldPasswordVerified] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
      fetchOrders(); 
      fetchRentals();
    } else if (!localStorage.getItem('token')) {
      navigate('/login/customer', { replace: true });
    }
  }, [user, navigate]);

  const loadProfile = () => {
    if (user && typeof user === 'object') {
      const dbProfile = {
        name: user.full_name || user.name || '',        
        phone: user.phone || user.username || '', 
        email: user.email || '',
        address: user.address || ''
      };
      setProfile(dbProfile);
      // Only reset tempProfile if not in edit mode
      if (!editMode) {
        setTempProfile(dbProfile);
      }
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    if (!user || !user.id || user.id === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`${API_BASE_URL}/get_user_orders.php?user_id=${user.id}`, { headers });
      const data = await response.json();

      if (data && data.success && Array.isArray(data.orders)) {
        const mappedOrders = data.orders.map(order => {
          if (!order) return null;
          const totalAmount = parseFloat(order.total_amount ?? order.total) || 0;
          const amountPaid = parseFloat(order.amount_paid) || 0;
          
          // Determine payment status from DB
          let paymentStatus = String(order.payment_status || 'pending').toLowerCase();
          if (paymentStatus === 'paid' || amountPaid >= totalAmount) {
            paymentStatus = 'paid';
          } else if (amountPaid > 0) {
            paymentStatus = 'partial';
          }
          
          const shippingAddr = String(order.shipping_address || '');
          const isPickup = (order.order_type === 'pickup' || (shippingAddr && (
            shippingAddr.toLowerCase().includes('pickup') || 
            shippingAddr.toLowerCase().includes('store') || 
            shippingAddr.toLowerCase().includes('collect') || 
            shippingAddr.toLowerCase().includes('self') || 
            shippingAddr.toLowerCase().includes('shop')
          )));

          const itemsList = Array.isArray(order.items) ? order.items.map(item => ({
            quantity: Number(item?.quantity) || 1,
            isWeightPending: item?.is_weight_pending == 1, 
            service: {
              name: item?.name || item?.prod_name || 'Product',
              price: parseFloat(item?.price_at_purchase ?? item?.price) || 0
            }
          })) : [];

          return {
            id: order.id,
            status: String(order.status || 'pending'),
            createdAt: order.created_at || '', 
            cancelReason: order.cancellation_reason || null,
            cancelledBy: order.cancelled_by || null,
            paymentRejectReason: order.payment_reject_reason || null,
            paymentRejectDate: order.payment_reject_date || null,
            assignedDate: order.assigned_date || null,
            total: totalAmount,
            amountPaid: amountPaid,
            paymentMethod: String(order.payment_method || 'cod'),
            paymentStatus: paymentStatus,
            deliveryAddress: shippingAddr,
            type: isPickup ? 'pickup' : 'delivery',
            items: itemsList
          };
        }).filter(Boolean);
        setOrders(mappedOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error(t("Failed to load order history."));
    } finally {
      setLoading(false);
    }
  };

  const fetchRentals = async () => {
    setLoadingRentals(true);
    if (!user || !user.id || user.id === 0) {
      setRentals([]);
      setLoadingRentals(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`${API_BASE_URL}/get_rental_history.php?user_id=${user.id}`, { headers });
      const data = await response.json();

      if (data && data.success) {
        const rawRentals = data.data?.rentals || data.rentals || [];
        setRentals(Array.isArray(rawRentals) ? rawRentals : []);
      } else {
        setRentals([]);
      }
    } catch (error) {
      console.error("Error loading rentals:", error);
      toast.error(t("Failed to load rental history."));
    } finally {
      setLoadingRentals(false);
    }
  };

  const handleEdit = () => {
    setTempProfile(profile);
    setEditMode(true);
  };

  const handleCancel = () => {
    setTempProfile(profile);
    setEditMode(false);
  };

  // NEW: API Connected Save Function
  const handleSave = async () => {
    if (!tempProfile.name.trim()) {
      toast.error(t('Name is required'));
      return;
    }
    const cleanPhone = (tempProfile.phone || '').replace(/\D/g, '');
    if (!cleanPhone) {
      toast.error(t('Phone number is required'));
      return;
    }
    if (!/^0\d{10}$/.test(cleanPhone)) {
      toast.error(t('Phone number must start with 0 and be exactly 11 digits.'));
      return;
    }

    setIsSaving(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/update_user_profile.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          name: tempProfile.name,
          phone: cleanPhone,
          email: tempProfile.email,
          address: tempProfile.address
        })
      });

      const result = await response.json();

      if (result.success) {
        // Build the updated user object
        const updatedUser = {
          ...user,
          full_name: tempProfile.name,
          name: tempProfile.name,
          phone: cleanPhone,
          email: tempProfile.email,
          address: tempProfile.address
        };

        // Update React Auth Context (this syncs the whole app)
        setUser(updatedUser);

        // Also directly update localStorage to ensure it's synced immediately
        localStorage.setItem('user', JSON.stringify(updatedUser));

        // Update local UI state
        const updatedProfile = { ...tempProfile, phone: cleanPhone };
        setProfile(updatedProfile);
        setTempProfile(updatedProfile);
        setEditMode(false);
        toast.success(t('Profile updated successfully!'));
      } else {
        toast.error(result.message || t('Failed to update profile'));
      }
    } catch (error) {
      toast.error(t('Network error. Could not connect to database.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyCurrentPassword = async () => {
    if (!currentPassword.trim()) {
      toast.error(t('Please enter your current password.'));
      return;
    }
    setIsVerifyingPassword(true);
    try {
      const response = await fetch(`${API_BASE_URL}/change_password.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          user_id: user.id,
          current_password: currentPassword
        })
      });
      const result = await response.json();
      if (result.success) {
        setIsOldPasswordVerified(true);
        toast.success(t('Current password verified! You can now set your new password.'));
      } else {
        toast.error(t(result.message || 'Incorrect current password.'));
      }
    } catch (error) {
      toast.error(t('Network error. Please try again.'));
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const validateNewPassword = () => {
    if (/\s/.test(newPassword)) {
      toast.error(t('Password must not contain spaces.'));
      return false;
    }
    if (newPassword.length < 8) {
      toast.error(t('Password must be at least 8 characters.'));
      return false;
    }
    if (newPassword.length > 50) {
      toast.error(t('Password must not exceed 50 characters.'));
      return false;
    }
    if (!/^[A-Z]/.test(newPassword)) {
      toast.error(t('Password must start with a capital letter.'));
      return false;
    }
    if (!/[0-9]/.test(newPassword)) {
      toast.error(t('Password must contain at least one number.'));
      return false;
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      toast.error(t('Password must contain at least one special character.'));
      return false;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error(t('Passwords do not match.'));
      return false;
    }
    return true;
  };

  const handleUpdatePassword = async () => {
    if (!isOldPasswordVerified) {
      toast.error(t('Please verify your current password first to unlock new password setting.'));
      return;
    }
    if (!validateNewPassword()) return;

    setIsUpdatingPassword(true);
    try {
      const response = await fetch(`${API_BASE_URL}/change_password.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          user_id: user.id,
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      const result = await response.json();
      if (result.success) {
        toast.success(t('Password updated successfully!'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setIsOldPasswordVerified(false);
      } else {
        toast.error(t(result.message || 'Failed to update password'));
      }
    } catch (error) {
      toast.error(t('Network error. Please try again.'));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success(t('You have been logged out.'));
    navigate('/'); 
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const cleanStr = String(dateString).replace(/-/g, '/');
      const date = new Date(cleanStr); 
      if (isNaN(date.getTime())) return String(dateString);
      return date.toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return String(dateString || '');
    }
  };

  const formatSimpleDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(String(dateString));
      if (isNaN(date.getTime())) return String(dateString);
      return date.toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return String(dateString || '');
    }
  };

  const getStatusColor = (status) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'ready': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getRentalStatusColor = (status) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'returned': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'overdue': return 'bg-red-100 text-red-800 animate-pulse dark:bg-red-900/30 dark:text-red-400';
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      case 'active':
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getDepositStatusColor = (status) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'refunded': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'partial_refund': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'forfeited': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'held':
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelOrder || isCancelling) return;

    // Direct frontend check: block cancellation if order is assigned to today's date or earlier
    const todayStr = new Date().toISOString().split('T')[0];
    if (cancelOrder.assignedDate && cancelOrder.assignedDate <= todayStr) {
      toast.error(t('Processing has started, it cannot be cancelled now / پروسیسنگ شروع ہو چکی ہے، اب آرڈر کینسل نہیں کیا جا سکتا۔'));
      setCancelOrder(null);
      setCancelReason('');
      return;
    }

    setIsCancelling(true);
    try {
      const response = await fetch(`${API_BASE_URL}/cancel_order.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            order_id: cancelOrder.id,
            reason: cancelReason,
            cancelled_by: 'User'
          })
      });
      const result = await response.json();
      if (result.success) {
        toast.success(t('Order cancelled successfully'));
        fetchOrders(); 
      } else {
        toast.error(result.message || t('Failed to cancel order'));
      }
    } catch (e) {
      toast.error(t('Network error while cancelling'));
    } finally {
      setIsCancelling(false);
      setCancelOrder(null);
      setCancelReason('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        <div className="mb-8">
          <h1 className="text-foreground mb-1">{t('My Account')}</h1>
          <p className="text-muted-foreground mb-3">{t('Manage your profile and view order history')}</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center h-10 px-5 rounded-xl text-sm font-semibold border-2 border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition-all duration-200 shadow-sm"
            >
              <LogOut className="h-4 w-4 mr-2 text-red-700" />
              {t('Sign Out')}
            </button>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="flex flex-row w-full max-w-lg p-1.5 bg-[#f8f5f0] rounded-xl border border-[#e5d8c8] shadow-inner h-auto gap-1">
            <TabsTrigger value="profile" className="flex-1 py-2.5 data-[state=active]:bg-white data-[state=active]:text-[#8b6f47] data-[state=active]:shadow-sm rounded-lg font-semibold">{t('Profile')}</TabsTrigger>
            <TabsTrigger value="orders" className="flex-1 py-2.5 data-[state=active]:bg-white data-[state=active]:text-[#8b6f47] data-[state=active]:shadow-sm rounded-lg font-semibold">{t('Orders')}</TabsTrigger>
            <TabsTrigger value="rentals" className="flex-1 py-2.5 data-[state=active]:bg-white data-[state=active]:text-[#8b6f47] data-[state=active]:shadow-sm rounded-lg font-semibold">{t('Rentals')}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileTab
              user={user}
              profile={profile}
              tempProfile={tempProfile}
              setTempProfile={setTempProfile}
              editMode={editMode}
              isSaving={isSaving}
              handleEdit={handleEdit}
              handleCancel={handleCancel}
              handleSave={handleSave}
              currentPassword={currentPassword}
              setCurrentPassword={setCurrentPassword}
              showCurrentPassword={showCurrentPassword}
              setShowCurrentPassword={setShowCurrentPassword}
              isOldPasswordVerified={isOldPasswordVerified}
              setIsOldPasswordVerified={setIsOldPasswordVerified}
              isVerifyingPassword={isVerifyingPassword}
              handleVerifyCurrentPassword={handleVerifyCurrentPassword}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              showNewPassword={showNewPassword}
              setShowNewPassword={setShowNewPassword}
              confirmNewPassword={confirmNewPassword}
              setConfirmNewPassword={setConfirmNewPassword}
              showConfirmNewPassword={showConfirmNewPassword}
              setShowConfirmNewPassword={setShowConfirmNewPassword}
              isUpdatingPassword={isUpdatingPassword}
              handleUpdatePassword={handleUpdatePassword}
              t={t}
            />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersTab
                orders={orders}
                loading={loading}
              ordersPage={ordersPage}
              setOrdersPage={setOrdersPage}
              ordersPageSize={ordersPageSize}
              setOrdersPageSize={setOrdersPageSize}
              getStatusColor={getStatusColor}
              formatDate={formatDate}
              setCancelOrder={setCancelOrder}
              t={t}
            />
          </TabsContent>

          <TabsContent value="rentals">
            <RentalsTab
                rentals={rentals}
                loadingRentals={loadingRentals}
              rentalsPage={rentalsPage}
              setRentalsPage={setRentalsPage}
              rentalsPageSize={rentalsPageSize}
              setRentalsPageSize={setRentalsPageSize}
              getRentalStatusColor={getRentalStatusColor}
              getDepositStatusColor={getDepositStatusColor}
              formatSimpleDate={formatSimpleDate}
              t={t}
            />
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!cancelOrder} onOpenChange={() => { setCancelOrder(null); setCancelReason(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Are you sure you want to cancel this order? This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder={t("Optional: Tell us why you're cancelling...")}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>{t('No, Keep Order')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleCancelOrder}
              disabled={isCancelling}
            >
              {isCancelling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {isCancelling ? t('Cancelling...') : t('Yes, Cancel My Order')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}









