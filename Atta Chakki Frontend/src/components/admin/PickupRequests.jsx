import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import { Loader2, Truck, Trash2, Phone, MapPin, User, Package, AlertCircle } from 'lucide-react';
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
  DialogTitle as DialogTitleText,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

export function PickupRequests() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePersonnel, setActivePersonnel] = useState([]);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [weightInputs, setWeightInputs] = useState({});
  const [isSavingWeights, setIsSavingWeights] = useState(false);

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
      const response = await fetch(`${API_BASE_URL}/get_pickup_requests.php`);
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders || []);
      } else {
        console.error("Failed to load pickup requests");
      }
    } catch (error) {
      console.error("Network Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonnel();
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleAssignPersonnel = async (orderId, personnelName) => {
    setOrders(prevOrders => prevOrders.map(order => (
      order.id === orderId ? { ...order, driver_name: personnelName } : order
    )));

    try {
      const response = await fetch(`${API_BASE_URL}/assign_driver.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, driver_name: personnelName })
      });

      const result = await response.json();

      if (result.success) {
        if (personnelName === '') {
          toast.info('Driver assignment cleared.');
        } else {
          toast.success(`Assigned to ${personnelName} successfully!`);
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

  const handleCancelOrder = async () => {
    if (!cancelOrder) return;
    if (!cancelReason.trim()) {
      toast.error("Please provide a cancellation reason.");
      return;
    }

    setIsCancelling(true);
    try {
      const response = await fetch(`${API_BASE_URL}/cancel_order.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: cancelOrder.id,
          reason: cancelReason,
          cancelled_by: 'Admin'
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Order cancelled successfully');
        fetchOrders();
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

  const handleArrivedAtShop = (order) => {
    setSelectedOrder(order);
    // initialize inputs with existing quantities (if provided)
    const inputs = {};
    (order.items || []).forEach((it) => {
      // items now include 'id' from backend
      inputs[it.id] = parseFloat(it.quantity) || 0;
    });
    setWeightInputs(inputs);
    setShowWeightModal(true);
  };

  const handleWeightChange = (orderItemId, value) => {
    setWeightInputs(prev => ({ ...prev, [orderItemId]: value }));
  };

  const handleSaveWeights = async () => {
    if (!selectedOrder) return;
    const itemsPayload = Object.keys(weightInputs).map(key => ({ order_item_id: parseInt(key), actual_weight_kg: parseFloat(weightInputs[key]) }));
    // basic validation
    for (const it of itemsPayload) {
      if (!it.order_item_id || !it.actual_weight_kg || it.actual_weight_kg <= 0) {
        toast.error('Please enter valid weight for all items.');
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
        toast.success('Weights saved and order scheduled');
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

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-amber-50/50 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-amber-700 text-xs font-semibold uppercase tracking-wide mb-3">
              Pickup Services
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Pickup Requests</h1>
            <p className="text-slate-600 mt-2 max-w-2xl">
              Manage requests for services where the driver has to pick up items (Trip unit).
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2 self-start lg:self-auto">
            {orders.length} Active Requests
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Truck className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg">No active requests!</h3>
              <p className="text-muted-foreground">There are currently no pickup requests pending.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Info</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Service Details</TableHead>
                    <TableHead>Status / Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-medium text-lg">#{order.id}</div>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {new Date(order.created_at).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', month: 'short', day: 'numeric' })}
                        </Badge>
                        <div className="mt-2 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded w-max flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> TBD - Weight Update Required
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <User className="h-3 w-3 text-muted-foreground" /> {order.customer_name}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" /> {order.customer_phone}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="max-w-[200px] truncate" title={order.shipping_address}>
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /> 
                          <span className="truncate">{order.shipping_address || 'No Address Provided'}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          {order.items && order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <Package className="h-3 w-3 text-primary" />
                              <span className="font-medium">{item.name}</span>
                              <span className="text-muted-foreground text-xs">
                                ({item.quantity} {item.unit})
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Badge className={`${
                              (order.status === 'pending' || order.status === 'pickup_pending') ? 'bg-amber-100 text-amber-800' :
                              order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            } capitalize`}>
                              {order.status.replace('_', ' ')}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={`border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm font-medium ${order.driver_name ? 'bg-blue-50' : ''}`}
                                >
                                  <Truck className="h-4 w-4 mr-2" />
                                  {order.driver_name ? `${order.driver_name.slice(0, 10)}` : 'Assign Driver'}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-48">
                                <DropdownMenuLabel className="text-xs">Assign Driver</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {activePersonnel.length > 0 ? (
                                  activePersonnel.map(person => (
                                    <DropdownMenuItem
                                      key={person.id}
                                      onSelect={() => handleAssignPersonnel(order.id, person.name)}
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

                              <Button
                                variant="secondary"
                                size="sm"
                                className={`shadow-sm px-2 ${order.status !== 'arrived_at_shop' ? 'opacity-50' : 'bg-teal-100 text-teal-800 hover:bg-teal-200'}`}
                                onClick={() => handleArrivedAtShop(order)}
                                disabled={order.status !== 'arrived_at_shop'}
                                title={order.status === 'arrived_at_shop' ? "Update Weight" : "Waiting for driver to arrive at store"}
                              >
                                {order.status === 'arrived_at_shop' ? 'Update Weight' : 'Awaiting Arrival'}
                              </Button>

                              <Button
                                variant="destructive"
                                size="sm"
                                className="shadow-sm px-2"
                                onClick={() => setCancelOrder(order)}
                                title="Delete/Cancel Request"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                          </div>
                        </div>
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!cancelOrder} onOpenChange={(open) => { if(!open) { setCancelOrder(null); setCancelReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Cancel/Reject Pickup Request
            </AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for cancelling this pickup request. This is mandatory and will be saved for records and sent to the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Cancellation reason (mandatory)..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="mt-2 min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={(e) => {
                if (!cancelReason.trim()) {
                  e.preventDefault();
                  toast.error("Please provide a cancellation reason.");
                  return;
                }
                handleCancelOrder();
              }}
              disabled={isCancelling}
            >
              {isCancelling ? 'Rejecting...' : 'Reject Request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showWeightModal} onOpenChange={(open) => { if(!open) { setShowWeightModal(false); setSelectedOrder(null); setWeightInputs({}); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitleText>Update Actual Weights</DialogTitleText>
            <DialogDescription>
              Enter the actual weight (kg) for each item in this order. This will update the order totals and trigger auto-scheduling.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-3">
            {selectedOrder && selectedOrder.items && selectedOrder.items.length > 0 ? (
              selectedOrder.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-medium">{it.name || `Item #${it.product_id}`}</div>
                    <div className="text-sm text-muted-foreground">Unit: {it.unit || 'kg'}</div>
                  </div>
                  <div className="w-36">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={weightInputs[it.id] ?? ''}
                      onChange={(e) => handleWeightChange(it.id, e.target.value)}
                      className="w-full border rounded px-2 py-1"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div>No items found for this order.</div>
            )}
          </div>

          <DialogFooter>
            <div className="flex w-full gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowWeightModal(false); setSelectedOrder(null); setWeightInputs({}); }}>Cancel</Button>
              <Button onClick={handleSaveWeights} disabled={isSavingWeights}>{isSavingWeights ? 'Saving...' : 'Save & Schedule'}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
