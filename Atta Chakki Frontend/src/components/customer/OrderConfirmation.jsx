import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { API_BASE_URL } from '../../config';

export function OrderConfirmation() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/track_order.php?order_id=${orderId}`);
      const data = await response.json();

      if (data.success && data.orders && data.orders.length > 0) {
        const o = data.orders[0];
        setOrder({
          id: o.id,
          customerName: o.customer_name,
          phone: o.customer_phone,
          status: o.status,
          total: o.total_amount,
          paymentMethod: o.payment_method,
          paymentStatus: o.payment_status,
          deliveryAddress: o.shipping_address,
          createdAt: o.created_at,
          items: (o.items || []).map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price_at_purchase
          }))
        });
      }
    } catch (error) {
      console.error("Error fetching order:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <Card className="p-8 sm:p-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading order details...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="p-6 sm:p-8">
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="mb-2 text-3xl font-bold">Order Placed Successfully!</h1>
          <p className="text-muted-foreground">Thank you for your order</p>
        </div>

        {order && (
          <div className="space-y-6 mb-8">
            {/* Order ID */}
            <div className="bg-secondary/20 border border-border rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Your Order ID</p>
              <p className="text-2xl font-bold text-primary">#{orderId}</p>
            </div>

            {/* Order Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Order Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="text-foreground">{order.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="text-foreground">{order.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Type:</span>
                  <span className="text-foreground capitalize">
                    {order.deliveryAddress && !order.deliveryAddress.toLowerCase().includes('pickup') 
                      ? 'Delivery' : 'Pickup'}
                  </span>
                </div>

                {order.items && order.items.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-sm font-semibold text-foreground mb-2">Items Ordered</p>
                    <div className="space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{item.name}</span>
                          {item.isWeightPending ? (
                            <span className="text-primary font-medium">Pending Wt.</span>
                          ) : (
                            <span>x {item.quantity}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between pt-3 border-t border-border">
                  <span className="text-muted-foreground">Payment:</span>
                  <span className="text-foreground capitalize">
                    {order.paymentMethod === 'jazzcash' ? 'JazzCash' : 
                     order.paymentMethod === 'easypaisa' ? 'EasyPaisa' : 
                     order.paymentMethod}
                    {order.paymentStatus === 'paid' && ' ✓'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="text-foreground">
                    Rs. {order.total}
                    {order.items.some(i => i.isWeightPending) && " (+ TBD)"}
                  </span>
                </div>
                {order.paymentStatus === 'paid' && order.transactionId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction ID:</span>
                    <span className="text-foreground font-mono text-xs">{order.transactionId}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <Button
          onClick={() => navigate('/')}
          className="w-full"
        >
          Back to Home
        </Button>
      </Card>
    </div>
  );}
