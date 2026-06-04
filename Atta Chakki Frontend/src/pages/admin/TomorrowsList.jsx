import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/common/card';
import { Button } from '../../components/common/button';
import { Badge } from '../../components/common/badge';
import { PrintTaskList } from './PrintTaskList';
import { useTranslation } from 'react-i18next';
import { 
  FileText, Loader2, Clock, CalendarClock, Timer, Weight, Package, 
  User, Phone, MapPin, ArrowLeft, Zap, AlertTriangle, Sunrise, CheckCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '../../components/common/dropdown-menu';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/common/dialog';
import { Input } from '../../components/common/input';
import { Label } from '../../components/common/label';
import { Textarea } from '../../components/common/textarea';
import { Truck, UserPlus, Trash2, Calendar, SplitSquareHorizontal } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '../../components/common/tooltip';

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

  const [splitOrder, setSplitOrder] = useState(null);
  const [splitBatches, setSplitBatches] = useState([]);
  const [isSplitting, setIsSplitting] = useState(false);
  const [heavyThreshold, setHeavyThreshold] = useState(100);

  const processingOrders = orders.filter(order =>
    (order.items || []).some(item => {
      const unit = (item.unit || '').toLowerCase().trim();
      return unit === 'kg' || unit === 'g' || unit === 'trip';
    })
  );

  const preparedOrders = orders.filter(order =>
    !(order.items || []).some(item => {
      const unit = (item.unit || '').toLowerCase().trim();
      return unit === 'kg' || unit === 'g' || unit === 'trip';
    })
  );

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

  const loadOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_scheduled_orders.php`);
      const data = await response.json();

      if (data.success) {
        setOrders((data.orders || []).map(order => ({
          ...order,
          type: order.order_type || order.type || (order.shipping_address && !order.shipping_address.toLowerCase().includes('pickup') ? 'delivery' : 'pickup'),
          deliveryPersonnel: order.deliveryPersonnel || order.driver_name || null,
        })));
        if (data.capacity) setCapacity(data.capacity);
      }
    } catch (error) {
      console.error("Error loading scheduled orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/get_store_settings.php`);
      const data = await res.json();
      if (data.success && data.settings?.heavyOrderThreshold) {
        setHeavyThreshold(parseFloat(data.settings.heavyOrderThreshold) || 100);
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchPersonnel();
    loadOrders();
    const interval = setInterval(loadOrders, 8000);
    return () => clearInterval(interval);
  }, []);

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
          toast.success(`Assigned to ${personnelName} successfully!`);
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

  // format ETA time nicely
  const formatETA = (eta) => {
    if (!eta) return t('Pending');
    return t('Tomorrow');
  };

  // get total weight of all orders
  const getTotalWeight = () => {
    return processingOrders.reduce((sum, o) => sum + parseFloat(o.total_weight_kg || 0), 0).toFixed(1);
  };

  // get total processing time
  const getTotalProcessingTime = () => {
    return processingOrders.reduce((sum, o) => sum + parseInt(o.processing_time_minutes || 0), 0);
  };

  // prepare orders for PrintTaskList
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

  const PreparedOrderCard = ({ order }) => {
    return (
      <Card key={order.id} className="border-l-[6px] shadow-lg hover:shadow-xl transition-all border-t border-r border-b rounded-xl bg-white border-l-emerald-500">
        {/* order header */}
        <div className="p-5 pb-3 bg-emerald-50/30 rounded-t-xl">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2 flex-wrap">
                Order #{order.id}
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] px-2 py-0.5 font-bold uppercase">
                  Prepared Item
                </Badge>
              </h3>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            <div className="text-right bg-emerald-50/50 px-3 py-2 rounded-lg border border-emerald-200">
              <div className="flex flex-col items-end">
                <span className="text-lg font-bold text-slate-800">
                  Rs. {parseInt((parseFloat(order.total_amount) - parseFloat(order.coupon_discount || 0))).toLocaleString()}
                </span>
                {parseFloat(order.coupon_discount || 0) > 0 && (
                  <div className="text-xs text-emerald-600 font-medium mt-1">
                    -Rs. {parseFloat(order.coupon_discount).toLocaleString()} (Coupon: {order.coupon_code || 'N/A'})
                  </div>
                )}
                <p className="text-xs font-semibold text-emerald-600 uppercase mt-0.5">{order.payment_method}</p>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="space-y-4 pt-4">
          {/* customer info */}
          <div className="bg-muted/30 p-3 rounded-md space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{order.customer_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{order.customer_phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate">{order.shipping_address}</span>
            </div>
            {order.deliveryPersonnel && (
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-slate-700">Driver: {order.deliveryPersonnel}</span>
              </div>
            )}
          </div>

          {/* order items */}
          <div>
            <h4 className="font-semibold mb-1.5 flex items-center gap-2 text-sm">
              <Package className="h-4 w-4" /> Prepared Items to Deliver:
            </h4>
            <ul className="divide-y border rounded-md">
              {order.items.map((item, idx) => (
                <li key={idx} className="p-3 text-sm flex justify-between items-start bg-white hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-bold text-slate-800 break-words">{item.name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge variant="secondary" className="font-bold bg-slate-100 text-slate-700">x {item.quantity}</Badge>
                    {item.unit && <span className="text-[10px] font-semibold text-muted-foreground uppercase">{item.unit}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* action: move to today & buttons */}
          <div className="pt-2">
            <div className="space-y-3">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 shadow-md font-medium"
                onClick={() => moveToToday(order)}
                disabled={overriding === order.id}
              >
                {overriding === order.id ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Moving...</>
                ) : (
                  <><ArrowLeft className="h-4 w-4 mr-2" /> Move to Today's Work</>
                )}
              </Button>

              <div className="flex flex-col sm:flex-row gap-3">
                {order.type === 'delivery' ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm font-medium ${order.deliveryPersonnel ? 'bg-blue-50' : ''}`}
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        {order.deliveryPersonnel ? `${order.deliveryPersonnel.slice(0, 10)}` : 'Driver'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel className="text-xs">Assign Driver</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {activePersonnel.length > 0 ? (
                        activePersonnel.map(person => (
                          <DropdownMenuItem
                            key={person.id}
                            onSelect={() => handleAssignPersonnel(order.id, person.name, person.phone)}
                            className="cursor-pointer text-xs"
                          >
                            <span>{person.name}</span>
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled className="text-xs">No active staff</DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => handleAssignPersonnel(order.id, '')}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer text-xs"
                      >
                        Clear
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button size="sm" variant="outline" disabled className="flex-1 opacity-50 border-slate-200 text-slate-500 text-xs">
                    <Truck className="h-4 w-4 mr-2" />
                    Pickup
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1 text-xs"
                  onClick={() => setCancelOrder(order)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading && orders.length === 0) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></div>;
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sunrise className="h-7 w-7 text-orange-500" />
            Tomorrow's Work List
          </h1>
          <p className="text-muted-foreground">{orders.length} orders scheduled for tomorrow</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowPrintList(true)}
            disabled={orders.length === 0}
            className="bg-primary"
          >
            <FileText className="h-4 w-4 mr-2" />
            Print Full List
          </Button>
        </div>
      </div>

      {/* summary stats cards */}
      {orders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
            <CardContent className="py-4 text-center">
              <CalendarClock className="h-6 w-6 text-orange-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-orange-800">{orders.length}</p>
              <p className="text-xs text-orange-600 font-medium">Scheduled Orders</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="py-4 text-center">
              <Weight className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-blue-800">{getTotalWeight()} kg</p>
              <p className="text-xs text-blue-600 font-medium">Total Weight</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <CardContent className="py-4 text-center">
              <Timer className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-emerald-800">{getTotalProcessingTime()} mins</p>
              <p className="text-xs text-emerald-600 font-medium">Est. Processing Time</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* capacity bar for tomorrow */}
      {capacity && (
        <Card className="border-orange-200" style={{ background: '#ffffff' }}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-600" />
                <span className="font-semibold text-orange-900">Tomorrow's Capacity</span>
              </div>
              <div className="text-sm text-orange-700">
                <span className="font-bold">{Math.round(capacity.booked_minutes)}</span> / {Math.round(capacity.total_minutes)} mins booked
                <span className="mx-2">•</span>
                <span className="font-bold text-green-700">{Math.round(capacity.remaining_minutes)} mins</span> available
              </div>
            </div>
            <div className="w-full bg-orange-200 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  capacity.percentage_used > 90 ? 'bg-red-500' : 
                  capacity.percentage_used > 70 ? 'bg-orange-500' : 
                  'bg-orange-400'
                }`}
                style={{ width: `${Math.min(capacity.percentage_used, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-orange-600">
              <span>{capacity.opening_time} (Open)</span>
              <span className="font-semibold">{capacity.percentage_used}% pre-booked</span>
              <span>{capacity.closing_time} (Close)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* orders list */}
      {orders.length === 0 ? (
        <Card className="border-dashed" style={{ background: '#ffffff' }}>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-background p-4 mb-4">
              <CalendarClock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No orders scheduled for tomorrow</h3>
            <p className="text-muted-foreground">Orders that exceed today's capacity will appear here automatically.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* 1. Grinding & Processing Section (Tomorrow's Scheduler) */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-1">
              <div className="flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-bold shadow-sm border border-orange-200">
                <Timer className="h-4 w-4 text-orange-600" />
                Tomorrow's Grinding Queue (Kg Items)
              </div>
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-500 font-semibold">
                {processingOrders.length} grind job(s)
              </span>
            </div>

            {processingOrders.length === 0 ? (
              <Card className="bg-slate-50/50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="rounded-full bg-background p-3 mb-2 shadow-sm">
                    <CheckCircle className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm font-semibold">No grinding / processing orders scheduled for tomorrow.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {processingOrders.map((order) => {
                  const isSplitBatch = order.is_split_batch === true;
                  const isHeavy = parseFloat(order.total_weight_kg || 0) > heavyThreshold;
                  
                  return (
                  <Card key={order.id} className={`border-l-[6px] shadow-lg hover:shadow-xl transition-all rounded-xl bg-white ${
                    order.is_manually_overridden === '1' || order.is_manually_overridden === 1 
                      ? 'border-l-amber-500' 
                      : 'border-l-orange-400'
                  }`}>
                    {/* order header */}
                    <div className="p-5 pb-3 bg-orange-50/50 rounded-t-xl">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold flex items-center gap-2 flex-wrap">
                            Order #{order.id}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(order.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right bg-orange-50/80 px-3 py-2 rounded-lg border border-orange-200">
                          <div className="flex flex-col items-end">
                            <span className="text-lg font-bold text-slate-800">
                              Rs. {parseInt((parseFloat(order.total_amount) - parseFloat(order.coupon_discount || 0))).toLocaleString()}
                            </span>
                            {parseFloat(order.coupon_discount || 0) > 0 && (
                              <div className="text-xs text-emerald-600 font-medium mt-1">
                                -Rs. {parseFloat(order.coupon_discount).toLocaleString()} (Coupon: {order.coupon_code || 'N/A'})
                              </div>
                            )}
                            <p className="text-xs font-semibold text-orange-600 uppercase">{order.payment_method}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <CardContent className="space-y-4 pt-4">
                      {/* ETA & scheduling info */}
                      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 p-3 rounded-lg">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="flex items-center justify-center gap-1 text-orange-600 mb-0.5">
                              <Timer className="h-3.5 w-3.5" />
                              <span className="text-[10px] font-semibold uppercase">ETA</span>
                            </div>
                            <p className="text-base font-bold text-orange-800">{formatETA(order.estimated_completion_time)}</p>
                          </div>
                          <div className="border-x border-orange-200">
                            <div className="flex items-center justify-center gap-1 text-orange-600 mb-0.5">
                              <Weight className="h-3.5 w-3.5" />
                              <span className="text-[10px] font-semibold uppercase">Weight</span>
                            </div>
                            <p className="text-base font-bold text-orange-800">{parseFloat(order.total_weight_kg || 0).toFixed(1)} kg</p>
                          </div>
                          <div>
                            <div className="flex items-center justify-center gap-1 text-orange-600 mb-0.5">
                              <Package className="h-3.5 w-3.5" />
                              <span className="text-[10px] font-semibold uppercase">Time</span>
                            </div>
                            <p className="text-base font-bold text-orange-800">{order.processing_time_minutes || '~'} min</p>
                          </div>
                        </div>
                      </div>

                      {/* customer info */}
                      <div className="bg-muted/30 p-3 rounded-md space-y-1.5 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{order.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{order.customer_phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{order.shipping_address}</span>
                        </div>
                        {order.deliveryPersonnel && (
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-slate-700">Driver: {order.deliveryPersonnel}</span>
                          </div>
                        )}
                      </div>

                      {/* order items */}
                      <div>
                        <h4 className="font-semibold mb-1.5 flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4" /> Items to Prepare:
                        </h4>
                        <ul className="divide-y border rounded-md">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="p-3 text-sm flex justify-between items-start bg-white hover:bg-slate-50 transition-colors">
                              <div className="flex-1 min-w-0 pr-4">
                                <p className="font-bold text-slate-800 break-words">{item.name}</p>
                                {/* Dynamic customizations display */}
                                {(item.customizations?.length > 0 || item.is_cleaning || item.is_grinding) && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {item.customizations?.length > 0 ? (
                                      item.customizations.map((cust, cIdx) => (
                                        <span key={cIdx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                          ✓ {cust.option_name}
                                        </span>
                                      ))
                                    ) : (
                                      <>
                                        {item.is_cleaning == 1 && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                            ✓ Cleaning
                                          </span>
                                        )}
                                        {item.is_grinding == 1 && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                            ✓ Grinding
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                <Badge variant="secondary" className="font-bold bg-slate-100 text-slate-700">x {item.quantity}</Badge>
                                {item.unit && <span className="text-[10px] font-semibold text-muted-foreground uppercase">{item.unit}</span>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* action: move to today */}
                      <div className="pt-2">
                        <div className="space-y-3">
                          <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 shadow-md font-medium"
                            onClick={() => moveToToday(order)}
                            disabled={overriding === order.id}
                          >
                            {overriding === order.id ? (
                              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Moving...</>
                            ) : (
                              <><ArrowLeft className="h-4 w-4 mr-2" /> Move to Today's Work</>
                            )}
                          </Button>

                          <div className="flex flex-col sm:flex-row gap-3">
                            {order.type === 'delivery' ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className={`flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm font-medium ${order.deliveryPersonnel ? 'bg-blue-50' : ''}`}
                                  >
                                    <Truck className="h-4 w-4 mr-2" />
                                    {order.deliveryPersonnel ? `${order.deliveryPersonnel.slice(0, 10)}` : 'Driver'}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel className="text-xs">Assign Driver</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {activePersonnel.length > 0 ? (
                                    activePersonnel.map(person => (
                                      <DropdownMenuItem
                                        key={person.id}
                                        onSelect={() => handleAssignPersonnel(order.id, person.name, person.phone)}
                                        className="cursor-pointer text-xs"
                                      >
                                        <span>{person.name}</span>
                                      </DropdownMenuItem>
                                    ))
                                  ) : (
                                    <DropdownMenuItem disabled className="text-xs">No active staff</DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onSelect={() => handleAssignPersonnel(order.id, '')}
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer text-xs"
                                  >
                                    Clear
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span tabIndex={0} className="inline-block flex-1">
                                    <Button size="sm" variant="outline" disabled className="w-full opacity-50 border-blue-200 text-blue-700 text-xs">
                                      <Truck className="h-4 w-4 mr-2" />
                                      Pickup
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">
                                  <p>Cannot assign to pickup</p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1 text-xs"
                              onClick={() => setCancelOrder(order)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </div>

                          {/* Split Button below the flex row */}
                          {isHeavy && !isSplitBatch && (
                            <Button
                              variant="outline"
                              className="w-full border-2 border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 shadow-sm font-medium animate-pulse"
                              onClick={() => openSplitModal(order)}
                            >
                              <SplitSquareHorizontal className="h-4 w-4 mr-2" />
                              Split Order
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )})}
              </div>
            )}
          </div>

          {/* 2. Prepared & Ready to Deliver Section */}
          <div className="space-y-6 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-3 px-1">
              <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-bold shadow-sm border border-emerald-200">
                <Package className="h-4 w-4 text-emerald-600" />
                Tomorrow's Prepared Orders (Oil, Liter, Pieces, etc.)
              </div>
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-emerald-600 font-semibold">
                {preparedOrders.length} order(s)
              </span>
            </div>

            {preparedOrders.length === 0 ? (
              <Card className="bg-slate-50/50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-slate-500 text-sm font-semibold">No prepared orders scheduled for tomorrow.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {preparedOrders.map((order) => (
                  <PreparedOrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <PrintTaskList
        orders={printableOrders}
        title="Tomorrow's Work List - Scheduled Orders"
        open={showPrintList}
        onClose={() => setShowPrintList(false)}
      />

      <AlertDialog open={!!cancelOrder} onOpenChange={() => { setCancelOrder(null); setCancelReason(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order #{cancelOrder?.id}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Optional: Reason for cancellation..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleCancelOrder}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!splitOrder} onOpenChange={closeSplitModal}>
        <DialogContent
          style={{ maxHeight: '90vh', overflowY: 'auto', display: 'block' }}
          className="max-w-md p-0 custom-scrollbar gap-0"
        >
          <div className="p-6 pb-2">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <SplitSquareHorizontal className="h-5 w-5 text-blue-600" />
                Heavy Order Split — #{splitOrder?.id}
              </DialogTitle>
              <DialogDescription>
                Order weight: <strong>{parseFloat(splitOrder?.total_weight_kg || 0).toFixed(1)} kg</strong>.
                Split into multiple processing batches.
              </DialogDescription>
            </DialogHeader>

            {/* Warning Banner */}
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800 mt-4">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                <strong>Note:</strong> Bill will be available only after <strong>all batches</strong> are completed.
              </p>
            </div>
          </div>

          <div className="px-6 py-2">
            <div className="space-y-3">
              {splitBatches.map((batch, idx) => (
                <div key={batch.id} className="relative bg-slate-50 p-4 rounded-xl border border-slate-200 transition-all hover:border-blue-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Batch Details</span>
                    </div>
                    
                    {splitBatches.length > 2 && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full text-red-500 hover:bg-red-50"
                        onClick={() => setSplitBatches(splitBatches.filter(b => b.id !== batch.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                          type="date" 
                          value={batch.date}
                          className="pl-9 h-9 bg-white text-sm"
                          onChange={(e) => {
                            const newB = [...splitBatches];
                            newB[idx].date = e.target.value;
                            setSplitBatches(newB);
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Weight (kg)</Label>
                      <div className="relative">
                        <Weight className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                          type="number" 
                          min="0.1" step="0.5" 
                          value={batch.weight}
                          className="pl-9 h-9 bg-white text-sm"
                          onChange={(e) => {
                            const newB = [...splitBatches];
                            newB[idx].weight = e.target.value;
                            setSplitBatches(newB);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pb-4">
              <Button 
                variant="outline" 
                className="w-full border-dashed border-2 border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all h-10"
                onClick={() => {
                  const lastDate = new Date(splitBatches[splitBatches.length - 1].date);
                  lastDate.setDate(lastDate.getDate() + 1);
                  setSplitBatches([...splitBatches, { 
                    id: Date.now(), 
                    date: lastDate.toISOString().slice(0, 10), 
                    weight: '' 
                  }]);
                }}
              >
                <Package className="h-4 w-4 mr-2" /> Add Another Batch
              </Button>
            </div>
          </div>

          <div className="p-6 pt-4 bg-slate-50/50 border-t">
            {/* Live total check */}
            {splitOrder && (() => {
              const total = parseFloat(splitOrder.total_weight_kg || 0);
              const sum = splitBatches.reduce((acc, curr) => acc + (parseFloat(curr.weight) || 0), 0);
              const diff = Math.abs(sum - total);
              const ok = diff <= 0.5;
              return total > 0 ? (
                <div className={`text-xs font-medium rounded px-3 py-2 mb-4 ${ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                  {ok
                    ? `✅ Total: ${sum.toFixed(1)} kg — Valid!`
                    : `⚠️ Total: ${sum.toFixed(1)} kg (Expected ~${total} kg) — Mismatch`}
                </div>
              ) : null;
            })()}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={closeSplitModal} disabled={isSplitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSplitOrder}
                disabled={isSplitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSplitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Splitting...</>
                ) : (
                  <><SplitSquareHorizontal className="h-4 w-4 mr-2" /> Split Order</>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}




