import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { User, Package, MapPin, Phone, Mail, Edit, Save, X, LogOut, Loader2 } from 'lucide-react'; 
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '../../lib/AuthContext';
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

  useEffect(() => {
    if (user) {
      loadProfile();
      fetchOrders(); 
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
			  total: totalAmount,
            amountPaid: amountPaid,
            paymentMethod: order.payment_method || 'cod',
            paymentStatus: paymentStatus,
            deliveryAddress: order.shipping_address,
            type: (order.shipping_address && order.shipping_address.toLowerCase().includes('pickup')) ? 'pickup' : 'delivery',
            items: order.items ? order.items.map(item => ({
               quantity: item.quantity,
               isWeightPending: false, 
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
      toast.error('Name is required');
      return;
    }
    if (!tempProfile.phone.trim()) {
      toast.error('Phone number is required');
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
          phone: tempProfile.phone,
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
          phone: tempProfile.phone,
          address: tempProfile.address
        }));

        // 3. Update UI
        setProfile(tempProfile);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'ready': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelOrder) return;

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
        toast.error(t('Failed to cancel order'));
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
        
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-foreground mb-2">{t('My Account')}</h1>
            <p className="text-muted-foreground">{t('Manage your profile and view order history')}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            {t('Sign Out')}
          </Button>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="profile">{t('Profile')}</TabsTrigger>
            <TabsTrigger value="orders">{t('Orders')}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-foreground">{profile.name}</h2>
                    <p className="text-muted-foreground">{profile.phone}</p>
                  </div>
                </div>
                {!editMode && (
                  <Button onClick={handleEdit} variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    {t('Edit Details')}
                  </Button>
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
                              Reason: {order.cancelReason} 
                              {order.cancelledBy && ` (by ${order.cancelledBy})`}
                            </p>
                          )}                        <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-sm text-muted-foreground">{t('Total Amount')}</p>
                        <p className="text-primary font-bold">
                          Rs. {order.total.toLocaleString()}
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
                              Rs. {(item.service.price * item.quantity).toLocaleString()}
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
                              Paid: Rs. {order.amountPaid.toLocaleString()}
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


