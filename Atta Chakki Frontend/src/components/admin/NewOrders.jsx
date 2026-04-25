import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrdersTable } from './OrdersTable';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config'; // <--- IMPORT CONFIG
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
import { Truck, UserPlus, Loader2, CalendarClock, Trash2 } from 'lucide-react'; 
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "../ui/tooltip";

export function NewOrders() {
  const [orders, setOrders] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [activePersonnel, setActivePersonnel] = useState([]); // <-- NEW: State for DB drivers
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const navigate = useNavigate();

  // --- 1. Fetch Active Delivery Personnel from DB ---
  const fetchPersonnel = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/manage_delivery.php`);
      const data = await response.json();
      if (data.success) {
        // Only keep active drivers
        setActivePersonnel(data.personnel.filter(p => p.isActive));
      }
    } catch (error) {
      console.error("Error fetching personnel:", error);
    }
  };

  // --- 2. LOAD ORDERS FROM API ---
  const loadOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin_orders.php?status=pending`);
      const data = await response.json();

      if (data.success) {
        // Map Database Columns to Component Props
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
          deliveryPersonnel: order.driver_name // <-- NEW: Pull actual driver name from DB!
        }));
        setOrders(mappedOrders);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonnel(); // Load drivers once when page opens
    loadOrders();
    const interval = setInterval(loadOrders, 5000); // Poll every 5 seconds for new orders
    return () => clearInterval(interval);
  }, []);

  // --- 3. UPDATE STATUS VIA API ---
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
        loadOrders(); // Refresh list immediately
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

  // --- 4. ASSIGN DRIVER VIA API ---
  const handleAssignPersonnel = async (orderId, personnelName) => {
    // Optimistic UI update (makes it look instantly fast on the screen)
    setOrders(orders.map(o => o.id === orderId ? {...o, deliveryPersonnel: personnelName} : o));

    try {
      const response = await fetch(`${API_BASE_URL}/assign_driver.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, driver_name: personnelName })
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
        loadOrders(); // Revert back if it failed
      }
    } catch (error) {
      toast.error("Network error while assigning driver");
      loadOrders(); // Revert back if it failed
    }
  };

  // --- 5. CANCEL ORDER VIA API ---
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
        loadOrders(); // Refresh to remove from list
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
        </div>

        <OrdersTable
          orders={orders}
          actions={(order) => (
            <div className="flex items-center gap-1 flex-wrap">
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
                          onSelect={() => handleAssignPersonnel(order.id, person.name)}
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
                className="bg-success hover:bg-success/90 text-success-foreground text-xs h-8"
                onClick={() => updateOrderStatus(order.id, 'processing')}
              >
                <Truck className="h-3 w-3 mr-1" />
                Start
              </Button>

              <Button
                size="sm"
                variant="destructive"
                className="text-xs h-8"
                onClick={() => setCancelOrder(order)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          )}
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