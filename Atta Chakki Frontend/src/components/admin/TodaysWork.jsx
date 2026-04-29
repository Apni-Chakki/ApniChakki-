import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle, Clock, MapPin, Phone, User, Package, Printer, FileDown, Loader2, CalendarClock, Timer, Weight, ArrowRight, Zap, AlertTriangle, History } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import { deductFromInventory } from '../../lib/inventoryUtils';
import { downloadBillPDF } from '../../lib/billPdfUtils';
import { PrintOrderDetails } from './PrintOrderDetails';
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

export function TodaysWork() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printOrder, setPrintOrder] = useState(null);
  const [sendingBill, setSendingBill] = useState(null);
  const [overriding, setOverriding] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [activePersonnel, setActivePersonnel] = useState([]);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const totalWeight = orders.reduce((sum, order) => sum + parseFloat(order.total_weight_kg || 0), 0);
  const totalProcessingMinutes = orders.reduce((sum, order) => sum + parseInt(order.processing_time_minutes || 0), 0);
  const activeDrivers = activePersonnel.length;

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

  // fetch today's processing orders with scheduling info
  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_processing_orders.php`);
      const data = await response.json();
      
      if (data.success) {
        setOrders((data.orders || []).map(order => ({
          ...order,
          type: order.type || (order.shipping_address && !order.shipping_address.toLowerCase().includes('pickup') ? 'delivery' : 'pickup'),
          deliveryPersonnel: order.deliveryPersonnel || order.driver_name || null,
        })));
        if (data.capacity) setCapacity(data.capacity);
      } else {
        console.error("Failed to load orders");
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
        fetchOrders();
      }
    } catch (error) {
      toast.error('Network error while assigning driver');
      fetchOrders();
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

  // override: move order to tomorrow
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
      toast.error('Network error');
    } finally {
      setOverriding(null);
    }
  };

  // whatsapp message generator
  const generateWhatsAppMessage = (order) => {
    const isDelivery = order.shipping_address && !order.shipping_address.toLowerCase().includes('pickup');
    const orderType = isDelivery ? "DELIVERY" : "PICKUP";
    
    let itemsText = "";
    order.items.forEach(item => {
        itemsText += `🔸 ${item.name} × ${item.quantity}\n`;
    });

    let phone = (order.customer_phone || '').replace(/\D/g,'');
    if (phone.startsWith('0')) {
        phone = '92' + phone.substring(1);
    } else if (!phone.startsWith('92')) {
        phone = '92' + phone; 
    }

    const message = `
*GRISTMILL'S* - Fresh Flour Daily 🌾
-----------------------------------
Hello *${order.customer_name}*! 👋
Your order is now *READY* for ${orderType}.

*ORDER DETAILS*
Order ID: #${order.id}
Status: READY

*ORDER ITEMS*
${itemsText}
-----------------------------------
*SUBTOTAL:* Rs. ${parseInt(order.total_amount).toLocaleString()}
*REMAINING DUE:* Rs. ${parseInt(order.total_amount).toLocaleString()}

Thank you for your business!
Gristmill's - Fresh Flour Daily
`.trim();
    
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${phone}?text=${encodedMessage}`;
  };

  // mark as ready + download PDF bill + send whatsapp
  const markAsReady = async (order) => {
    setSendingBill(order.id);
    try {
      const response = await fetch(`${API_BASE_URL}/update_order_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, status: 'ready' })
      });
      const data = await response.json();

      if (data.success) {
        const invResult = await deductFromInventory(order);
        if (invResult.success) {
          toast.success(`Order #${order.id} is Ready! Inventory updated.`);
        } else {
          toast.warning(`Order is Ready, but inventory issue: ${invResult.message}`);
        }

        const totalAmount = parseFloat(order.total_amount) || 0;
        const amountPaid = parseFloat(order.amount_paid) || 0;
        const pdfOrder = {
          id: String(order.id),
          customerName: order.customer_name || 'Walk-in Customer',
          phone: order.customer_phone || '',
          total: totalAmount,
          advancePayment: amountPaid,
          type: (order.shipping_address && order.shipping_address.toLowerCase().includes('pickup')) ? 'pickup' : 'delivery',
          deliveryAddress: order.shipping_address || '',
          paymentMethod: order.payment_method || 'cash',
          paymentStatus: amountPaid >= totalAmount && totalAmount > 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'pending',
          items: (order.items || []).map(item => ({
            quantity: item.quantity,
            isWeightPending: false,
            service: {
              name: item.name,
              price: item.price_at_purchase || 0,
              unit: item.unit || 'kg'
            }
          }))
        };

        const filename = await downloadBillPDF(pdfOrder);
        toast.success(`📄 Bill PDF downloaded: ${filename}`);
        setOrders(prev => prev.filter(o => o.id !== order.id));
        const whatsappLink = generateWhatsAppMessage(order);
        setTimeout(() => window.open(whatsappLink, '_blank'), 600);
      } else {
        toast.error('Failed to update status.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Network Error');
    } finally {
      setSendingBill(null);
    }
  };

  const handlePrint = (order) => {
    const totalAmount = parseFloat(order.total_amount) || 0;
    const amountPaid = parseFloat(order.amount_paid) || 0;
    
    let paymentStatus = order.payment_status || 'pending';
    if (paymentStatus === 'paid' || amountPaid >= totalAmount) {
      paymentStatus = 'paid';
    } else if (amountPaid > 0) {
      paymentStatus = 'partial';
    }

    const transformedOrder = {
      id: order.id.toString(),
      customerName: order.customer_name || order.full_name || 'Walk-in Customer',
      phone: order.customer_phone || order.phone || '',
      total: totalAmount,
      status: order.status,
      createdAt: order.created_at,
      paymentMethod: order.payment_method || 'cod',
      paymentStatus: paymentStatus,
      advancePayment: amountPaid,
      type: (order.shipping_address && order.shipping_address.toLowerCase().includes('pickup')) ? 'pickup' : 'delivery',
      source: (order.user_id === '1' || !order.user_id) ? 'manual' : 'online',
      deliveryPersonnel: order.driver_name || null,
      deliveryAddress: order.shipping_address,
      cancellationReason: null,
      cancelledBy: null,
      items: order.items ? order.items.map(item => ({
        quantity: item.quantity,
        isWeightPending: false,
        price_at_purchase: item.price_at_purchase || 0,
        name: item.name,
        service: { name: item.name, price: item.price_at_purchase || 0 }
      })) : []
    };
    setPrintOrder(transformedOrder);
  };

  // format ETA time nicely
  const formatETA = (eta) => {
    if (!eta) return 'Calculating...';
    const date = new Date(eta);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // get time remaining until ETA
  const getTimeRemaining = (eta) => {
    if (!eta) return null;
    const now = new Date();
    const etaDate = new Date(eta);
    const diffMs = etaDate - now;
    if (diffMs <= 0) return 'Ready soon';
    const mins = Math.ceil(diffMs / 60000);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins}m`;
  };

  // OrderCard inner component
  const OrderCard = ({ order }) => (
    <Card className={`border-l-[6px] shadow-lg hover:shadow-xl transition-all border-t border-r border-b rounded-xl bg-white ${
      order.is_carried_forward
        ? 'border-l-orange-500'
        : order.is_manually_overridden === '1' || order.is_manually_overridden === 1
          ? 'border-l-amber-500'
          : 'border-l-blue-600'
    }`}>
      <CardHeader className={`pb-2 rounded-t-xl mb-4 ${order.is_carried_forward ? 'bg-orange-50/60' : 'bg-slate-50/50'}`}>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2 flex-wrap">
              Order #{order.id}
              {order.is_carried_forward && (
                <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-[10px] px-2 py-0.5 font-bold">
                  <History className="h-3 w-3 mr-1" /> CARRIED FORWARD
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm font-medium text-muted-foreground mt-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Created: {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <div className="text-right bg-blue-50/80 px-3 py-2 rounded-lg">
            <span className="text-xl font-bold text-slate-800">Rs. {parseInt(order.total_amount).toLocaleString()}</span>
            <p className="text-xs font-semibold text-blue-600 uppercase mt-0.5">{order.payment_method}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-6">
        {/* ETA & scheduling info card */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-lg">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
                <Timer className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase">ETA</span>
              </div>
              <p className="text-lg font-bold text-emerald-800">{formatETA(order.estimated_completion_time)}</p>
              <p className="text-xs text-emerald-600">{getTimeRemaining(order.estimated_completion_time)}</p>
            </div>
            <div className="text-center border-x border-emerald-200">
              <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
                <Weight className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase">Weight</span>
              </div>
              <p className="text-lg font-bold text-emerald-800">{parseFloat(order.total_weight_kg || 0).toFixed(1)} kg</p>
              <p className="text-xs text-emerald-600">{order.processing_time_minutes || Math.ceil(parseFloat(order.total_weight_kg || 1) * 2)} mins</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
                <Package className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase">Queue</span>
              </div>
              <p className="text-lg font-bold text-emerald-800">#{order.queue_position || '-'}</p>
              <p className="text-xs text-emerald-600">Position</p>
            </div>
          </div>
        </div>

        {/* customer info */}
        <div className="bg-muted/30 p-3 rounded-md space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{order.customer_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{order.customer_phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{order.shipping_address}</span>
          </div>
          {order.driver_name && (
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-slate-700">Driver: {order.driver_name}</span>
            </div>
          )}
        </div>

        {/* order items */}
        <div>
          <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
            <Package className="h-4 w-4" /> Items to Prepare:
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

        {/* actions */}
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Button
            className="w-full bg-green-600 hover:bg-green-700 shadow-md font-medium text-[15px] disabled:opacity-70"
            onClick={() => markAsReady(order)}
            disabled={sendingBill === order.id}
          >
            {sendingBill === order.id ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Generating Bill...</>
            ) : (
              <><FileDown className="h-5 w-5 mr-2" /> Mark as Ready & Send Bill</>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full border-2 border-orange-200 text-orange-700 hover:bg-orange-50 shadow-sm font-medium"
            onClick={() => moveToTomorrow(order)}
            disabled={overriding === order.id}
          >
            {overriding === order.id ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Moving...</>
            ) : (
              <><CalendarClock className="h-4 w-4 mr-2" /> Push to Tomorrow</>
            )}
          </Button>

          {order.type === 'delivery' ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className={`border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm font-medium ${order.deliveryPersonnel ? 'bg-blue-50' : ''}`}>
                  <Truck className="h-4 w-4 mr-2" />
                  {order.deliveryPersonnel ? `${order.deliveryPersonnel.slice(0, 10)}` : 'Driver'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">Assign Driver</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {activePersonnel.length > 0 ? (
                  activePersonnel.map(person => (
                    <DropdownMenuItem key={person.id} onSelect={() => handleAssignPersonnel(order.id, person.name, person.phone)} className="cursor-pointer text-xs">
                      <span>{person.name}</span>
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
          ) : (
            <Button size="sm" variant="outline" disabled className="border-slate-200 text-slate-500 opacity-60 cursor-default">
              <Package className="h-4 w-4 mr-2" />
              Self Pickup
            </Button>
          )}

          <Button variant="outline" className="w-full border-2 border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm font-medium" onClick={() => handlePrint(order)}>
            <Printer className="h-5 w-5 mr-2" /> Print
          </Button>

          <Button variant="destructive" className="w-full shadow-sm font-medium" onClick={() => setCancelOrder(order)}>
            <Trash2 className="h-5 w-5 mr-2" /> Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></div>;
  }

  const carriedForwardOrders = orders.filter(o => o.is_carried_forward);
  const todayNewOrders = orders.filter(o => !o.is_carried_forward);

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* header with quick stats */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-emerald-50/50 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 text-xs font-semibold uppercase tracking-wide mb-3">
              Processing Board
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Today's Work</h1>
            <p className="text-slate-600 mt-2 max-w-2xl">
              Orders currently in production, with live capacity, driver assignment, and scheduling actions in one place.
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2 self-start lg:self-auto">
            {orders.length} Active Jobs
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Total Weight</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{totalWeight.toFixed(1)} kg</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Estimated Workload</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{totalProcessingMinutes} mins</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Available Drivers</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{activeDrivers}</p>
          </div>
        </div>
      </div>

      {/* capacity utilization bar */}
      {capacity && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Today's Capacity</span>
              </div>
              <div className="text-sm text-blue-700 text-right">
                <span className="font-bold">{Math.round(capacity.booked_minutes)}</span> mins booked
                <span className="mx-2">•</span>
                <span className="font-bold text-green-700">{Math.round(capacity.remaining_minutes)} mins</span> remaining
                <span className="text-xs text-blue-500 ml-1">(from now)</span>
              </div>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  capacity.percentage_used > 90 ? 'bg-red-500' : 
                  capacity.percentage_used > 70 ? 'bg-orange-500' : 
                  'bg-blue-600'
                }`}
                style={{ width: `${Math.min(capacity.percentage_used, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-blue-600">
              <span>{capacity.opening_time} (Open)</span>
              <span className="font-semibold">
                {capacity.percentage_used}% utilized
                {capacity.current_time && <span className="ml-2 text-blue-400">· Now: {capacity.current_time}</span>}
              </span>
              <span>{capacity.closing_time} (Close)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {orders.length === 0 ? (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-background p-4 mb-4">
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">All caught up!</h3>
            <p className="text-muted-foreground">No orders are currently in processing.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Carried Forward Section */}
          {carriedForwardOrders.length > 0 && (
            <>
              <div className="flex items-center gap-3 px-1">
                <div className="flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1.5 rounded-full text-sm font-bold">
                  <History className="h-4 w-4" />
                  Carried Forward from Yesterday
                </div>
                <div className="flex-1 h-px bg-orange-200" />
                <span className="text-xs text-orange-600 font-semibold">
                  {carriedForwardOrders.length} order(s)
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {carriedForwardOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </>
          )}

          {/* Today's New Orders Section */}
          {todayNewOrders.length > 0 && (
            <>
              <div className="flex items-center gap-3 px-1">
                <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-bold">
                  <CalendarClock className="h-4 w-4" />
                  Today's New Orders
                </div>
                <div className="flex-1 h-px bg-blue-200" />
                <span className="text-xs text-blue-600 font-semibold">
                  {todayNewOrders.length} order(s)
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {todayNewOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* print overlay dialog */}
      <PrintOrderDetails
        order={printOrder}
        open={!!printOrder}
        onClose={() => setPrintOrder(null)}
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