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
      inputs[it.id] = parseFloat(it.quantity) || 0;
    });
    setWeightInputs(inputs);
    setShowWeightModal(true);
  };

  const handleWeightChange = (orderItemId, value) => {
    setWeightInputs(prev => ({ ...prev, [orderItemId]: value }));
  };

  const calcLiveTotal = () => {
    if (!selectedOrder?.items) return 0;
    return selectedOrder.items.reduce((sum, it) => {
      const kg = parseFloat(weightInputs[it.id] || 0);
      const price = parseFloat(it.price_per_kg || 0);
      return sum + (kg * price);
    }, 0);
  };

  const handleSaveWeights = async () => {
    if (!selectedOrder) return;

    const itemsPayload = Object.keys(weightInputs).map(key => ({
      order_item_id: parseInt(key),
      actual_weight_kg: parseFloat(weightInputs[key])
    }));

    for (const it of itemsPayload) {
      if (!it.order_item_id || !it.actual_weight_kg || it.actual_weight_kg <= 0) {
        toast.error('Please enter valid weight (kg) for all items.');
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
