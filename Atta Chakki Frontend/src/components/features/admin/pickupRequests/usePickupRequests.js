import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../../../config';
import { sendWhatsAppMessage } from '../../../../utils/whatsappHelper';
import { useCancelOrder } from '../../../../hooks/useCancelOrder';

export function usePickupRequests() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePersonnel, setActivePersonnel] = useState([]);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [weightInputs, setWeightInputs] = useState({});
  const [isSavingWeights, setIsSavingWeights] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const fetchPersonnel = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/manage_delivery.php`);
      const data = await response.json();
      if (data.success) {
        setActivePersonnel(data.personnel.filter(person => person.isActive));
      }
    } catch (error) {
      console.error('Error fetching personnel:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      const response = await fetch(`${API_BASE_URL}/get_pickup_requests.php?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setOrders(data.orders || []);
        setTotalItems(data.total || 0);
      } else {
        console.error("Failed to load pickup requests");
      }
    } catch (error) {
      console.error("Network Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const {
    cancelOrder,
    setCancelOrder,
    cancelReason,
    setCancelReason,
    isCancelling,
    handleCancelOrder,
  } = useCancelOrder({
    onSuccess: () => fetchOrders(),
    cancelledBy: 'Admin',
    requireReason: true,
  });

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    fetchPersonnel();
    fetchOrders();
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchOrders();
      }
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const handleAssignPersonnel = async (orderId, personnelName, personnelPhone = null) => {
    setOrders(prevOrders => prevOrders.map(order => (
      order.id === orderId ? { ...order, driver_name: personnelName } : order
    )));

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
            const message = `Assalam-o-Alaikum *${personnelName}*! 👋\n\nApko Suchi Chakki ki taraf se nayi Pickup Request assign hui hai:\n📦 *Pickup Request #${orderId}*\n\nBara-e-meherbani Delivery Portal check karein aur waqt par pickup mukammal karein.\nShukriya!`;
            sendWhatsAppMessage(targetPhone, message);
          }
        }
        fetchOrders();
      } else {
        toast.error('Failed to assign driver in database');
        fetchOrders();
      }
    } catch (error) {
      toast.error('Network error while assigning driver');
      fetchOrders();
    }
  };

  const handleArrivedAtShop = (order) => {
    setSelectedOrder(order);
    const inputs = {};
    (order.items || []).forEach((it) => {
      const isWeightPending = it.is_weight_pending === 1 || it.is_weight_pending === '1' || it.unit === 'trip';
      // Grain items: leave empty so admin must enter actual weight
      // Fixed products: pre-fill with known quantity
      inputs[it.id] = isWeightPending ? '' : parseFloat(it.quantity) || 0;
    });
    setWeightInputs(inputs);
    setShowWeightModal(true);
  };

  const handleWeightChange = (orderItemId, value) => {
    setWeightInputs(prev => ({ ...prev, [orderItemId]: value }));
  };

  const calcItemsSubtotal = () => {
    if (!selectedOrder?.items) return 0;
    return selectedOrder.items.reduce((sum, it) => {
      const isWeightPending = it.is_weight_pending === 1 || it.is_weight_pending === '1' || it.unit === 'trip';
      if (!isWeightPending) {
        const qty = parseFloat(it.quantity || 1);
        const price = parseFloat(it.price_at_purchase || it.price_per_kg || 0);
        return sum + (qty * price);
      }
      const kg = parseFloat(weightInputs[it.id] || 0);
      const price = parseFloat(it.price_per_kg || 0);
      return sum + (kg * price);
    }, 0);
  };

  const calcLiveTotal = () => {
    const itemsTotal = calcItemsSubtotal();
    if (itemsTotal === 0) return 0;
    const deliveryFee = parseFloat(selectedOrder?.delivery_fee || 0);
    return itemsTotal + deliveryFee;
  };

  const handleSaveWeights = async () => {
    if (!selectedOrder) return;

    // Filter only items that are weight-pending, or all items if none specifically tagged
    const pendingItems = (selectedOrder.items || []).filter(
      it => it.is_weight_pending === 1 || it.is_weight_pending === '1' || it.unit === 'trip'
    );
    const targetItems = pendingItems.length > 0 ? pendingItems : selectedOrder.items;

    const itemsPayload = targetItems.map(it => ({
      order_item_id: parseInt(it.id),
      actual_weight_kg: parseFloat(weightInputs[it.id])
    }));

    for (const it of itemsPayload) {
      if (!it.order_item_id || !it.actual_weight_kg || it.actual_weight_kg <= 0) {
        toast.error('Please enter valid weight (kg) for all grain pickup items.');
        return;
      }
    }

    setIsSavingWeights(true);
    try {
      const res = await fetch(`${API_BASE_URL}/update_pickup_weight.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: selectedOrder.id, items: itemsPayload })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`✅ Weights saved! Total Bill: Rs. ${data.new_total?.toLocaleString()}`);
        setShowWeightModal(false);
        setSelectedOrder(null);
        setWeightInputs({});
        fetchOrders();
      } else {
        toast.error(data.message || 'Failed to save weights');
      }
    } catch (err) {
      console.error('Network error saving weights', err);
      toast.error('Network error saving weights');
    } finally {
      setIsSavingWeights(false);
    }
  };

  const handleCloseWeightModal = () => {
    setShowWeightModal(false);
    setSelectedOrder(null);
    setWeightInputs({});
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
    cancelOrder,
    setCancelOrder,
    cancelReason,
    setCancelReason,
    isCancelling,
    handleCancelOrder,
    handleAssignPersonnel,
    showWeightModal,
    selectedOrder,
    weightInputs,
    isSavingWeights,
    handleArrivedAtShop,
    handleWeightChange,
    calcLiveTotal,
    handleSaveWeights,
    handleCloseWeightModal,
  };
}
