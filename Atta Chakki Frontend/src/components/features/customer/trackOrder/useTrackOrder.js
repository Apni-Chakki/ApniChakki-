import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../../../../store/AuthContext';
import { API_BASE_URL } from '../../../../config';
import { useCancelOrder } from '../../../../hooks/useCancelOrder';
import { CAROUSEL_SLIDES } from './trackOrderConstants';

export function useTrackOrder() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  const [orderId, setOrderId] = useState(() => (location.state?.orderId ? String(location.state.orderId) : ''));
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const {
    cancelOrder,
    setCancelOrder,
    cancelReason,
    setCancelReason,
    isCancelling,
    handleCancelOrder,
  } = useCancelOrder({
    onSuccess: (cancelledItem) => {
      setOrders(prev => prev.map(o => o.id === cancelledItem.id ? { ...o, status: 'cancelled' } : o));
    },
    cancelledBy: 'Customer',
    enforceDateGuard: true,
    t,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = useCallback(async (termOverride) => {
    const term = (termOverride ?? orderId).trim();
    if (!term || !user) return;

    setLoading(true);
    setNotFound(false);
    setOrders([]);
    setExpandedOrderId(null);

    try {
      const isPhone = term.startsWith('+') || term.startsWith('0') || term.length > 7;
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${API_BASE_URL}/track_order.php?${param}&user_id=${user.id}`, {
        headers
      });
      const data = await response.json();

      if (data.success && data.orders && data.orders.length > 0) {
        const mappedOrders = data.orders.map(o => ({
          id: o.id,
          status: o.status,
          customerName: o.customer_name,
          phone: o.customer_phone,
          deliveryAddress: o.shipping_address,
          total: o.total_amount,
          couponDiscount: o.coupon_discount,
          paymentMethod: o.payment_method,
          paymentStatus: (o.payment_status === 'paid' || (['completed', 'delivered'].includes(String(o.status).toLowerCase()) && ['cod', 'cash'].includes(String(o.payment_method || 'cod').toLowerCase()))) ? 'paid' : (o.payment_status || 'pending'),
          deliveryDate: o.delivery_date,
          driverName: o.driver_name,
          createdAt: o.created_at,
          cancellationReason: o.cancellation_reason,
          cancelledBy: o.cancelled_by,
          cancelledAt: o.cancelled_at,
          items: (o.items || []).map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price_at_purchase,
          })),
        }));
        setOrders(mappedOrders);
        if (mappedOrders.length > 0) setExpandedOrderId(mappedOrders[0].id);
        setNotFound(false);
      } else {
        setOrders([]);
        setNotFound(true);
      }
    } catch (error) {
      console.error('Track Error:', error);
      toast.error('Network error: Could not connect to server');
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [orderId, user]);

  const autoSearchedRef = useRef(false);
  useEffect(() => {
    const incomingOrderId = location.state?.orderId;
    if (incomingOrderId && user && !autoSearchedRef.current) {
      autoSearchedRef.current = true;
      handleSearch(String(incomingOrderId));
    }
  }, [user, location.state?.orderId, handleSearch]);

  return {
    user,
    t,
    orderId,
    setOrderId,
    orders,
    setOrders,
    expandedOrderId,
    setExpandedOrderId,
    notFound,
    setNotFound,
    loading,
    currentSlide,
    handleSearch,
    cancelOrder,
    setCancelOrder,
    cancelReason,
    setCancelReason,
    isCancelling,
    handleCancelOrder,
  };
}
