import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/common/card';
import { Button } from '../../components/common/button';
import { PrintTaskList } from './PrintTaskList';
import { useTranslation } from 'react-i18next';
import { FileText, Loader2, Sunrise } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import { TooltipProvider } from '../../components/common/tooltip';

import { TomorrowPreparedCard } from '../../components/features/admin/tomorrowsList/TomorrowPreparedCard';
import { TomorrowProcessingCard } from '../../components/features/admin/tomorrowsList/TomorrowProcessingCard';
import { TomorrowsHeaderStats } from '../../components/features/admin/tomorrowsList/TomorrowsHeaderStats';
import { SplitOrderModal } from '../../components/features/admin/todaysWork/SplitOrderModal';
import { CancelOrderModal } from '../../components/features/admin/todaysWork/CancelOrderModal';

export function TomorrowsList() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPrintList, setShowPrintList] = useState(false);
  const [overriding, setOverriding] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [activePersonnel, setActivePersonnel] = useState([]);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Split Order states
  const [splitOrder, setSplitOrder] = useState(null);
  const [splitBatches, setSplitBatches] = useState([]);
  const [isSplitting, setIsSplitting] = useState(false);

  useEffect(() => {
    loadOrders();
    loadCapacity();
    loadActivePersonnel();
    const interval = setInterval(() => {
      loadOrders();
      loadCapacity();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadCapacity = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_schedule_capacity.php`);
      const data = await response.json();
      if (data.success) {
        setCapacity(data.tomorrow || data.data);
      }
    } catch (error) {
      console.error("Failed to load tomorrow capacity:", error);
    }
  };

  const loadActivePersonnel = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/manage_delivery.php`);
      const data = await response.json();
      if (data.success && Array.isArray(data.personnel)) {
        setActivePersonnel(data.personnel.filter(p => p.isActive));
      }
    } catch (error) {
      console.error("Failed to load active personnel:", error);
    }
  };

  const loadOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_scheduled_orders.php`);
      const data = await response.json();
      if (data.success) {
        const sorted = (data.orders || []).map(order => ({
          ...order,
          type: (order.order_type === 'pickup' || (order.shipping_address && (
            order.shipping_address.toLowerCase().includes('pickup') || 
            order.shipping_address.toLowerCase().includes('store') || 
            order.shipping_address.toLowerCase().includes('shop') || 
            order.shipping_address.toLowerCase().includes('self') || 
            order.shipping_address.toLowerCase().includes('collect')
          ))) ? 'pickup' : 'delivery',
          deliveryPersonnel: order.deliveryPersonnel || order.driver_name || null,
        })).sort((a, b) => {
          if (a.is_split_batch && !b.is_split_batch) return -1;
          if (!a.is_split_batch && b.is_split_batch) return 1;
          const aMins = parseInt(a.processing_time_minutes || 0);
          const bMins = parseInt(b.processing_time_minutes || 0);
          return bMins - aMins;
        });
        setOrders(sorted);
      } else {
        toast.error(data.message || 'Failed to load tomorrow\'s orders');
      }
    } catch (error) {
      toast.error('Network error loading tomorrow\'s orders');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPersonnel = async (orderId, personnelName, personnelPhone = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/assign_driver.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          driver_name: personnelName, driver_phone: personnelPhone
        })
      });

      const result = await response.json();

      if (result.success) {
        setOrders(prev => prev.map(o => {
          if (o.id === orderId) {
            return {
              ...o,
              deliveryPersonnel: personnelName || null,
              
              driver_name: personnelName || null,
              driver_phone: personnelPhone || null
            };
          }
          return o;
        }));

        toast.success(
          personnelName
            ? `Driver '${personnelName}' assigned successfully!`
            : 'Driver unassigned.'
        );

        if (personnelName && personnelPhone) {
          const targetOrder = orders.find(o => o.id === orderId);
          if (targetOrder) {
            let formattedPhone = personnelPhone.replace(/\D/g, '');
            if (formattedPhone.startsWith('0')) {
              formattedPhone = '92' + formattedPhone.substring(1);
            } else if (!formattedPhone.startsWith('92')) {
              formattedPhone = '92' + formattedPhone;
            }

            const itemsSummary = (targetOrder.items || [])
              .map(i => `• ${i.product_name} x${i.quantity}`)
              .join('\n');

            const message = encodeURIComponent(
              `🛵 *NEW DELIVERY ASSIGNED (Tomorrow)* 🛵\n\n` +
              `Assalam-o-Alaikum ${personnelName}! You have been assigned an order for tomorrow.\n\n` +
              `📦 *Order ID:* #${targetOrder.id}\n` +
              `👤 *Customer:* ${targetOrder.customer_name}\n` +
              `📞 *Phone:* ${targetOrder.customer_phone}\n` +
              `📍 *Address:* ${targetOrder.shipping_address}\n\n` +
              `💰 *Total Amount:* Rs. ${parseInt(targetOrder.total_amount).toLocaleString()}\n` +
              `💳 *Payment Method:* ${targetOrder.payment_method}\n\n` +
              `*Items:*\n${itemsSummary}\n\n` +
              `Please check your Delivery Portal for live directions tomorrow. Thank you!`
            );

            const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;
            window.open(whatsappUrl, '_blank');
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
          cancelled_by: 'Admin'
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Order cancelled successfully');
        loadOrders();
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

  // override: move order to today's processing queue
  const moveToToday = async (order) => {
    setOverriding(order.id);
    try {
      const response = await fetch(`${API_BASE_URL}/override_order_schedule.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, target_date: 'today' })
      });
      const data = await response.json();

      if (data.success) {
        toast.success(`Order #${order.id} moved to Today's Work!`);
        if (data.tomorrow_capacity) setCapacity(data.tomorrow_capacity);
        loadOrders();
      } else {
        toast.error(data.message || 'Failed to move order');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setOverriding(null);
    }
  };

  const openSplitModal = (order) => {
    const totalKg = parseFloat(order.total_weight_kg || 0);
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

  const handleSplitOrder = async () => {
    if (!splitOrder) return;
    const totalKg = parseFloat(splitOrder.total_weight_kg || 0);

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
      const response = await fetch(`${API_BASE_URL}/split_order_batch.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        toast.error(result.message || "Failed to split order");
      }
    } catch (error) {
      toast.error("Network error — could not split order");
    } finally {
      setIsSplitting(false);
    }
  };

  const formatETA = (eta) => {
    if (!eta) return t('Pending');
    return t('Tomorrow');
  };

  const processingOrders = orders.filter(order =>
    (order.items || []).some(item => {
      const unit = (item.unit || '').toLowerCase().trim();
      return unit === 'kg' || unit === 'g' || unit === 'trip' || item.is_cleaning == 1 || item.is_grinding == 1;
    })
  );
  const preparedOrders = orders.filter(order =>
    !(order.items || []).some(item => {
      const unit = (item.unit || '').toLowerCase().trim();
      return unit === 'kg' || unit === 'g' || unit === 'trip' || item.is_cleaning == 1 || item.is_grinding == 1;
    })
  );

  const getTotalWeight = () => {
    return processingOrders.reduce((sum, o) => sum + parseFloat(o.total_weight_kg || 0), 0).toFixed(1);
  };

  const getTotalProcessingTime = () => {
    return processingOrders.reduce((sum, o) => sum + parseInt(o.processing_time_minutes || 0), 0);
  };

  const printableOrders = orders.map(order => ({
    ...order,
    id: order.id,
    customerName: order.customer_name,
    phone: order.customer_phone,
    total: parseFloat(order.total_amount) - parseFloat(order.coupon_discount || 0),
    couponCode: order.coupon_code || null,
    couponDiscount: parseFloat(order.coupon_discount || 0),
    createdAt: order.created_at,
    paymentMethod: order.payment_method,
    type: order.type,
    deliveryAddress: order.shipping_address,
    deliveryPersonnel: null
  }));

  if (loading && orders.length === 0) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4 sm:space-y-6">
        {/* header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Sunrise className="h-5 w-5 sm:h-7 sm:w-7 text-orange-500 shrink-0" />
              <span className="truncate">{t("Tomorrow's Work List")}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {orders.length} {t('orders scheduled for tomorrow')}
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setShowPrintList(true)}
              disabled={orders.length === 0}
              className="bg-primary w-full sm:w-auto"
            >
              <FileText className="h-4 w-4 mr-2" />
              {t('Print Full List')}
            </Button>
          </div>
        </div>

        {/* summary stats cards & capacity */}
        <TomorrowsHeaderStats
          ordersCount={orders.length}
          totalWeight={getTotalWeight()}
          totalProcessingTime={getTotalProcessingTime()}
          capacity={capacity}
          t={t}
        />

        {/* orders list */}
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Sunrise className="h-12 w-12 mx-auto mb-3 opacity-30 text-orange-400" />
              <p className="text-base font-medium">{t('No orders scheduled for tomorrow yet.')}</p>
              <p className="text-xs mt-1 text-muted-foreground">{t('New orders placed after daily capacity is full will automatically appear here.')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* 1. Processing Orders */}
            {processingOrders.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                  Fresh Processing Items ({processingOrders.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {processingOrders.map(order => (
                    <TomorrowProcessingCard
                      key={order.id}
                      order={order}
                      overriding={overriding}
                      moveToToday={moveToToday}
                      openSplitModal={openSplitModal}
                      activePersonnel={activePersonnel}
                      handleAssignPersonnel={handleAssignPersonnel}
                      setCancelOrder={setCancelOrder}
                      formatETA={formatETA}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 2. Prepared Orders */}
            {preparedOrders.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                  Prepared / Ready-Made Items ({preparedOrders.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {preparedOrders.map(order => (
                    <TomorrowPreparedCard
                      key={order.id}
                      order={order}
                      overriding={overriding}
                      moveToToday={moveToToday}
                      activePersonnel={activePersonnel}
                      handleAssignPersonnel={handleAssignPersonnel}
                      setCancelOrder={setCancelOrder}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Print list modal */}
        {showPrintList && (
          <PrintTaskList
            orders={printableOrders}
            open={showPrintList}
            title="TOMORROW'S TASK LIST"
            onClose={() => setShowPrintList(false)}
          />
        )}

        {/* Split Order Modal */}
        <SplitOrderModal
          splitOrder={splitOrder}
          closeSplitModal={closeSplitModal}
          splitBatches={splitBatches}
          setSplitBatches={setSplitBatches}
          handleSplitOrder={handleSplitOrder}
          isSplitting={isSplitting}
          t={t}
        />

        {/* Cancel Order Modal */}
        <CancelOrderModal
          cancelOrder={cancelOrder}
          setCancelOrder={setCancelOrder}
          cancelReason={cancelReason}
          setCancelReason={setCancelReason}
          handleCancelOrder={handleCancelOrder}
          isCancelling={isCancelling}
          t={t}
        />
      </div>
    </TooltipProvider>
  );
}

export default TomorrowsList;
