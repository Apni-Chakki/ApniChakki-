import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrdersTable } from './OrdersTable';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Truck, UserPlus, Loader2, CalendarClock, Trash2, SplitSquareHorizontal } from 'lucide-react'; 
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "../ui/tooltip";

export function NewOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePersonnel, setActivePersonnel] = useState([]);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Split Order State
  const [splitOrderModal, setSplitOrderModal] = useState(null);
  const [todayWeight, setTodayWeight] = useState('');
  const [tomorrowWeight, setTomorrowWeight] = useState('');
  const [isSplitting, setIsSplitting] = useState(false);
  // ─── Heavy Order Split ───────────────────────────────────────────────────────
  const [splitOrder, setSplitOrder] = useState(null);      // order being split
  const [splitBatches, setSplitBatches] = useState([]);
  const [isSplitting, setIsSplitting] = useState(false);
  const [heavyThreshold, setHeavyThreshold] = useState(100); // default, fetched from settings
  // ────────────────────────────────────────────────────────────────────────────

  const navigate = useNavigate();

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
      console.error("Error fetching personnel:", error);
    }
  }, []);

  // Load pending orders
  const loadOrders = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin_orders.php?status=pending`);
      const data = await response.json();

      if (data.success) {
        const mappedOrders = data.orders.map(order => ({
          ...order,
          id: order.id,
          customerName: order.customer_name,
          phone: order.customer_phone,
          total: parseFloat(order.total_amount),
          createdAt: order.created_at,
          paymentMethod: order.payment_method,
          type: order.shipping_address && order.shipping_address.toLowerCase().includes('pickup') ? 'pickup' : 'delivery',
          deliveryAddress: order.shipping_address,
          deliveryPersonnel: order.driver_name,
          weightKg: parseFloat(order.total_weight_kg || 0),
        }));
        setOrders(mappedOrders);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchPersonnel();
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
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
        toast.error("Failed to update status");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

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
        toast.error(result.message || "Failed to move order");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const handleAssignPersonnel = async (orderId, personnelName, personnelPhone = null) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, deliveryPersonnel: personnelName } : o));
    try {
      const response = await fetch(`${API_BASE_URL}/assign_driver.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, driver_name: personnelName, driver_phone: personnelPhone })
      });
      const result = await response.json();
      if (result.success) {
        if (personnelName === '') {
          toast.info("Driver assignment cleared.");
        } else {
          toast.success(`Assigned to ${personnelName} successfully!`);
        }
      } else {
        toast.error("Failed to assign driver in database");
        loadOrders();
      }
    } catch (error) {
      toast.error("Network error while assigning driver");
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

  // --- 6. SPLIT LARGE ORDER ---
  const handleSplitOrder = async () => {
    if (!splitOrderModal) return;
    
    const tWeight = parseFloat(todayWeight);
    const tmWeight = parseFloat(tomorrowWeight);

    if (isNaN(tWeight) || isNaN(tmWeight) || tWeight <= 0 || tmWeight <= 0) {
      toast.error("Please enter valid weights for today and tomorrow.");
      return;
  // ─── Open Split Modal ─────────────────────────────────────────────────────
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

  // ─── Execute Split ────────────────────────────────────────────────────────
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
      const response = await fetch(`${API_BASE_URL}/split_large_order.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: splitOrderModal.id,
          today_weight: tWeight,
          tomorrow_weight: tmWeight
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        loadOrders();
        setSplitOrderModal(null);
        setTodayWeight('');
        setTomorrowWeight('');
      } else {
        toast.error(result.message || 'Failed to split order');
      }
    } catch (error) {
      toast.error('Network error while splitting order');
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
  // ─────────────────────────────────────────────────────────────────────────

  if (loading && orders.length === 0) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></div>;
  }

  return (
    <TooltipProvider>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">New Orders</h1>
            <p className="text-sm text-muted-foreground">{orders.length} pending</p>
          </div>
          {heavyThreshold && (
            <Badge variant="outline" className="text-xs text-purple-700 border-purple-300 bg-purple-50">
              <Weight className="h-3 w-3 mr-1" />
              Heavy Order Limit: {heavyThreshold} kg
            </Badge>
          )}
        </div>

        <OrdersTable
          orders={orders}
          actions={(order) => {
            const totalOrderWeight = order.items ? order.items.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0) : 0;

            return (
            <div className="flex items-center gap-1 flex-wrap">
              {totalOrderWeight >= 100 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-purple-200 text-purple-700 hover:bg-purple-50 text-xs h-8"
                  onClick={() => {
                    setSplitOrderModal(order);
                    const half = totalOrderWeight / 2;
                    setTodayWeight(half.toString());
                    setTomorrowWeight(half.toString());
                  }}
                >
                  <SplitSquareHorizontal className="h-3 w-3 mr-1" />
                  Split ({totalOrderWeight}kg)
                </Button>
              )}

              {order.type === 'delivery' ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className={`text-xs h-8 ${order.deliveryPersonnel ? "border-blue-500 text-blue-600 bg-blue-50 hover:bg-blue-100" : ""}`}
                    >
                      <Truck className="h-3 w-3 mr-1" />
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
                      <>
                        <DropdownMenuItem disabled className="text-xs">No active staff</DropdownMenuItem>
                        <DropdownMenuItem 
                          onSelect={() => navigate('/admin/delivery')}
                          className="text-primary cursor-pointer font-medium text-xs"
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Add Staff
                        </DropdownMenuItem>
                      </>
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
                    <span tabIndex={0} className="inline-block"> 
                      <Button size="sm" variant="outline" disabled className="opacity-50 text-xs h-8">
            const isHeavy = parseFloat(order.total_weight_kg || 0) > heavyThreshold;

            return (
              <div className="flex items-center gap-1 flex-wrap">

                {/* ── Heavy Order Warning + Split Button ── */}
                {isHeavy && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-purple-400 text-purple-700 bg-purple-50 hover:bg-purple-100 text-xs h-8 font-semibold animate-pulse"
                        onClick={() => openSplitModal(order)}
                      >
                        <SplitSquareHorizontal className="h-3 w-3 mr-1" />
                        Split Order
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs max-w-[200px]">
                      <p>⚠️ Heavy Order ({parseFloat(order.total_weight_kg || 0).toFixed(1)}kg &gt; {heavyThreshold}kg)</p>
                      <p>Can be split into Today + Tomorrow batches</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Driver Assignment */}
                {order.type === 'delivery' ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`text-xs h-8 ${order.deliveryPersonnel ? "border-blue-500 text-blue-600 bg-blue-50 hover:bg-blue-100" : ""}`}
                      >
                        <Truck className="h-3 w-3 mr-1" />
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
                        <>
                          <DropdownMenuItem disabled className="text-xs">No active staff</DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => navigate('/admin/delivery')}
                            className="text-primary cursor-pointer font-medium text-xs"
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            Add Staff
                          </DropdownMenuItem>
                        </>
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
                      <span tabIndex={0} className="inline-block">
                        <Button size="sm" variant="outline" disabled className="opacity-50 text-xs h-8">
                          <Truck className="h-3 w-3 mr-1" />
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
                  variant="outline"
                  className="border-orange-200 text-orange-600 hover:bg-orange-50 text-xs h-8"
                  onClick={() => overrideOrderSchedule(order.id, 'tomorrow')}
                >
                  <CalendarClock className="h-3 w-3 mr-1" />
                  Tomorrow
                </Button>

              <Button
                size="sm"
                variant="destructive"
                className="text-xs h-8 px-4"
                onClick={() => setCancelOrder(order)}
              >
                <Trash2 className="h-3 w-3 mr-1 text-white" />
                Cancel
              </Button>
            </div>
          )}}
        />

        {/* ─── Cancel Order Dialog ─────────────────────────────────────── */}
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

        {/* Split Order Modal */}
        <AlertDialog open={!!splitOrderModal} onOpenChange={(open) => {
          if (!open) {
            setSplitOrderModal(null);
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Split Large Order #{splitOrderModal?.id}</AlertDialogTitle>
              <AlertDialogDescription>
                This order has a total weight of {splitOrderModal?.items ? splitOrderModal.items.reduce((s, i) => s + parseFloat(i.quantity || 0), 0) : 0} kg. 
                You can split it to manage part of it today and the rest tomorrow.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="todayWeight">Weight for Today (kg)</Label>
                <Input
                  id="todayWeight"
                  type="number"
                  value={todayWeight}
                  onChange={(e) => {
                    setTodayWeight(e.target.value);
                    const total = splitOrderModal?.items ? splitOrderModal.items.reduce((s, i) => s + parseFloat(i.quantity || 0), 0) : 0;
                    const val = parseFloat(e.target.value) || 0;
                    if (val <= total) {
                      setTomorrowWeight((total - val).toString());
                    }
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tomorrowWeight">Weight for Tomorrow (kg)</Label>
                <Input
                  id="tomorrowWeight"
                  type="number"
                  value={tomorrowWeight}
                  onChange={(e) => setTomorrowWeight(e.target.value)}
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                onClick={handleSplitOrder}
                disabled={isSplitting}
              >
                {isSplitting ? 'Splitting...' : 'Split Order'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* ─── Split Order Modal ───────────────────────────────────────── */}
        <Dialog open={!!splitOrder} onOpenChange={closeSplitModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <SplitSquareHorizontal className="h-5 w-5" />
                Heavy Order Split — #{splitOrder?.id}
              </DialogTitle>
              <DialogDescription>
                This order is <strong>{parseFloat(splitOrder?.total_weight_kg || 0).toFixed(1)} kg</strong> — exceeding the limit ({heavyThreshold} kg).
                Split it into <em>Today</em> and <em>Tomorrow</em> batches.
              </DialogDescription>
            </DialogHeader>

            {/* Warning Banner */}
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                After splitting, <strong>Bill and Mark as Ready</strong> will only be available when
                <strong> all batches are complete</strong>.
              </p>
            </div>

            <div className="space-y-3 mt-4 max-h-[350px] overflow-y-auto pr-2">
              {splitBatches.map((batch, idx) => (
                <div key={batch.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-md border border-slate-200">
                  <div className="font-semibold text-slate-500 w-6">{idx + 1}.</div>
                  <div className="flex-1">
                    <Label className="text-xs mb-1 block text-slate-600">Date</Label>
                    <Input 
                      type="date" 
                      value={batch.date}
                      onChange={(e) => {
                        const newB = [...splitBatches];
                        newB[idx].date = e.target.value;
                        setSplitBatches(newB);
                      }}
                    />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs mb-1 block text-slate-600">Weight (kg)</Label>
                    <Input 
                      type="number" 
                      min="0.1" step="0.5" 
                      value={batch.weight}
                      onChange={(e) => {
                        const newB = [...splitBatches];
                        newB[idx].weight = e.target.value;
                        setSplitBatches(newB);
                      }}
                    />
                  </div>
                  <div className="pt-5">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                      disabled={splitBatches.length <= 2}
                      onClick={() => {
                        if (splitBatches.length > 2) {
                          setSplitBatches(splitBatches.filter(b => b.id !== batch.id));
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 text-right">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
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
                + Add Batch
              </Button>
            </div>

            {/* Live total check */}
            {splitOrder && (() => {
              const total = parseFloat(splitOrder.total_weight_kg || splitOrder.weightKg || 0);
              const sum = splitBatches.reduce((acc, curr) => acc + (parseFloat(curr.weight) || 0), 0);
              const diff = Math.abs(sum - total);
              const ok = diff <= 0.5;
              return total > 0 ? (
                <div className={`text-xs font-medium rounded px-3 py-2 mt-4 ${ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                  {ok
                    ? `✅ Total: ${sum.toFixed(1)} kg — Valid!`
                    : `⚠️ Total: ${sum.toFixed(1)} kg (Expected ~${total} kg) — Mismatch`}
                </div>
              ) : null;
            })()}

            <DialogFooter className="gap-2">
              <Button onClick={closeSplitModal} disabled={isSplitting} className="hover:opacity-90">
                Cancel
              </Button>
              <Button
                onClick={handleSplitOrder}
                disabled={isSplitting}
                className="hover:opacity-90"
              >
                {isSplitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Splitting...</>
                ) : (
                  <><SplitSquareHorizontal className="h-4 w-4 mr-2" /> Split Order</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </TooltipProvider>
  );
}