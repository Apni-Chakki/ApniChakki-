import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../../../config';
import { sendWhatsAppMessage } from '../../../../utils/whatsappHelper';
import { useCancelOrder } from '../../../../hooks/useCancelOrder';

export function useNewOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePersonnel, setActivePersonnel] = useState([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Heavy Order Split
  const [splitOrder, setSplitOrder] = useState(null);
  const [splitBatches, setSplitBatches] = useState([]);
  const [isSplitting, setIsSplitting] = useState(false);
  const [heavyThreshold, setHeavyThreshold] = useState(100);

  // Fetch heavy order threshold from store settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/get_store_settings.php`);
      const data = await res.json();
      if (data.success && data.settings?.heavyOrderThreshold) {
        setHeavyThreshold(parseFloat(data.settings.heavyOrderThreshold) || 100);
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
    }
  }, []);

  // Fetch active delivery personnel
  const fetchPersonnel = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/manage_delivery.php`);
      const data = await response.json();
      if (data.success) {
        setActivePersonnel(data.personnel.filter(p => p.isActive));
      }
    } catch (error) {
      console.error('Error fetching personnel:', error);
    }
  }, []);

  // Load pending orders
  const loadOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status: 'pending', page: String(page), limit: String(pageSize) });
      const response = await fetch(`${API_BASE_URL}/admin_orders.php?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setTotalItems(data.total || 0);
        const mappedOrders = data.orders.map(order => ({
          ...order,
          id: order.id,
          customerName: order.customer_name,
          phone: order.customer_phone,
          total: parseFloat(order.total_amount),
          createdAt: order.created_at,
          paymentMethod: order.payment_method,
          type: (order.order_type === 'pickup' || (order.shipping_address && (
            order.shipping_address.toLowerCase().includes('pickup') || 
            order.shipping_address.toLowerCase().includes('store') || 
            order.shipping_address.toLowerCase().includes('collect') || 
            order.shipping_address.toLowerCase().includes('self') || 
            order.shipping_address.toLowerCase().includes('shop')
          ))) ? 'pickup' : 'delivery',
          deliveryAddress: order.shipping_address,
          deliveryPersonnel: order.driver_name,
          weightKg: parseFloat(order.total_weight_kg || 0),
        }));
        setOrders(mappedOrders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  // Hook for order cancellation
  const {
    cancelOrder,
    setCancelOrder,
    cancelReason,
    setCancelReason,
    isCancelling,
    handleCancelOrder,
  } = useCancelOrder({ onSuccess: loadOrders, cancelledBy: 'Admin' });

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    fetchSettings();
    fetchPersonnel();
    loadOrders();
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadOrders();
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [fetchSettings, fetchPersonnel, loadOrders]);

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/update_order_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status: newStatus })
      });
      const result = await response.json();
      if (result.success) {
        toast.success(`Order moved to ${newStatus === 'scheduled-tomorrow' ? "Tomorrow's List" : newStatus}`);
        loadOrders();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  // Override order schedule
  const overrideOrderSchedule = async (orderId, targetDate) => {
    try {
      const response = await fetch(`${API_BASE_URL}/override_order_schedule.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, target_date: targetDate })
      });
      const result = await response.json();
      if (result.success) {
        toast.success(`Order moved to ${targetDate === 'tomorrow' ? "Tomorrow's List" : "Today's Work"}`);
        loadOrders();
      } else {
        toast.error(result.message || 'Failed to move order');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  // Assign delivery driver
  const handleAssignPersonnel = async (orderId, personnelName, personnelPhone = null) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, deliveryPersonnel: personnelName } : o));
    try {
      const response = await fetch(`${API_BASE_URL}/assign_driver.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, driver_name: personnelName, driver_phone: personnelPhone })
      });
      const result = await response.json();
      if (result.success) {
        if (personnelName === '') {
          toast.info('Driver assignment cleared.');
        } else {
          toast.success(`Assigned to ${personnelName} successfully!`);
          let targetPhone = personnelPhone;
          if (!targetPhone) {
            const found = activePersonnel.find(p => p.name === personnelName);
            if (found && found.phone) targetPhone = found.phone;
          }
          if (targetPhone) {
            const message = `Assalam-o-Alaikum *${personnelName}*! 👋\n\nApko Suchi Chakki ki taraf se naya Order assign hua hai:\n📦 *Order #${orderId}*\n\nBara-e-meherbani Delivery Portal check karein aur waqt par mukammal karein.\nShukriya!`;
            sendWhatsAppMessage(targetPhone, message);
          }
        }
      } else {
        toast.error('Failed to assign driver in database');
        loadOrders();
      }
    } catch (error) {
      toast.error('Network error while assigning driver');
      loadOrders();
    }
  };

  // Open Split Modal
  const openSplitModal = (order) => {
    const totalKg = parseFloat(order.total_weight_kg || order.weightKg || 0);
    const suggested = totalKg > 0 ? Math.floor(totalKg / 2) : '';
    
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    setSplitBatches([
      { id: Date.now() + 1, date: today.toISOString().slice(0, 10), weight: suggested.toString() },
      { id: Date.now() + 2, date: tomorrow.toISOString().slice(0, 10), weight: totalKg > 0 ? (totalKg - suggested).toString() : '' }
    ]);
    setSplitOrder(order);
  };

  const closeSplitModal = () => {
    setSplitOrder(null);
    setSplitBatches([]);
  };

  // Execute Split
  const handleSplitOrder = async () => {
    if (!splitOrder) return;

    const totalKg = parseFloat(splitOrder.total_weight_kg || splitOrder.weightKg || 0);
    let sum = 0;
    const validBatches = [];

    for (let i = 0; i < splitBatches.length; i++) {
      const b = splitBatches[i];
      const w = parseFloat(b.weight);
      if (isNaN(w) || w <= 0) {
        toast.error(`Batch ${i + 1} weight must be > 0`);
        return;
      }
      if (!b.date) {
        toast.error(`Batch ${i + 1} date is missing`);
        return;
      }
      sum += w;
      validBatches.push({ weight: w, date: b.date });
    }

    if (totalKg > 0) {
      const diff = Math.abs(sum - totalKg);
      if (diff > 0.5) {
        toast.error(`Batches sum (${sum.toFixed(1)}kg) does not match total ${totalKg}kg.`);
        return;
      }
    }

    setIsSplitting(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('admin_token') || '';
      const response = await fetch(`${API_BASE_URL}/split_order_batch.php`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          order_id: splitOrder.id,
          batches: validBatches
        })
      });
      const result = await response.json();

      if (result.success) {
        toast.success(`✅ Order #${splitOrder.id} split successfully!`);
        closeSplitModal();
        loadOrders();
      } else {
        toast.error(result.message || 'Failed to split order');
      }
    } catch (error) {
      toast.error('Network error — could not split order');
    } finally {
      setIsSplitting(false);
    }
  };

  return {
    orders,
    loading,
    activePersonnel,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    heavyThreshold,
    loadOrders,
    updateOrderStatus,
    overrideOrderSchedule,
    handleAssignPersonnel,
    splitOrder,
    splitBatches,
    setSplitBatches,
    isSplitting,
    openSplitModal,
    closeSplitModal,
    handleSplitOrder,
    cancelOrder,
    setCancelOrder,
    cancelReason,
    setCancelReason,
    isCancelling,
    handleCancelOrder,
  };
}
