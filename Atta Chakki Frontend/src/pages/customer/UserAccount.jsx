import { useState, useEffect } from 'react';
import { User, Package, MapPin, Phone, Mail, Edit, Save, X, LogOut, Loader2, ShieldCheck, Truck, Calendar, Clock, Coins, AlertCircle, CheckCircle2, ClipboardList } from 'lucide-react'; 
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

export function UserAccount() {
  const { user, setUser, logout } = useAuth(); 
  const navigate = useNavigate();
  const { t } = useTranslation();
  
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
  const [rentals, setRentals] = useState([]);
  const [loadingRentals, setLoadingRentals] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfile();
      fetchOrders(); 
      fetchRentals();
    }
  }, [user]);

  const loadProfile = () => {
    if (user) {
      const dbProfile = {
       name: user.full_name || user.name || '',        
       phone: user.phone || user.username || '', 
        email: user.email || '',
        address: user.address || ''
      };
      setProfile(dbProfile);
      setTempProfile(dbProfile);
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
      const response = await fetch(`${API_BASE_URL}/get_user_orders.php?user_id=${user.id}`);
      const data = await response.json();

      if (data.success) {
        const mappedOrders = data.orders.map(order => {
          const totalAmount = parseFloat(order.total_amount) || 0;
          const amountPaid = parseFloat(order.amount_paid) || 0;
          
          // Determine payment status from DB
          let paymentStatus = order.payment_status || 'pending';
          if (paymentStatus === 'paid' || amountPaid >= totalAmount) {
            paymentStatus = 'paid';
          } else if (amountPaid > 0) {
            paymentStatus = 'partial';
          }
          
          return {
            id: order.id,
            status: order.status,
            createdAt: order.created_at, 
			  cancelReason: order.cancellation_reason,
			  cancelledBy: order.cancelled_by,
              paymentRejectReason: order.payment_reject_reason || null,
              paymentRejectDate: order.payment_reject_date || null,
              assignedDate: order.assigned_date || null,
			  total: totalAmount,
            amountPaid: amountPaid,
            paymentMethod: order.payment_method || 'cod',
            paymentStatus: paymentStatus,
            deliveryAddress: order.shipping_address,
            type: (order.order_type === 'pickup' || (order.shipping_address && (
              order.shipping_address.toLowerCase().includes('pickup') || 
              order.shipping_address.toLowerCase().includes('store') || 
              order.shipping_address.toLowerCase().includes('collect') || 
              order.shipping_address.toLowerCase().includes('self') || 
              order.shipping_address.toLowerCase().includes('shop')
            ))) ? 'pickup' : 'delivery',
            items: order.items ? order.items.map(item => ({
               quantity: item.quantity,
               isWeightPending: item.is_weight_pending == 1, 
               service: {
                 name: item.name,
                 price: item.price_at_purchase || 0
               }
            })) : []
          };
        });
        setOrders(mappedOrders);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error("Failed to load order history.");
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
      const response = await fetch(`${API_BASE_URL}/get_rental_history.php?user_id=${user.id}`);
      const data = await response.json();

      if (data.success) {
        setRentals(data.data.rentals || []);
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

  // --- NEW: API Connected Save Function ---
  const handleSave = async () => {
    if (!tempProfile.name.trim()) {
      toast.error(t('Name is required'));
      return;
    }
    if (!tempProfile.phone.trim()) {
      toast.error(t('Phone number is required'));
      return;
    }

    const cleanPhone = tempProfile.phone.replace(/\s/g, '');
    if (!/^\d{11}$/.test(cleanPhone)) {
      toast.error(t('Phone number must be exactly 11 digits with no spaces.'));
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
          address: tempProfile.address
        })
      });

      const result = await response.json();

      if (result.success) {
        // Update React Auth Context (this syncs the whole app)
        setUser(prev => ({
          ...prev,
          full_name: tempProfile.name,
          name: tempProfile.name,
          phone: cleanPhone,
          address: tempProfile.address
        }));

        // 3. Update UI
        const updatedProfile = { ...tempProfile, phone: cleanPhone };
        setProfile(updatedProfile);
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

  const handleLogout = () => {
    logout();
    toast.success(t('You have been logged out.'));
    navigate('/'); 
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString.replace(/-/g, '/')); 
    return date.toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSimpleDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'ready': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getRentalStatusColor = (status) => {
    switch (status) {
      case 'returned': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'overdue': return 'bg-red-100 text-red-800 animate-pulse dark:bg-red-900/30 dark:text-red-400';
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      case 'active':
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getDepositStatusColor = (status) => {
    switch (status) {
      case 'refunded': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'partial_refund': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'forfeited': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'held':
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelOrder) return;

    // Direct frontend check: block cancellation if order is assigned to today's date or earlier
    const todayStr = new Date().toISOString().split('T')[0];
    if (cancelOrder.assignedDate && cancelOrder.assignedDate <= todayStr) {
      toast.error(t('Processing has started, it cannot be cancelled now / پروسیسنگ شروع ہو چکی ہے، اب آرڈر کینسل نہیں کیا جا سکتا۔'));
      setCancelOrder(null);
      setCancelReason('');
      return;
    }

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
            <Card className="p-6 md:p-8">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-xl text-foreground leading-tight truncate">{profile.name}</h2>
                    <p className="text-sm text-muted-foreground truncate">{profile.phone}</p>
                  </div>
                </div>
                {!editMode && (
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="inline-flex items-center justify-center h-10 px-5 rounded-xl text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all duration-200"
                    style={{ background: 'linear-gradient(135deg, #8b6f47 0%, #a0845c 100%)' }}
                  >
                    <Edit className="h-4 w-4 mr-2 text-white" />
                    {t('Edit Details')}
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* FULL NAME */}
                  <div>
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4" /> {t('Full Name')}
                    </Label>
                    {editMode ? (
                      <Input
                        id="name"
                        value={tempProfile.name}
                        onChange={(e) => setTempProfile({ ...tempProfile, name: e.target.value })}
                        placeholder={t('Enter your full name')}
                      />
                    ) : (
                      <p className="mt-1 text-foreground">{profile.name || t('Not provided')}</p>
                    )}
                  </div>

                  {/* PHONE NUMBER */}
                  <div>
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" /> {t('Phone Number')}
                    </Label>
                    {editMode ? (
                      <Input
                        id="phone"
                        value={tempProfile.phone}
                        onChange={(e) => setTempProfile({ ...tempProfile, phone: e.target.value })}
                        placeholder="0300 1234567"
                      />
                    ) : (
                      <p className="mt-1 text-foreground">{profile.phone || t('Not provided')}</p>
                    )}
                  </div>

                  {/* ADDRESS */}
                  <div>
                    <Label htmlFor="address" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> {t('Default Address')}
                    </Label>
                    {editMode ? (
                      <Input
                        id="address"
                        value={tempProfile.address}
                        onChange={(e) => setTempProfile({ ...tempProfile, address: e.target.value })}
                        placeholder="House # 123, Street 1, Lahore"
                      />
                    ) : (
                      <p className="mt-1 text-foreground">{profile.address || t('Not provided')}</p>
                    )}
                  </div>
                </div>

                {editMode && (
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      {isSaving ? t('Saving...') : t('Save Changes')}
                    </Button>
                    <Button onClick={handleCancel} variant="outline" disabled={isSaving}>
                      <X className="h-4 w-4 mr-2" /> {t('Cancel')}
                    </Button>
                  </div>
                )}
              </div>

              {/* Management Portals Section */}
              {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'delivery' || user?.role?.toLowerCase() === 'delivery_boy') && (
                <div className="mt-8 pt-6 border-t border-border">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    {t('Management Portals')}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {user?.role?.toLowerCase() === 'admin' && (
                      <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Link to="/admin/dashboard">
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          {t('Admin Portal')}
                        </Link>
                      </Button>
                    )}
                    {(user?.role?.toLowerCase() === 'delivery' || user?.role?.toLowerCase() === 'delivery_boy') && (
                      <Button asChild variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                        <Link to="/delivery">
                          <Truck className="h-4 w-4 mr-2" />
                          {t('Delivery Panel')}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <div className="space-y-4">
              {loading ? (
                 <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>{t('Loading your orders...')}</p>
                 </div>
              ) : orders.length === 0 ? (
                <Card className="p-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="mb-2">{t('No orders yet')}</h3>
                  <p className="text-muted-foreground">{t('When you place an order, it will appear here')}</p>
                </Card>
              ) : (
                orders.map((order) => {
                  const hasPending = order.items.some(i => i.isWeightPending);
                  return (
                  <Card key={order.id} className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-foreground">{t('Order ID')}: {order.id}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                            {order.status.toUpperCase()}
                          </span>
                        </div>                          {order.status === 'cancelled' && order.cancelReason && (
                            <p className="text-sm text-red-600 font-medium mt-1">
                              {t('Reason:')} {order.cancelReason}
                              {order.cancelledBy && ` (${t('by')} ${order.cancelledBy})`}
                            </p>
                          )}
                          {order.paymentStatus === 'unpaid' && order.paymentRejectReason && (
                            <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                              <div className="flex items-start gap-2">
                                <span className="text-red-500 text-base mt-0.5">⚠️</span>
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-red-800 uppercase tracking-wider">
                                    {t('Payment Verification Failed')} / {t('ادائیگی کی تصدیق نامکمل')}
                                  </p>
                                  <p className="text-sm text-red-700">
                                    <strong>{t('Reason')} / {t('وجہ')}:</strong> {order.paymentRejectReason}
                                  </p>
                                  {order.paymentRejectDate && new Date(order.paymentRejectDate).toDateString() === new Date().toDateString() && (
                                    <div className="mt-2 inline-flex items-center gap-1.5 bg-red-600 text-white font-semibold text-[10px] px-2 py-0.5 rounded-full animate-bounce">
                                      <span>🔴</span>
                                      <span>PAYMENT REJECTED TODAY / ادائیگی آج ہی مسترد کی گئی ہے!</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground mt-2">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-sm text-muted-foreground">{t('Total Amount')}</p>
                        <p className="text-primary font-bold">
                          Rs. {order.total.toLocaleString()}
                          {hasPending && <span className="text-xs ml-1">(+ TBD)</span>}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      <h4 className="mb-3 text-sm font-semibold">{t('Order Items')}</h4>
                      <div className="space-y-2">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {item.service.name} <span className="text-foreground">x {item.quantity}</span>
                            </span>
                            <span className="text-foreground">
                              {item.isWeightPending ? (
                                <span className="text-primary font-medium">{t('Pending Wt.')}</span>
                              ) : (
                                `Rs. ${(item.service.price * item.quantity).toLocaleString()}`
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {order.type === 'delivery' && (
                      <div className="border-t border-border pt-4 mt-4">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {order.deliveryAddress}
                        </p>
                      </div>
                    )}

                    <div className="border-t border-border pt-4 mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">{t('Payment')}</p>
                          <p className="text-sm font-medium">{order.paymentMethod.toUpperCase()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t('Status')}</p>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mt-0.5 ${
                            order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                            order.paymentStatus === 'partial' ? 'bg-blue-100 text-blue-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {order.paymentStatus === 'paid' ? t('Paid') : 
                             order.paymentStatus === 'partial' ? t('Partial') : t('Unpaid')}
                          </span>
                          {order.amountPaid > 0 && order.paymentStatus !== 'paid' && (
                            <p className="text-xs text-green-600 mt-0.5">
                              {t('Paid:')} Rs. {order.amountPaid.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      {(order.status === 'pending') && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setCancelOrder(order)}
                        >
                          {t('Cancel Order')}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
            </div>
          </TabsContent>

          <TabsContent value="rentals">
            {/* Stats Overview */}
            {rentals.length > 0 && (
              <div className="flex flex-row w-full gap-4 mb-6">
                <Card className="flex-1 p-4 flex flex-row items-center justify-start gap-4 border-l-4 border-l-blue-500 min-w-0">
                  <div className="p-3 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
                    <Package className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col items-start text-left min-w-0">
                    <p className="text-sm text-muted-foreground truncate w-full">{t('Total Rentals')}</p>
                    <p className="text-2xl font-bold">{rentals.length}</p>
                  </div>
                </Card>
                <Card className="flex-1 p-4 flex flex-row items-center justify-start gap-4 border-l-4 border-l-orange-500 min-w-0">
                  <div className="p-3 rounded-lg bg-orange-100 text-orange-600 flex-shrink-0">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col items-start text-left min-w-0">
                    <p className="text-sm text-muted-foreground truncate w-full">{t('Active')}</p>
                    <p className="text-2xl font-bold">
                      {rentals.filter(r => r.status === 'active' || r.status === 'overdue').length}
                    </p>
                  </div>
                </Card>
                <Card className="flex-1 p-4 flex flex-row items-center justify-start gap-4 border-l-4 border-l-green-500 min-w-0">
                  <div className="p-3 rounded-lg bg-green-100 text-green-600 flex-shrink-0">
                    <Coins className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col items-start text-left min-w-0">
                    <p className="text-sm text-muted-foreground truncate w-full">{t('Refunded Amount')}</p>
                    <p className="text-2xl font-bold truncate w-full">
                      Rs. {rentals
                        .filter(r => r.deposit_status === 'refunded' || r.deposit_status === 'partial_refund')
                        .reduce((sum, r) => sum + parseFloat(r.deposit_refund_amount || 0), 0)
                        .toLocaleString()}
                    </p>
                  </div>
                </Card>
              </div>
            )}

            <div className="space-y-4">
              {loadingRentals ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>{t('Loading your rentals...')}</p>
                </div>
              ) : rentals.length === 0 ? (
                <Card className="p-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="mb-2">{t('No rentals yet')}</h3>
                  <p className="text-muted-foreground">{t('When you rent an item, it will appear here')}</p>
                </Card>
              ) : (
                rentals.map((rental) => {
                  const imageSrc = rental.product_image
                    ? (rental.product_image.startsWith('http') || rental.product_image.startsWith('/')
                      ? rental.product_image
                      : `${API_BASE_URL}/${rental.product_image}`)
                    : null;

                  return (
                    <Card key={rental.id} className="p-6 overflow-hidden">
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Left Side: Product Image & Badges */}
                        <div className="flex flex-row md:flex-col gap-4 items-center md:items-start min-w-[120px]">
                          <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                            {imageSrc ? (
                              <ImageWithFallback
                                src={imageSrc}
                                alt={rental.product_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex flex-col gap-2 w-full">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold text-center w-fit ${getRentalStatusColor(rental.status)}`}>
                              {t(rental.status.charAt(0).toUpperCase() + rental.status.slice(1))}
                            </span>
                            <span className="text-xs text-muted-foreground text-center md:text-left">
                              {t('Qty')}: {rental.quantity}
                            </span>
                          </div>
                        </div>

                        {/* Middle Side: Main details */}
                        <div className="flex-1 space-y-4">
                          <div>
                            <h3 className="text-lg font-bold text-foreground mb-1">{rental.product_name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {t('Order ID')}: {rental.order_id || t('Direct Rental')}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>
                                <strong>{t('Start Date')}:</strong> {formatSimpleDate(rental.rental_start_date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>
                                <strong>{t('End Date')}:</strong> {formatSimpleDate(rental.rental_end_date)}
                              </span>
                            </div>
                            {rental.actual_return_date && (
                              <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>
                                  <strong>{t('Return Date')}:</strong> {formatSimpleDate(rental.actual_return_date)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Notes if any */}
                          {rental.condition_notes && (
                            <div className="bg-muted/50 p-3 rounded-lg border border-border text-xs text-muted-foreground">
                              <strong>{t('Condition Notes')}:</strong> {rental.condition_notes}
                            </div>
                          )}

                          {/* Overdue/Late penalty notification */}
                          {rental.status === 'overdue' && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 rounded-lg text-xs border border-red-200 dark:border-red-900/50 text-left">
                              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                              <span>
                                {t('Late Penalty Applied')}: Rs. {parseFloat(rental.late_penalty_per_day).toLocaleString()}/{t('day')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Right Side: Cost Summary */}
                        <div className="md:border-l border-border md:pl-6 min-w-[200px] flex flex-col justify-between gap-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('Daily Price')}:</span>
                              <span className="font-medium">Rs. {parseFloat(rental.rental_price_per_day).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('Days')}:</span>
                              <span className="font-medium">{rental.rental_days}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-dashed border-border">
                              <span className="text-muted-foreground font-semibold">{t('Total Rental Amount')}:</span>
                              <span className="font-bold text-primary">Rs. {parseFloat(rental.total_rental_amount).toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="bg-muted/30 p-3 rounded-lg space-y-2 text-xs text-left">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground font-semibold">{t('Security Deposit')}:</span>
                              <span className="font-bold">Rs. {parseFloat(rental.security_deposit).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">{t('Deposit Status')}:</span>
                              <span className={`px-2 py-0.5 rounded-full font-semibold ${getDepositStatusColor(rental.deposit_status)}`}>
                                {t(rental.deposit_status.replace('_', ' ').charAt(0).toUpperCase() + rental.deposit_status.replace('_', ' ').slice(1))}
                              </span>
                            </div>
                            {parseFloat(rental.late_penalty_total) > 0 && (
                              <div className="flex justify-between text-red-600 font-semibold pt-1 border-t border-border">
                                <span>{t('Late Penalty')}:</span>
                                <span>Rs. -{parseFloat(rental.late_penalty_total).toLocaleString()}</span>
                              </div>
                            )}
                            {(rental.deposit_status === 'refunded' || rental.deposit_status === 'partial_refund') && (
                              <div className="flex justify-between text-green-600 font-semibold pt-1 border-t border-border">
                                <span>{t('Refunded Deposit')}:</span>
                                <span>Rs. {parseFloat(rental.deposit_refund_amount).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
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
            <AlertDialogCancel>{t('No, Keep Order')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleCancelOrder}
            >
              {t('Yes, Cancel My Order')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}







