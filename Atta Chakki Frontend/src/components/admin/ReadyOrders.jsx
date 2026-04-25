import { useState, useEffect } from 'react';
import { OrdersTable } from './OrdersTable';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import { CheckCircle2, Loader2, PackageCheck } from 'lucide-react';

export function ReadyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch orders and strictly filter for 'ready' status
  const loadOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin_orders.php?status=ready`);
      const data = await response.json();

      if (data.success) {
        // STRICT FRONTEND FILTER: Ensure absolutely NO completed orders slip through
        const strictlyReadyOrders = data.orders.filter(order => order.status === 'ready');

        // Map Database Columns to React Props
        const mappedOrders = strictlyReadyOrders.map(order => ({
          ...order,
          id: order.id,
          customerName: order.customer_name, 
          phone: order.customer_phone,
          total: parseFloat(order.total_amount),
          createdAt: order.created_at,
          paymentMethod: order.payment_method,
          type: order.shipping_address && order.shipping_address.toLowerCase().includes('pickup') ? 'pickup' : 'delivery',
          deliveryAddress: order.shipping_address,
          deliveryPersonnel: null 
        }));
        setOrders(mappedOrders);
      }
    } catch (error) {
      console.error("Error loading ready orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000); // Auto-refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Update Status to Completed
  const updateToCompleted = async (orderId) => {
    // OPTIMISTIC UPDATE: Instantly hide it from the UI so it looks fast and snappy
    setOrders(currentOrders => currentOrders.filter(o => o.id !== orderId));

    try {
      const response = await fetch(`${API_BASE_URL}/update_order_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status: 'completed' })
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Order marked as Completed!");
        // We already hid it, but we reload in the background just to sync with DB
        loadOrders(); 
      } else {
        toast.error("Failed to complete order");
        loadOrders(); // If it failed, reload to bring the order back to the screen
      }
    } catch (error) {
      toast.error("Network error");
      loadOrders(); // Bring it back on error
    }
  };

  if (loading && orders.length === 0) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PackageCheck className="h-6 w-6 text-green-600" />
            Ready Orders
          </h1>
          <p className="text-muted-foreground">{orders.length} orders waiting for pickup or delivery</p>
        </div>
      </div>

      {orders.length === 0 && !loading ? (
        <div className="p-12 text-center border-2 border-dashed rounded-lg bg-muted/30">
            <PackageCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">No ready orders right now.</p>
            <p className="text-muted-foreground">When you mark an order as 'Ready' in Today's Work, it will appear here.</p>
        </div>
      ) : (
        <OrdersTable
          orders={orders}
          actions={(order) => (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
              onClick={() => updateToCompleted(order.id)}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {order.type === 'delivery' ? 'Mark as Delivered' : 'Handed to Customer'}
            </Button>
          )}
        />
      )}
    </div>
  );
}