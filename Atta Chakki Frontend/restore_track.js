const fs = require('fs');
const path = require('path');

const content = `import { useState } from 'react';
import { Search, Package, Clock, CheckCircle, XCircle, Calendar, Truck, Loader2, ChevronDown, ChevronUp, MapPin, Phone, CreditCard, User } from 'lucide-react'; 
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
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
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../config';

const STATUS_STEPS = [
  { id: 'pending', label: 'Order Received', icon: Clock },
  { id: 'processing', label: 'Processing', icon: Package },
  { id: 'ready', label: 'Ready', icon: CheckCircle },
  { id: 'out-for-delivery', label: 'Out for Delivery', icon: Truck },
  { id: 'completed', label: 'Completed', icon: CheckCircle }
];

export function TrackOrder() {
  const { t } = useTranslation();
  const [orderId, setOrderId] = useState('');
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // --- FETCH FROM API ---
  const handleSearch = async () => {
    const term = orderId.trim();
    if (!term) return;

    setLoading(true);
    setNotFound(false);
    setOrders([]);
    setExpandedOrderId(null);

    try {
      const isPhone = term.startsWith('+') || term.startsWith('0') || term.length > 7;
      const param = isPhone ? \`phone=\${encodeURIComponent(term)}\` : \`order_id=\${term}\`;
      const response = await fetch(\`\${API_BASE_URL}/track_order.php?\${param}\`);
      const data = await response.json();

      if (data.success && data.orders && data.orders.length > 0) {
        const mappedOrders = data.orders.map(o => ({
          id: o.id,
          status: o.status,
          customerName: o.customer_name,
          phone: o.customer_phone,
          deliveryAddress: o.shipping_address,
          total: o.total_amount,
          paymentMethod: o.payment_method,
          paymentStatus: o.payment_status,
          deliveryDate: o.delivery_date,
          driverName: o.driver_name,
          createdAt: o.created_at,
          cancellationReason: o.cancellation_reason,
          cancelledBy: o.cancelled_by,
          cancelledAt: o.cancelled_at,
          items: (o.items || []).map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price_at_purchase
          }))
        }));
        
        setOrders(mappedOrders);
        if (mappedOrders.length > 0) {
          setExpandedOrderId(mappedOrders[0].id);
        }
        setNotFound(false);
      } else {
        setOrders([]);
        setNotFound(true);
      }
    } catch (error) {
      console.error("Track Error:", error);
      toast.error("Network error: Could not connect to server");
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };
  
  // --- CANCEL VIA API ---
  const handleCancelOrder = async () => {
    if (!cancelOrder) return;

    setIsCancelling(true);
    try {
      const response = await fetch(\`\${API_BASE_URL}/cancel_order.php\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: cancelOrder.id,
          reason: cancelReason || 'No reason provided',
          cancelled_by: 'Customer'
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Order cancelled successfully');
        setOrders(prev => prev.map(o => o.id === cancelOrder.id ? { ...o, status: 'cancelled' } : o));
      } else {
        toast.error(result.message || 'Failed to cancel order');
      }
    } catch (error) {
      toast.error('Network error while cancelling order');
    } finally {
      setIsCancelling(false);
      setCancelOrder(null); 
      setCancelReason('');
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending': return { color: 'text-orange-600', bg: 'bg-orange-100', dot: 'bg-orange-500' };
      case 'processing': return { color: 'text-blue-600', bg: 'bg-blue-100', dot: 'bg-blue-500' };
      case 'ready': return { color: 'text-indigo-600', bg: 'bg-indigo-100', dot: 'bg-indigo-500' };
      case 'out-for-delivery': return { color: 'text-purple-600', bg: 'bg-purple-100', dot: 'bg-purple-500' };
      case 'completed': return { color: 'text-green-600', bg: 'bg-green-100', dot: 'bg-green-500' };
      case 'cancelled': return { color: 'text-red-600', bg: 'bg-red-100', dot: 'bg-red-500' };
      case 'scheduled-tomorrow': return { color: 'text-teal-600', bg: 'bg-teal-100', dot: 'bg-teal-500' };
      default: return { color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-500' };
    }
  };

  const renderTimeline = (currentStatus) => {
    if (currentStatus === 'cancelled') {
        return (
            <div className="flex items-center justify-center p-6 bg-red-50 rounded-xl border border-red-100">
                <div className="flex flex-col items-center">
                    <XCircle className="w-12 h-12 text-red-500 mb-2" />
                    <h3 className="text-xl font-bold text-red-700">Order Cancelled</h3>
                    <p className="text-red-600 text-sm mt-1 text-center">This order has been cancelled and will not be processed.</p>
                </div>
            </div>
        );
    }

    if (currentStatus === 'scheduled-tomorrow') {
        return (
            <div className="flex items-center justify-center p-6 bg-indigo-50 rounded-xl border border-indigo-100">
                <div className="flex flex-col items-center">
                    <Calendar className="w-12 h-12 text-indigo-500 mb-2" />
                    <h3 className="text-xl font-bold text-indigo-700">Scheduled for Tomorrow</h3>
                    <p className="text-indigo-600 text-sm mt-1 text-center">Your order is scheduled for processing tomorrow.</p>
                </div>
            </div>
        );
    }

    const currentStepIndex = STATUS_STEPS.findIndex(s => s.id === currentStatus);
    const activeIndex = currentStepIndex === -1 && currentStatus !== 'pending' ? STATUS_STEPS.length : currentStepIndex;

    return (
      <div className="relative pt-8 pb-4">
        <div className="absolute top-12 left-0 w-full h-1 bg-gray-200 -z-10 rounded-full"></div>
        <div 
          className="absolute top-12 left-0 h-1 bg-green-500 -z-10 rounded-full transition-all duration-500"
          style={{ width: \`\${(activeIndex / (STATUS_STEPS.length - 1)) * 100}%\` }}
        ></div>

        <div className="flex justify-between relative">
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index < activeIndex;
            const isCurrent = index === activeIndex;
            const StepIcon = step.icon;
            
            return (
              <div key={step.id} className="flex flex-col items-center w-20">
                <div className={\`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-colors duration-300 \${isCompleted ? 'bg-green-500 border-green-100 text-white' : isCurrent ? 'bg-white border-green-500 text-green-500 shadow-md' : 'bg-white border-gray-200 text-gray-400'}\`}>
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                </div>
                <div className={\`mt-3 text-xs font-semibold text-center \${isCurrent ? 'text-green-700' : isCompleted ? 'text-green-600' : 'text-gray-400'}\`}>
                  {t(step.label)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4 tracking-tight">
            {t('Track Your Order')}
          </h1>
          <p className="text-slate-600 text-lg sm:text-xl font-medium max-w-2xl mx-auto">
            {t('Enter your order ID or phone number to check the status in real-time')}
          </p>
        </div>

        <Card className="p-2 mb-10 shadow-lg border-green-100/50 rounded-2xl bg-white/60 backdrop-blur-sm max-w-2xl mx-auto">
          <div className="flex md:flex-row flex-col gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder={t('Order ID (e.g. 1042) or Phone Number')}
                value={orderId}
                onChange={(e) => {
                  setOrderId(e.target.value);
                  if (notFound) setNotFound(false);
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-12 h-14 border-0 focus-visible:ring-0 bg-transparent text-lg md:text-xl font-medium placeholder:text-gray-400"
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={loading || !orderId.trim()}
              className="h-14 px-8 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-md md:w-auto w-full text-lg"
            >
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : t('Track')}
            </Button>
          </div>
        </Card>

        {notFound && (
          <Card className="p-8 text-center bg-white shadow-sm border border-red-100 rounded-3xl max-w-2xl mx-auto animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <XCircle className="h-10 w-10 text-red-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">{t('Order Not Found')}</h3>
            <p className="text-slate-600 text-lg">
              {t('We couldn\\'t find any orders matching')} <span className="font-mono font-semibold bg-slate-100 px-2 py-1 rounded text-slate-800">{orderId}</span>
            </p>
          </Card>
        )}

        {orders.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <Package className="h-6 w-6 text-green-600" />
              {t('Found')} {orders.length} {orders.length === 1 ? t('Order') : t('Orders')}
            </h2>

            {orders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              const statusColors = getStatusInfo(order.status);
              
              return (
                <Card key={order.id} className="overflow-hidden border-0 shadow-md rounded-3xl bg-white transition-all duration-300 hover:shadow-lg">
                  {/* Header Bar - Clickable to expand/collapse */}
                  <div 
                    className="p-5 sm:p-6 cursor-pointer flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 border-b border-gray-50"
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={\`p-3 rounded-2xl \${statusColors.bg}\`}>
                        <Package className={\`h-6 w-6 \${statusColors.color}\`} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-500 mb-1">{t('Order')} #{order.id}</div>
                        <div className="text-lg font-bold text-slate-800">
                          {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 ml-auto sm:ml-0">
                      <div className={\`px-4 py-1.5 rounded-full text-sm font-bold capitalize flex items-center gap-2 \${statusColors.bg} \${statusColors.color}\`}>
                        <span className={\`w-2 h-2 rounded-full \${statusColors.dot}\`}></span>
                        {t(order.status.replace('-', ' '))}
                      </div>
                      <div className="p-2 border border-gray-100 rounded-full text-gray-400 hover:bg-gray-50">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="p-5 sm:p-8 bg-gray-50/50 animate-in slide-in-from-top-4 duration-300">
                      
                      {/* Timeline */}
                      <div className="mb-10 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hidden sm:block">
                        <h3 className="text-lg font-bold text-slate-800 mb-6">{t('Status Timeline')}</h3>
                        {renderTimeline(order.status)}
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Customer & Delivery */}
                        <div className="space-y-6">
                          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                              <User className="h-5 w-5 text-blue-500" />
                              {t('Delivery Details')}
                            </h3>
                            <div className="space-y-4">
                              <div className="flex items-start gap-3">
                                <User className="h-5 w-5 text-slate-400 mt-0.5" />
                                <div>
                                  <p className="text-sm text-slate-500">{t('Customer')}</p>
                                  <p className="font-semibold text-slate-800">{order.customerName}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <Phone className="h-5 w-5 text-slate-400 mt-0.5" />
                                <div>
                                  <p className="text-sm text-slate-500">{t('Phone')}</p>
                                  <a href={\`tel:\${order.phone}\`} className="font-semibold text-blue-600 hover:underline">{order.phone}</a>
                                </div>
                              </div>
                              {order.deliveryAddress && (
                                <div className="flex items-start gap-3">
                                  <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                                  <div>
                                    <p className="text-sm text-slate-500">{t('Address')}</p>
                                    <p className="font-medium text-slate-800">{order.deliveryAddress}</p>
                                  </div>
                                </div>
                              )}
                              {order.driverName && (
                                <div className="pt-3 border-t border-gray-100 mt-2">
                                  <p className="text-sm text-slate-500 mb-1">{t('Assigned Driver')}</p>
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                      <Truck className="h-4 w-4" />
                                    </div>
                                    <p className="font-bold text-slate-800">{order.driverName}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Order Items & Payment */}
                        <div className="space-y-6">
                          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                              <CreditCard className="h-5 w-5 text-indigo-500" />
                              {t('Order Summary')}
                            </h3>
                            
                            <div className="space-y-3 mb-4">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0">
                                  <div>
                                    <span className="font-semibold text-slate-800">{item.name}</span>
                                    <span className="text-slate-500 ml-2">x{item.quantity}</span>
                                  </div>
                                  <span className="font-bold text-slate-700">Rs. {(item.price * item.quantity).toLocaleString('en-PK')}</span>
                                </div>
                              ))}
                            </div>

                            <div className="pt-4 border-t border-dashed border-gray-200">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-slate-500">{t('Payment Method')}</span>
                                <span className="font-semibold capitalize text-slate-800">
                                  {order.paymentMethod || 'COD'}
                                  {order.paymentStatus === 'paid' && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-md">PAID</span>}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-lg">
                                <span className="font-bold text-slate-800">{t('Total Amount')}</span>
                                <span className="font-extrabold text-green-600">Rs. {order.total?.toLocaleString('en-PK')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Cancel Order Section */}
                      {order.status === 'pending' && (
                        <div className="bg-yellow-50/50 border border-yellow-200 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                           <div>
                             <h4 className="font-bold text-yellow-800 mb-1">Need to make changes?</h4>
                             <p className="text-sm text-yellow-700">You can still cancel this order because it is in pending state.</p>
                           </div>
                           <Button 
                             variant="destructive" 
                             onClick={() => setCancelOrder(order)}
                             className="w-full sm:w-auto font-bold rounded-xl"
                           >
                             Cancel Order
                           </Button>
                        </div>
                      )}

                      {/* Cancelled Details */}
                      {order.status === 'cancelled' && (
                        <div className="bg-red-50/50 border border-red-100 p-5 rounded-2xl">
                          <h4 className="font-bold text-red-800 mb-2">Cancellation Details</h4>
                          <p className="text-sm text-red-700 mb-1"><span className="font-semibold">Reason:</span> {order.cancellationReason || 'Not provided'}</p>
                          <p className="text-sm text-red-700"><span className="font-semibold">By:</span> {order.cancelledBy || 'System'}</p>
                        </div>
                      )}

                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

      </div>

      <AlertDialog open={!!cancelOrder} onOpenChange={(open) => { if(!open) { setCancelOrder(null); setCancelReason(''); } }}>
        <AlertDialogContent className="rounded-2xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2 text-red-600">
              <XCircle className="w-6 h-6" /> Cancel Order #{cancelOrder?.id}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 text-base">
              Are you sure you want to cancel this order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-semibold text-slate-700 mb-2 block">Reason for cancellation (Optional)</label>
            <Textarea
              placeholder="Tell us why you're cancelling..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="resize-none h-24 rounded-xl border-gray-200 focus:border-red-300 focus:ring-red-200"
            />
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-bold text-slate-600 m-0">Keep Order</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl m-0"
              onClick={handleCancelOrder}
              disabled={isCancelling}
            >
              {isCancelling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
`;

fs.writeFileSync(path.join(__dirname, 'src', 'components', 'customer', 'TrackOrder.jsx'), content);
console.log('Restored TrackOrder.jsx to previous version successfully.');
