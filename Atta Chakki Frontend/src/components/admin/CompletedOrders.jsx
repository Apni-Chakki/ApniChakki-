import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { CheckCircle, Calendar, User, Package, Search, Monitor, Store } from 'lucide-react';
import { Input } from '../ui/input';
import { API_BASE_URL } from '../../config';

export function CompletedOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  useEffect(() => {
    fetchCompletedOrders();
  }, []);

  const fetchCompletedOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_completed_orders.php`);
      const data = await response.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter logic for search bar
  const filteredOrders = orders.filter(order => {
    const source = (order.source && order.source === 'manual') ? 'manual' : (order.user_id === '1' || !order.user_id) ? 'manual' : 'online';
    const matchesSearch = order.id.toString().includes(searchTerm) ||
      (order.customer_name || order.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customer_phone || order.phone || '').includes(searchTerm);
    
    const matchesSource = sourceFilter === 'all' || sourceFilter === source;

    return matchesSearch && matchesSource;
  });

  if (loading) return <div className="p-8 text-center">Loading History...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-green-700">Completed Orders</h1>
          <p className="text-muted-foreground">History of delivered and finished jobs</p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-3">
          <select 
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="flex h-10 w-full md:w-[160px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="all">All Orders</option>
            <option value="manual">Manual Orders</option>
            <option value="online">Online Orders</option>
          </select>
          <div className="relative w-full md:w-64 lg:w-72 md:ml-auto group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-green-600" />
            <Input 
              placeholder="Search ID, Name, Phone..." 
              className="pl-11 text-sm h-10 rounded-full border-gray-200 bg-gray-50 hover:bg-white focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-green-500 shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrders.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground py-10">No completed orders found.</p>
        ) : (
          filteredOrders.map((order) => {
            const isManual = (order.source && order.source === 'manual') || (order.user_id === '1' || !order.user_id);
            return (
            <Card key={order.id} className="border-t-4 border-t-green-500 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2 bg-green-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Order #{order.id}
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge className="bg-green-600">Completed</Badge>
                    <Badge variant="outline" className={`text-[10px] items-center gap-1 py-0 px-2 h-5 ${isManual ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-blue-700 bg-blue-50 border-blue-200'}`}>
                       {isManual ? <Store className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                       {isManual ? 'MANUAL' : 'ONLINE'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* Customer Details */}
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2 font-medium bg-green-50 rounded p-2">
                    <User className="h-4 w-4 text-green-600" />
                    <span className="font-bold">{order.customer_name || order.full_name || 'Unknown'}</span>
                    <span className="text-muted-foreground ml-2 text-xs border-l border-green-200 pl-2">{order.customer_phone || order.phone || 'No Phone'}</span>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <div className="font-semibold mb-2 flex items-center gap-2">
                    <Package className="h-3 w-3" /> Order Items:
                  </div>
                  <ul className="space-y-1">
                    {order.items.map((item, i) => (
                      <li key={i} className="flex justify-between text-muted-foreground">
                        <span>{item.name}</span>
                        <span>x{item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t mt-2 pt-2 flex justify-between font-bold text-black">
                    <span>Total:</span>
                    <span>Rs. {parseInt(order.total_amount).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })
        )}
      </div>
    </div>
  );
}


export default CompletedOrders;
