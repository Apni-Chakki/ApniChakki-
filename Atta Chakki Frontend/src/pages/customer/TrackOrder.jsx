import { useState, useEffect } from 'react';
import { Search, Package, Clock, CheckCircle, XCircle, Truck, Loader2, ChevronDown, ChevronUp, MapPin, Phone, CreditCard, User, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/common/button';
import { Input } from '../../components/common/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/card';
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
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { API_BASE_URL } from '../../config';

const STATUS_STEPS = [
  { id: 'pending', label: 'Order Received', icon: Clock },
  { id: 'processing', label: 'Processing', icon: Package },
  { id: 'ready', label: 'Ready', icon: CheckCircle },
  { id: 'out-for-delivery', label: 'Out for Delivery', icon: Truck },
  { id: 'completed', label: 'Completed', icon: CheckCircle }
];

const CAROUSEL_SLIDES = [
  "https://images.unsplash.com/photo-1731082300550-8093311708ef?w=1400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1565607052745-35f8c6ba59b1?w=1400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1623066798929-946425dbe1b0?w=1400&auto=format&fit=crop&q=80",
];

const glassCard = {
  background: 'rgba(255,255,255,0.93)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.4)',
  boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
  borderRadius: '1rem',
};

const backBtnBase = {
  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
  color: 'white',
  background: 'rgba(255,255,255,0.15)',
  border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: '0.5rem',
  padding: '0.45rem 0.875rem',
  fontSize: '0.875rem', fontWeight: 500,
  cursor: 'pointer',
  backdropFilter: 'blur(6px)',
  transition: 'background 0.2s',
};

const avatarCircle = {
  margin: '0 auto 0.75rem',
  height: '3.25rem', width: '3.25rem',
  borderRadius: '50%',
  background: 'var(--primary)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
  flexShrink: 0,
};

export function TrackOrder() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [orderId, setOrderId] = useState('');
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = async () => {
    const term = orderId.trim();
    if (!term) return;
    setLoading(true);
    setNotFound(false);
    setOrders([]);
    setExpandedOrderId(null);
    try {
      const isPhone = term.startsWith('+') || term.startsWith('0') || term.length > 7;
      const param = isPhone ? `phone=${encodeURIComponent(term)}` : `order_id=${term}`;
      const response = await fetch(`${API_BASE_URL}/track_order.php?${param}&user_id=${user.id}`);
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
        if (mappedOrders.length > 0) setExpandedOrderId(mappedOrders[0].id);
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

  const handleCancelOrder = async () => {
    if (!cancelOrder) return;
    setIsCancelling(true);
    try {
      const response = await fetch(`${API_BASE_URL}/cancel_order.php`, {
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
    } catch {
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
      case 'completed': return { color: 'text-primary', bg: 'bg-primary/10', dot: 'bg-primary' };
      case 'cancelled': return { color: 'text-red-600', bg: 'bg-red-100', dot: 'bg-red-500' };
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
    const currentStepIndex = STATUS_STEPS.findIndex(s => s.id === currentStatus);
    const activeIndex = currentStepIndex === -1 && currentStatus !== 'pending' ? STATUS_STEPS.length : currentStepIndex;
    return (
      <div className="relative pt-8 pb-4">
        <div className="absolute top-12 left-0 w-full h-1 bg-gray-200 rounded-full" style={{ zIndex: 0 }}></div>
        <div
          className="absolute top-12 left-0 h-1 bg-primary rounded-full transition-all duration-500"
          style={{ width: `${(activeIndex / (STATUS_STEPS.length - 1)) * 100}%`, zIndex: 0 }}
        ></div>
        <div className="flex justify-between relative" style={{ zIndex: 1 }}>
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index < activeIndex;
            const isCurrent = index === activeIndex;
            const StepIcon = step.icon;
            return (
              <div key={step.id} className="flex flex-col items-center w-20">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-colors duration-300 ${isCompleted ? 'bg-primary border-primary/20 text-white' : isCurrent ? 'bg-white border-primary text-primary shadow-md' : 'bg-white border-gray-200 text-gray-400'}`}>
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                </div>
                <div className={`mt-3 text-xs font-semibold text-center ${isCurrent ? 'text-primary/90' : isCompleted ? 'text-primary' : 'text-gray-400'}`}>
                  {t(step.label)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const BackButton = () => (
    <div style={{ padding: '0.875rem 1rem' }}>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <button
          style={backBtnBase}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
        >
          <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
          {t('Back to Home')}
        </button>
      </Link>
    </div>
  );

  /* ── NOT LOGGED IN ── */
  if (!user) {
    return (
      <section style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {CAROUSEL_SLIDES.map((slide, i) => (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${slide})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: i === currentSlide ? 1 : 0,
            transition: 'opacity 1.5s ease-in-out',
          }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.42) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
          <BackButton />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem 4rem', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '100%', maxWidth: '420px' }}>
            <Card style={glassCard}>
              <CardHeader className="space-y-1 text-center" style={{ paddingBottom: '0.75rem' }}>
                <div style={avatarCircle}>
                  <User style={{ width: '1.6rem', height: '1.6rem', color: 'white' }} />
                </div>
                <CardTitle className="text-2xl">{t('Login Required')}</CardTitle>
                <CardDescription>{t('You must be logged in to track your specific orders.')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/customer-login">
                  <Button className="w-full">{t('Sign In to Track Order')}</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    );
  }

  /* ── LOGGED IN ── */
  return (
    <>
      {/* ── Hero section: carousel bg + search ── */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Absolute background carousel */}
        {CAROUSEL_SLIDES.map((slide, i) => (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${slide})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: i === currentSlide ? 1 : 0,
            transition: 'opacity 1.5s ease-in-out',
          }} />
        ))}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.42) 100%)',
        }} />

        {/* Back button */}
        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
          <BackButton />
        </div>

        {/* Centered: avatar + title + search */}
        <div style={{
          position: 'relative', zIndex: 1,
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '3rem 1rem 4rem', textAlign: 'center',
        }}>
          <div style={avatarCircle}>
            <Search style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} />
          </div>
          <h1 style={{
            color: 'white',
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            fontWeight: 800,
            marginBottom: '0.5rem',
            textShadow: '0 2px 8px rgba(0,0,0,0.35)',
            letterSpacing: '-0.02em',
          }}>
            {t('Track Your Order')}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '1.05rem', maxWidth: '480px', margin: '0 auto 1.75rem' }}>
            {t('Enter your order ID or phone number to check the status in real-time')}
          </p>

          {/* Search card */}
          <div style={{ width: '100%', maxWidth: '560px' }}>
            <Card style={glassCard}>
              <div style={{ padding: '0.625rem' }}>
                <div className="flex md:flex-row flex-col gap-3">
                  <div className="relative flex-1">
                    <Search style={{
                      position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                      color: 'var(--muted-foreground)', width: '1rem', height: '1rem', pointerEvents: 'none',
                    }} />
                    <Input
                      placeholder={t('Order ID (e.g. 1042) or Phone Number')}
                      value={orderId}
                      onChange={(e) => { setOrderId(e.target.value); if (notFound) setNotFound(false); }}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="focus-visible:ring-0 border-0"
                      style={{ paddingLeft: '2.5rem', height: '2.875rem', background: 'transparent', fontSize: '0.95rem', fontWeight: 500 }}
                    />
                  </div>
                  <Button
                    onClick={handleSearch}
                    disabled={loading || !orderId.trim()}
                    className="font-bold rounded-lg"
                    style={{ height: '2.875rem', paddingLeft: '1.75rem', paddingRight: '1.75rem', flexShrink: 0 }}
                  >
                    {loading ? <Loader2 style={{ width: '1.1rem', height: '1.1rem' }} className="animate-spin" /> : t('Track')}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Not found — shown inline in hero */}
          {notFound && (
            <div style={{ width: '100%', maxWidth: '460px', marginTop: '1.5rem' }}>
              <Card style={glassCard}>
                <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <div style={{
                    width: '3.5rem', height: '3.5rem',
                    background: 'rgba(239,68,68,0.12)', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 0.75rem',
                  }}>
                    <XCircle style={{ width: '1.75rem', height: '1.75rem', color: '#ef4444' }} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.375rem' }}>{t('Order Not Found')}</h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                    {t("We couldn't find any orders matching")}{' '}
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, background: '#f1f5f9', padding: '0.1rem 0.45rem', borderRadius: '0.25rem', color: '#1e293b' }}>
                      {orderId}
                    </span>
                  </p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* ── Results section: plain background, only renders when needed ── */}
      {orders.length > 0 && (
        <div className="py-8 px-4 sm:px-6 bg-slate-50">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-slate-800">
                {t('Found')} {orders.length} {orders.length === 1 ? t('Order') : t('Orders')}
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {orders.map((order) => {
                const isExpanded = expandedOrderId === order.id;
                const statusColors = getStatusInfo(order.status);

                return (
                  <Card key={order.id} className="overflow-hidden shadow-md border-0 rounded-2xl bg-white hover:shadow-lg transition-shadow">
                    {/* Order header — clickable */}
                    <div
                      onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      style={{
                        padding: '1.125rem 1.375rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        borderBottom: isExpanded ? '1px solid #f1f5f9' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <div className={`p-2.5 rounded-xl ${statusColors.bg}`}>
                          <Package className={`h-5 w-5 ${statusColors.color}`} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.2rem' }}>
                            {t('Order')} #{order.id}
                          </div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
                            {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold capitalize flex items-center gap-1.5 ${statusColors.bg} ${statusColors.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`}></span>
                          {t(order.status.replace('-', ' '))}
                        </div>
                        <div style={{ padding: '0.375rem', border: '1px solid #e2e8f0', borderRadius: '50%', color: '#94a3b8', display: 'flex' }}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="p-5 sm:p-7 bg-gray-50/40 animate-in slide-in-from-top-4 duration-300">

                        {/* Timeline */}
                        <div className="mb-8 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hidden sm:block">
                          <h3 className="text-base font-bold text-slate-800 mb-5">{t('Status Timeline')}</h3>
                          {renderTimeline(order.status)}
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                          {/* Delivery details */}
                          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                              <User className="h-4 w-4 text-blue-500" />
                              {t('Delivery Details')}
                            </h3>
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <User className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-xs text-slate-500">{t('Customer')}</p>
                                  <p className="text-sm font-semibold text-slate-800">{order.customerName}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <Phone className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-xs text-slate-500">{t('Phone')}</p>
                                  <a href={`tel:${order.phone}`} className="text-sm font-semibold text-blue-600 hover:underline">{order.phone}</a>
                                </div>
                              </div>
                              {order.deliveryAddress && (
                                <div className="flex items-start gap-3">
                                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs text-slate-500">{t('Address')}</p>
                                    <p className="text-sm font-medium text-slate-800">{order.deliveryAddress}</p>
                                  </div>
                                </div>
                              )}
                              {order.driverName && (
                                <div className="pt-3 border-t border-gray-100">
                                  <p className="text-xs text-slate-500 mb-1.5">{t('Assigned Driver')}</p>
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                      <Truck className="h-3.5 w-3.5" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-800">{order.driverName}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Order summary */}
                          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-indigo-500" />
                              {t('Order Summary')}
                            </h3>
                            <div className="space-y-2 mb-3">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-50 last:border-0">
                                  <div>
                                    <span className="font-semibold text-slate-800">{item.name}</span>
                                    <span className="text-slate-400 ml-1.5 text-xs">×{item.quantity}</span>
                                  </div>
                                  <span className="font-bold text-slate-700 text-xs">Rs. {(item.price * item.quantity).toLocaleString('en-PK')}</span>
                                </div>
                              ))}
                            </div>
                            <div className="pt-3 border-t border-dashed border-gray-200">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-slate-500">{t('Payment Method')}</span>
                                <span className="text-xs font-semibold capitalize text-slate-800">
                                  {order.paymentMethod || 'COD'}
                                  {order.paymentStatus === 'paid' && <span className="ml-1.5 text-xs bg-primary/10 text-primary/90 px-1.5 py-0.5 rounded">PAID</span>}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-slate-800">{t('Total Amount')}</span>
                                <span className="text-base font-extrabold text-primary">Rs. {order.total?.toLocaleString('en-PK')}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Cancel section */}
                        {order.status === 'pending' && (
                          <div className="bg-yellow-50/70 border border-yellow-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                              <h4 className="font-bold text-yellow-800 mb-0.5 text-sm">Need to make changes?</h4>
                              <p className="text-xs text-yellow-700">You can still cancel this order because it is in pending state.</p>
                            </div>
                            <Button
                              variant="destructive"
                              onClick={() => setCancelOrder(order)}
                              className="w-full sm:w-auto font-bold rounded-xl text-sm"
                            >
                              Cancel Order
                            </Button>
                          </div>
                        )}

                        {/* Cancelled details */}
                        {order.status === 'cancelled' && (
                          <div className="bg-red-50/70 border border-red-100 p-4 rounded-2xl">
                            <h4 className="font-bold text-red-800 mb-1.5 text-sm">Cancellation Details</h4>
                            <p className="text-xs text-red-700 mb-1"><span className="font-semibold">Reason:</span> {order.cancellationReason || 'Not provided'}</p>
                            <p className="text-xs text-red-700"><span className="font-semibold">By:</span> {order.cancelledBy || 'System'}</p>
                          </div>
                        )}

                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Cancel dialog */}
      <AlertDialog open={!!cancelOrder} onOpenChange={(open) => { if (!open) { setCancelOrder(null); setCancelReason(''); } }}>
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
    </>
  );
}





