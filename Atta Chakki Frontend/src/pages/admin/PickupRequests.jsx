import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/card';
import { Button } from '../../components/common/button';
import { Badge } from '../../components/common/badge';
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
} from '../../components/common/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle as DialogTitleText,
  DialogDescription,
  DialogFooter,
} from '../../components/common/dialog';
import { Textarea } from '../../components/common/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/common/table';

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

    const itemsPayload = Object.keys(weightInputs).map(key => ({
      order_item_id: parseInt(key),
      actual_weight_kg: parseFloat(weightInputs[key])
    }));

    // validation
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

  // Live total calculator for modal preview
  const calcLiveTotal = () => {
    if (!selectedOrder?.items) return 0;
    return selectedOrder.items.reduce((sum, it) => {
      const kg = parseFloat(weightInputs[it.id] || 0);
      const price = parseFloat(it.price_per_kg || 0);
      return sum + (kg * price);
    }, 0);
  };

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-100 p-4 sm:p-6 shadow-sm" style={{ background: '#ffffff' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-amber-700 text-xs font-semibold uppercase tracking-wide mb-3">
              Pickup Services
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Pickup Requests</h1>
            <p className="text-slate-500 mt-1 text-xs sm:text-sm">
              Manage requests for services where the driver has to pick up items (Trip unit).
            </p>
          </div>
          <Badge variant="secondary" className="text-sm sm:text-base font-bold px-3 sm:px-4 py-1.5 sm:py-2 self-start sm:self-auto">
            {orders.length} Active Requests
          </Badge>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden" style={{ background: '#ffffff' }}>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <Truck className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-lg text-gray-800">No active requests</h3>
            <p className="text-gray-400 text-sm mt-1">There are currently no pickup requests pending.</p>
          </div>
        </div>
      ) : (
        <>
        {/* Mobile card view (below md) */}
        <div className="md:hidden space-y-3">
          {orders.map((order) => {
            const statusBg = (order.status === 'pending' || order.status === 'pickup_pending') ? '#FEF3C7' : order.status === 'arrived_at_shop' ? '#CCFBF1' : order.status === 'processing' ? '#DBEAFE' : '#DCFCE7';
            const statusColor = (order.status === 'pending' || order.status === 'pickup_pending') ? '#92400E' : order.status === 'arrived_at_shop' ? '#0F766E' : order.status === 'processing' ? '#1E40AF' : '#166534';
            return (
              <div key={order.id} className="rounded-xl border border-gray-100 shadow-sm p-4 space-y-3" style={{ background: '#ffffff' }}>
                {/* Top: Order ID + date + status */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-gray-100">
                  <div className="min-w-0">
                    <div className="font-bold text-base text-gray-900">#{order.id}</div>
                    <div className="mt-0.5 text-[11px] text-gray-500">
                      {new Date(order.created_at).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.02em', backgroundColor: statusBg, color: statusColor, whiteSpace: 'nowrap' }}>
                    {order.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </div>

                {/* TBD badge */}
                <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
                  <AlertCircle className="h-3 w-3" /> TBD – Weight Pending
                </div>

                {/* Customer */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="break-words">{order.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="break-all">{order.customer_phone}</span>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <span className="leading-snug break-words">{order.shipping_address || 'No address'}</span>
                </div>

                {/* Items */}
                <div className="space-y-1 pt-2 border-t border-gray-100">
                  {order.items && order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Package className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium text-gray-800 break-words">{item.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">({item.quantity} {item.unit})</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: '1.5px solid #BFDBFE', backgroundColor: order.driver_name ? '#EFF6FF' : '#ffffff', color: '#1D4ED8', cursor: 'pointer', width: '100%' }}>
                        <Truck style={{ width: 13, height: 13 }} />
                        {order.driver_name ? order.driver_name : 'Assign Driver'}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuLabel className="text-xs">Assign Driver</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {activePersonnel.length > 0 ? (
                        activePersonnel.map(person => (
                          <DropdownMenuItem key={person.id} onSelect={() => handleAssignPersonnel(order.id, person.name, person.phone)} className="cursor-pointer text-xs">
                            {person.name}
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled className="text-xs">No active staff</DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => handleAssignPersonnel(order.id, '')} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer text-xs">
                        Clear
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleArrivedAtShop(order)}
                      disabled={order.status !== 'arrived_at_shop'}
                      style={{
                        flex: 1,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                        padding: '8px 11px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                        border: order.status === 'arrived_at_shop' ? '1.5px solid #99F6E4' : '1.5px solid #E5E7EB',
                        backgroundColor: order.status === 'arrived_at_shop' ? '#F0FDFA' : '#F9FAFB',
                        color: order.status === 'arrived_at_shop' ? '#0F766E' : '#9CA3AF',
                        cursor: order.status === 'arrived_at_shop' ? 'pointer' : 'not-allowed',
                        opacity: order.status === 'arrived_at_shop' ? 1 : 0.7
                      }}
                    >
                      {order.status === 'arrived_at_shop' ? 'Update Weight' : 'Awaiting Arrival'}
                    </button>

                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-9 w-9 px-0 flex items-center justify-center shrink-0"
                      onClick={() => setCancelOrder(order)}
                    >
                      <Trash2 className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table (md and up) */}
        <div className="hidden md:block rounded-xl border border-gray-100 shadow-sm overflow-hidden" style={{ background: '#ffffff' }}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-4">Order Info</TableHead>
                  <TableHead className="px-6 py-4">Customer</TableHead>
                  <TableHead className="px-6 py-4">Address</TableHead>
                  <TableHead className="px-6 py-4">Service Details</TableHead>
                  <TableHead className="px-6 py-4">Status / Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-gray-50/60 transition-colors">
                    <TableCell className="px-6 py-5">
                      <div className="font-bold text-base text-gray-900">#{order.id}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
                        <AlertCircle className="h-3 w-3" /> TBD – Weight Pending
                      </div>
                    </TableCell>

                    <TableCell className="px-6 py-5">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          <User className="h-3.5 w-3.5 text-gray-400" /> {order.customer_name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Phone className="h-3.5 w-3.5" /> {order.customer_phone}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-6 py-5 max-w-[220px]">
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-snug">{order.shipping_address || 'No address'}</span>
                      </div>
                    </TableCell>

                    <TableCell className="px-6 py-5">
                      <div className="space-y-1.5">
                        {order.items && order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <Package className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-medium text-gray-800">{item.name}</span>
                            <span className="text-xs text-gray-400">({item.quantity} {item.unit})</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell className="px-6 py-5">
                      <div className="flex flex-col gap-3 min-w-[180px]">

                        {/* Status Badge */}
                        <span style={{ display: 'inline-flex', width: 'fit-content', alignItems: 'center', padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.02em',
                          backgroundColor: (order.status === 'pending' || order.status === 'pickup_pending') ? '#FEF3C7' : order.status === 'arrived_at_shop' ? '#CCFBF1' : order.status === 'processing' ? '#DBEAFE' : '#DCFCE7',
                          color: (order.status === 'pending' || order.status === 'pickup_pending') ? '#92400E' : order.status === 'arrived_at_shop' ? '#0F766E' : order.status === 'processing' ? '#1E40AF' : '#166534'
                        }}>
                          {order.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>

                        {/* Assign Driver */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: '1.5px solid #BFDBFE', backgroundColor: order.driver_name ? '#EFF6FF' : '#ffffff', color: '#1D4ED8', cursor: 'pointer', transition: 'background 0.15s' }}>
                              <Truck style={{ width: 13, height: 13 }} />
                              {order.driver_name ? order.driver_name.slice(0, 12) : 'Assign Driver'}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuLabel className="text-xs">Assign Driver</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {activePersonnel.length > 0 ? (
                              activePersonnel.map(person => (
                                <DropdownMenuItem key={person.id} onSelect={() => handleAssignPersonnel(order.id, person.name, person.phone)} className="cursor-pointer text-xs">
                                  {person.name}
                                </DropdownMenuItem>
                              ))
                            ) : (
                              <DropdownMenuItem disabled className="text-xs">No active staff</DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => handleAssignPersonnel(order.id, '')} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer text-xs">
                              Clear
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Awaiting Arrival / Update Weight + Delete row */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleArrivedAtShop(order)}
                            disabled={order.status !== 'arrived_at_shop'}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              padding: '5px 11px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                              border: order.status === 'arrived_at_shop' ? '1.5px solid #99F6E4' : '1.5px solid #E5E7EB',
                              backgroundColor: order.status === 'arrived_at_shop' ? '#F0FDFA' : '#F9FAFB',
                              color: order.status === 'arrived_at_shop' ? '#0F766E' : '#9CA3AF',
                              cursor: order.status === 'arrived_at_shop' ? 'pointer' : 'not-allowed',
                              opacity: order.status === 'arrived_at_shop' ? 1 : 0.7
                            }}
                          >
                            {order.status === 'arrived_at_shop' ? 'Update Weight' : 'Awaiting Arrival'}
                          </button>

                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 px-0 flex items-center justify-center"
                            onClick={() => setCancelOrder(order)}
                          >
                            <Trash2 className="h-4 w-4 text-white" />
                          </Button>
                        </div>

                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        </>
      )}

      <Dialog open={!!cancelOrder} onOpenChange={(open) => { if (!open) { setCancelOrder(null); setCancelReason(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitleText className="flex items-center gap-2 text-destructive text-base">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Cancel/Reject Pickup Request
            </DialogTitleText>
            <DialogDescription>
              Order <strong>#{cancelOrder?.id}</strong> — Please provide a reason. This is mandatory and will be sent to the customer.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Cancellation reason (mandatory)..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="min-h-[100px] resize-none"
          />

          <DialogFooter className="flex flex-row gap-2">
            <Button variant="outline" className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300" onClick={() => { setCancelOrder(null); setCancelReason(''); }} disabled={isCancelling}>
              Keep Request
            </Button>
            <Button
              className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => {
                if (!cancelReason.trim()) {
                  toast.error("Please provide a cancellation reason.");
                  return;
                }
                handleCancelOrder();
              }}
              disabled={isCancelling}
            >
              {isCancelling ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin text-white" />Rejecting...</> : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWeightModal} onOpenChange={(open) => { if(!open) { setShowWeightModal(false); setSelectedOrder(null); setWeightInputs({}); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitleText>⚖️ Update Actual Weights</DialogTitleText>
            <DialogDescription>
              Order #{selectedOrder?.id} — Enter the actual weight in <strong>kg</strong> for each item. 
              Bill will be calculated automatically based on current price.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            {/* Column Headers */}
            <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-muted-foreground border-b pb-2">
              <span>Item</span>
              <span className="text-center">Price/kg</span>
              <span className="text-center">Weight (kg)</span>
              <span className="text-right">Line Total</span>
            </div>

            {selectedOrder && selectedOrder.items && selectedOrder.items.length > 0 ? (
              selectedOrder.items.map((it) => {
                const kg = parseFloat(weightInputs[it.id] || 0);
                const pricePerKg = parseFloat(it.price_per_kg || 0);
                const lineTotal = kg * pricePerKg;

                return (
                  <div key={it.id} className="grid grid-cols-4 gap-2 items-center">
                    {/* Item Name */}
                    <div>
                      <div className="font-medium text-sm">{it.name || `Item #${it.product_id}`}</div>
                      <div className="text-xs text-muted-foreground">Unit: {it.unit || 'trip'}</div>
                    </div>

                    {/* Price per kg */}
                    <div className="text-center text-sm font-semibold text-primary">
                      Rs. {pricePerKg.toLocaleString()}
                    </div>

                    {/* Weight Input (in kg) */}
                    <div>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        placeholder="0.0"
                        value={weightInputs[it.id] ?? ''}
                        onChange={(e) => handleWeightChange(it.id, e.target.value)}
                        className="w-full border rounded px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    {/* Line Total */}
                    <div className={`text-right text-sm font-bold ${lineTotal > 0 ? 'text-green-700' : 'text-muted-foreground'}`}>
                      {lineTotal > 0 ? `Rs. ${lineTotal.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-muted-foreground py-4">No items found for this order.</div>
            )}

            {/* Grand Total */}
            <div className="border-t pt-3 flex items-center justify-between">
              <span className="font-semibold text-sm">Estimated Total Bill</span>
              <span className="text-xl font-bold text-primary">
                Rs. {calcLiveTotal().toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>

            <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded p-2">
              ⚡ After saving, this order will be automatically scheduled and moved to Today's Work or Tomorrow's List.
            </p>
          </div>

          <DialogFooter>
            <div className="flex w-full gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowWeightModal(false); setSelectedOrder(null); setWeightInputs({}); }}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveWeights} 
                disabled={isSavingWeights || calcLiveTotal() === 0}
                className="gap-2"
              >
                {isSavingWeights ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <>💾 Save & Schedule (Rs. {calcLiveTotal().toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}





