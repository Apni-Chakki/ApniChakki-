import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../../../config';
import { deductFromInventory } from '../../../../utils/inventoryUtils';
import { sendWhatsAppMessage } from '../../../../utils/whatsappHelper';
import { matchesOrderSearch } from './orderSearch';

export function useTodaysWorkData() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overriding, setOverriding] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [activePersonnel, setActivePersonnel] = useState([]);
  const [heavyThreshold, setHeavyThreshold] = useState(15);
  const [storeName, setStoreName] = useState('Suchi Chakki');
  const [searchQuery, setSearchQuery] = useState('');

  const sortByFIFO = useCallback((list) => {
    return [...list].sort((a, b) => {
      const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
      const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return (parseInt(a.id, 10) || 0) - (parseInt(b.id, 10) || 0);
    });
  }, []);

  const fetchPersonnel = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/manage_delivery.php`);
      const data = await response.json();
      if (data.success) {
        setActivePersonnel(data.personnel.filter(person => person.isActive));
      }
    } catch (error) {
      console.error('Error fetching personnel:', error);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/get_store_settings.php`);
      const data = await res.json();
      if (data.success) {
        if (data.settings?.heavyOrderThreshold) {
          setHeavyThreshold(parseFloat(data.settings.heavyOrderThreshold) || 15);
        }
        if (data.settings?.organizationName || data.settings?.storeName) {
          setStoreName(data.settings.organizationName || data.settings.storeName);
        }
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_processing_orders.php`);
      const data = await response.json();

      if (data.success) {
        const mappedOrders = (data.orders || []).map(order => ({
          ...order,
          type: (order.order_type === 'pickup' || (order.shipping_address && (
            order.shipping_address.toLowerCase().includes('pickup') || 
            order.shipping_address.toLowerCase().includes('store') || 
            order.shipping_address.toLowerCase().includes('collect') || 
            order.shipping_address.toLowerCase().includes('self') || 
            order.shipping_address.toLowerCase().includes('shop')
          ))) ? 'pickup' : 'delivery',
          deliveryPersonnel: order.deliveryPersonnel || order.driver_name || null,
        }));
        setOrders(sortByFIFO(mappedOrders));
        if (data.capacity) setCapacity(data.capacity);
      } else {
        console.error('Failed to load orders');
      }
    } catch (error) {
      console.error('Network Error:', error);
    } finally {
      setLoading(false);
    }
  }, [sortByFIFO]);

  useEffect(() => {
    fetchSettings();
    fetchPersonnel();
    fetchOrders();
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchOrders();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchSettings, fetchPersonnel, fetchOrders]);

  const processingOrders = useMemo(() => {
    return sortByFIFO(orders.filter(order =>
      (order.items || []).some(item => {
        const unit = (item.unit || '').toLowerCase().trim();
        return unit === 'kg' || unit === 'g' || unit === 'trip';
      })
    ));
  }, [orders, sortByFIFO]);

  const preparedOrders = useMemo(() => {
    return sortByFIFO(orders.filter(order =>
      !(order.items || []).some(item => {
        const unit = (item.unit || '').toLowerCase().trim();
        return unit === 'kg' || unit === 'g' || unit === 'trip';
      })
    ));
  }, [orders, sortByFIFO]);

  const carriedForwardOrders = useMemo(() => {
    return sortByFIFO(processingOrders.filter(o => o.is_carried_forward));
  }, [processingOrders, sortByFIFO]);

  const todayNewOrders = useMemo(() => {
    return sortByFIFO(processingOrders.filter(o => !o.is_carried_forward));
  }, [processingOrders, sortByFIFO]);

  const visibleCarriedForward = useMemo(() => {
    return carriedForwardOrders.filter(o => matchesOrderSearch(o, searchQuery));
  }, [carriedForwardOrders, searchQuery]);

  const visibleTodayNew = useMemo(() => {
    return todayNewOrders.filter(o => matchesOrderSearch(o, searchQuery));
  }, [todayNewOrders, searchQuery]);

  const visiblePrepared = useMemo(() => {
    return preparedOrders.filter(o => matchesOrderSearch(o, searchQuery));
  }, [preparedOrders, searchQuery]);

  const visibleGrindCount = visibleCarriedForward.length + visibleTodayNew.length;
  const visibleTotalCount = visibleGrindCount + visiblePrepared.length;

  const totalWeight = useMemo(() => {
    return processingOrders.reduce((sum, order) => sum + parseFloat(order.total_weight_kg || 0), 0);
  }, [processingOrders]);

  const totalProcessingMinutes = useMemo(() => {
    return processingOrders.reduce((sum, order) => sum + parseInt(order.processing_time_minutes || 0), 0);
  }, [processingOrders]);

  const activeDrivers = activePersonnel.length;

  const handleAssignPersonnel = async (orderId, personnelName, personnelPhone = null) => {
    setOrders(prevOrders => prevOrders.map(order => (
      order.id === orderId ? { ...order, deliveryPersonnel: personnelName } : order
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
          const orderObj = orders.find(o => o.id === orderId);
          const isPickup = orderObj && (orderObj.type === 'pickup' || orderObj.order_type === 'pickup');

          if (isPickup) {
            toast.success(`Assigned to ${personnelName} successfully!`);
            let targetPhone = personnelPhone;
            if (!targetPhone) {
              const found = activePersonnel.find(p => p.name === personnelName);
              if (found && found.phone) targetPhone = found.phone;
            }
            if (targetPhone) {
              const message = `Assalam-o-Alaikum *${personnelName}*! 👋\n\nApko Suchi Chakki ki taraf se nayi Pickup Request assign hui hai:\n📦 *Pickup Request #${orderId}*\n\nBara-e-meherbani Delivery Portal check karein aur waqt par mukammal karein.\nShukriya!`;
              sendWhatsAppMessage(targetPhone, message);
            }
          } else {
            toast.success(`Driver ${personnelName} pre-assigned! Will be dispatched to portal once Ready.`);
          }
        }
      } else {
        toast.error('Failed to assign driver in database');
        fetchOrders();
      }
    } catch (error) {
      toast.error('Network error while assigning driver');
      fetchOrders();
    }
  };

  const handleMovePickupToAdmin = async (order) => {
    try {
      const driver = activePersonnel[0] || { name: 'Admin', phone: '' };
      const res = await fetch(`${API_BASE_URL}/driver_notify.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, driver_name: driver.name, driver_phone: driver.phone, message: 'Arrived at shop' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Moved to admin for weight update');
        fetchOrders();
      } else {
        toast.error(data.message || 'Failed to move pickup');
      }
    } catch (err) {
      console.error('Network error moving pickup to admin', err);
      toast.error('Network error');
    }
  };

  const handleGenerateTrackingLink = async (order) => {
    try {
      const res = await fetch(`${API_BASE_URL}/generate_tracking_link.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, driver_name: order.driver_name || '', driver_phone: order.driver_phone || '', base_url: window.location.origin })
      });
      const data = await res.json();
      if (data.success && data.tracking_url) {
        await navigator.clipboard.writeText(data.tracking_url);
        toast.success('Tracking link copied to clipboard');
      } else {
        toast.error(data.message || 'Failed to generate tracking link');
      }
    } catch (err) {
      console.error('Failed to generate tracking link', err);
      toast.error('Network error');
    }
  };

  const moveToTomorrow = async (order) => {
    setOverriding(order.id);
    try {
      const response = await fetch(`${API_BASE_URL}/override_order_schedule.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, target_date: 'tomorrow' })
      });
      const data = await response.json();

      if (data.success) {
        toast.success(`Order #${order.id} moved to Tomorrow's List`);
        if (data.today_capacity) setCapacity(data.today_capacity);
        fetchOrders();
      } else {
        toast.error(data.message || 'Failed to move order');
      }
    } catch (error) {
      toast.error('Network error updating order status');
    } finally {
      setOverriding(null);
    }
  };

  const markBatchProcessed = async (order) => {
    try {
      const response = await fetch(`${API_BASE_URL}/update_order_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, status: 'batch_ready' })
      });
      const data = await response.json();
      if (data.success) {
        const invResult = await deductFromInventory(order);
        if (invResult.success) {
          toast.success(`Batch #${order.id} Processed! Inventory updated.`);
        } else {
          toast.warning(`Batch Processed, but inventory issue: ${invResult.message}`);
        }
        fetchOrders();
      } else {
        toast.error(data.message || 'Failed to update batch status');
      }
    } catch (error) {
      toast.error('Network error updating batch status');
    }
  };

  return {
    orders,
    setOrders,
    loading,
    capacity,
    setCapacity,
    activePersonnel,
    heavyThreshold,
    storeName,
    searchQuery,
    setSearchQuery,
    overriding,
    fetchOrders,
    processingOrders,
    preparedOrders,
    carriedForwardOrders,
    todayNewOrders,
    visibleCarriedForward,
    visibleTodayNew,
    visiblePrepared,
    visibleGrindCount,
    visibleTotalCount,
    totalWeight,
    totalProcessingMinutes,
    activeDrivers,
    sortByFIFO,
    handleAssignPersonnel,
    handleMovePickupToAdmin,
    handleGenerateTrackingLink,
    moveToTomorrow,
    markBatchProcessed,
  };
}
