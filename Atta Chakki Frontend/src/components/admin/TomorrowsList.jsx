import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { PrintTaskList } from './PrintTaskList';
import { 
  FileText, Loader2, Clock, CalendarClock, Timer, Weight, Package, 
  User, Phone, MapPin, ArrowLeft, Zap, AlertTriangle, Sunrise 
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
import { Textarea } from '../ui/textarea';
import { Truck, UserPlus, Trash2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '../ui/tooltip';

export function TomorrowsList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPrintList, setShowPrintList] = useState(false);
  const [overriding, setOverriding] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [activePersonnel, setActivePersonnel] = useState([]);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

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
          type: order.type || (order.shipping_address && !order.shipping_address.toLowerCase().includes('pickup') ? 'delivery' : 'pickup'),
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

  useEffect(() => {
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

  // format ETA time nicely
  const formatETA = (eta) => {
    if (!eta) return 'Pending';
    const date = new Date(eta);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // get total weight of all orders
  const getTotalWeight = () => {
    return orders.reduce((sum, o) => sum + parseFloat(o.total_weight_kg || 0), 0).toFixed(1);
  };

  // get total processing time
  const getTotalProcessingTime = () => {
    return orders.reduce((sum, o) => sum + parseInt(o.processing_time_minutes || 0), 0);
  };

  // prepare orders for PrintTaskList
  const printableOrders = orders.map(order => ({
    ...order,
    id: order.id,
    customerName: order.customer_name,
    phone: order.customer_phone,
    total: parseFloat(order.total_amount),
    createdAt: order.created_at,
    paymentMethod: order.payment_method,
    type: (order.shipping_address && order.shipping_address.toLowerCase().includes('pickup')) ? 'pickup' : 'delivery',
    deliveryAddress: order.shipping_address,
    deliveryPersonnel: null
  }));

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
        <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
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
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-background p-4 mb-4">
              <CalendarClock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No orders scheduled for tomorrow</h3>
            <p className="text-muted-foreground">Orders that exceed today's capacity will appear here automatically.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {orders.map((order) => (
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
                    <span className="text-lg font-bold text-slate-800">Rs. {parseInt(order.total_amount).toLocaleString()}</span>
                    <p className="text-xs font-semibold text-orange-600 uppercase">{order.payment_method}</p>
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
                </div>

                {/* order items */}
                <div>
                  <h4 className="font-semibold mb-1.5 flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4" /> Items:
                  </h4>
                  <ul className="divide-y border rounded-md">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="p-2 text-sm flex justify-between items-center bg-white">
                        <span>{item.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">x {item.quantity}</Badge>
                          {item.unit && <span className="text-xs text-muted-foreground">{item.unit}</span>}
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
    </div>
    </TooltipProvider>
  );
}