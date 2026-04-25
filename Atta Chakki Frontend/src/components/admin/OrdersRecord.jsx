import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { PrintOrderDetails } from './PrintOrderDetails';
import { PrintTaskList } from './PrintTaskList'; 
import { format } from 'date-fns';
import { cn } from '../ui/utils';
import { 
  Search, 
  Package, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Printer,
  CalendarDays,
  CreditCard,
  AlertTriangle,
  FileText,
  Loader2, // Added for loading state
  Monitor,
  Store
} from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog'; 
import { toast } from 'sonner'; 
import { API_BASE_URL } from '../../config'; // <-- NEW: Added API Config

export function OrdersRecord() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true); // <-- NEW: Added Loading State
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateRange, setDateRange] = useState(undefined);
  
  const [printOrder, setPrintOrder] = useState(null);
  const [showPrintList, setShowPrintList] = useState(false);

  const [showAdvanceOnly, setShowAdvanceOnly] = useState(false);
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);

  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  useEffect(() => {
    loadOrders();
    // Reduced polling frequency slightly for a heavy "all orders" query
    const interval = setInterval(loadOrders, 10000); 
    return () => clearInterval(interval);
  }, []);

  // --- NEW: FETCH FROM API ---
  const loadOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_all_orders.php`);
      const data = await response.json();

      if (data.success) {
        const mappedOrders = data.orders.map(order => {
          const totalAmount = parseFloat(order.total_amount) || 0;
          const amountPaid = parseFloat(order.amount_paid) || 0;
          
          // Determine payment status from DB, with fallback logic
          let paymentStatus = order.payment_status || 'pending';
          if (paymentStatus === 'paid' || amountPaid >= totalAmount) {
            paymentStatus = 'paid';
          } else if (amountPaid > 0) {
            paymentStatus = 'partial';
          }
          
          return {
            id: order.id.toString(),
            customerName: order.customer_name || order.full_name || 'Unknown Customer',
            phone: order.customer_phone || order.phone || 'No Phone',
            total: totalAmount,
            status: order.status,
            cancelReason: order.cancellation_reason,
            cancelledBy: order.cancelled_by,
            createdAt: order.created_at,
            paymentMethod: order.payment_method || 'cod',
            paymentStatus: paymentStatus,
            advancePayment: amountPaid,
            type: (order.shipping_address && order.shipping_address.toLowerCase().includes('pickup')) ? 'pickup' : 'delivery',
            deliveryAddress: order.shipping_address,
            source: (order.source && order.source === 'manual') || (order.user_id === '1' || !order.user_id) ? 'manual' : 'online',
            deliveryPersonnel: order.driver_name || null,

            items: order.items ? order.items.map(item => ({
              quantity: item.quantity,
              isWeightPending: item.is_weight_pending || false,
              service: { name: item.name, price: item.price_at_purchase || 0, unit: item.unit || 'Kg' }
            })) : []
          };
        });
        
        setOrders(mappedOrders);
      } else {
        console.error("API Error:", data.message);
      }
    } catch (error) {
      console.error("Network error fetching all orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const matchesDate = (orderDateStr) => {
    if (!dateRange || !dateRange.from) return true;
    const orderDate = new Date(orderDateStr);
    const fromDate = new Date(dateRange.from);
    fromDate.setHours(0, 0, 0, 0);
    if (orderDate < fromDate) return false;
    const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
    toDate.setHours(23, 59, 59, 999); 
    if (orderDate > toDate) return false;
    return true;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.customerName && order.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.phone && order.phone.includes(searchTerm)) ||
      (order.id && order.id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesType = typeFilter === 'all' || order.type === typeFilter;
    const matchesSource = sourceFilter === 'all' || order.source === sourceFilter;
    const matchesDateFilter = matchesDate(order.createdAt);
    const matchesAdvance = !showAdvanceOnly || (order.advancePayment !== undefined && order.advancePayment > 0);
    
    const matchesUnpaid = !showUnpaidOnly || 
                          ((order.paymentStatus === 'pending' || order.paymentStatus === 'partial') && order.status !== 'cancelled');

    return matchesSearch && matchesStatus && matchesType && matchesSource && matchesDateFilter && matchesAdvance && matchesUnpaid;
  });

  const totalPayment = filteredOrders.reduce((sum, order) => {
    const paidAmount = order.paymentStatus === 'paid' ? order.total : (order.advancePayment || 0);
    if (order.status !== 'cancelled' && paidAmount > 0) {
      return sum + paidAmount;
    }
    return sum;
  }, 0);

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    outForDelivery: orders.filter(o => o.status === 'out-for-delivery').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    totalRevenue: orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.total, 0),
    paidOrders: orders.filter(o => o.paymentStatus === 'paid').length,
    unpaidOrders: orders.filter(o => o.paymentStatus === 'pending').length,
    partialOrders: orders.filter(o => o.paymentStatus === 'partial').length,
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { label: 'Pending', className: 'bg-yellow-500 text-white' },
      'processing': { label: 'Processing', className: 'bg-blue-500 text-white' },
      'ready': { label: 'Ready', className: 'bg-green-500 text-white' },
      'out-for-delivery': { label: 'Out for Delivery', className: 'bg-purple-500 text-white' },
      'completed': { label: 'Completed', className: 'bg-gray-500 text-white' },
      'cancelled': { label: 'Cancelled', className: 'bg-red-500 text-white' },
    };

    const config = statusConfig[status] || { label: status, className: '' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };
  
  const getPaymentStatusBadge = (status) => {
    switch(status) {
        case 'paid':
            return <Badge className='bg-green-500 text-white mt-1'>Paid</Badge>;
        case 'partial':
            return <Badge className='bg-blue-500 text-white mt-1'>Partial</Badge>;
        case 'pending':
        default:
            return <Badge className='bg-orange-500 text-white mt-1'>Unpaid</Badge>;
    }
  }

  // --- Record payment via API ---
  const handleSavePayment = async () => {
    if (!paymentOrder) return;
    
    const amountToAdd = parseFloat(paymentAmount);
    if (isNaN(amountToAdd) || amountToAdd <= 0) {
        toast.error("Please enter a valid amount");
        return;
    }

    const outstanding = paymentOrder.total - (paymentOrder.advancePayment || 0);
    if (amountToAdd > outstanding) {
        toast.error(`Amount exceeds outstanding balance of Rs. ${outstanding.toLocaleString()}`);
        return;
    }
    
    setIsSavingPayment(true);
    try {
      const response = await fetch(`${API_BASE_URL}/record_payment.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: parseInt(paymentOrder.id),
          amount: amountToAdd
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || `Payment of Rs. ${amountToAdd} recorded successfully`);
        setPaymentOrder(null);
        setPaymentAmount('');
        loadOrders(); // Reload fresh data from DB
      } else {
        toast.error(result.message || 'Failed to record payment');
      }
    } catch (error) {
      console.error("Payment Error:", error);
      toast.error('Network error while recording payment');
    } finally {
      setIsSavingPayment(false);
    }
  };

  if (loading && orders.length === 0) {
     return (
       <div className="flex flex-col items-center justify-center h-64 space-y-4">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <p className="text-muted-foreground">Loading historical records...</p>
       </div>
     );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Orders Record</h1>
        <p className="text-muted-foreground text-sm">Complete order history</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Total</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-primary" />
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Completed</p>
              <p className="text-xl font-bold">{stats.completed}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Pending</p>
              <p className="text-xl font-bold">{stats.pending}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Revenue</p>
              <p className="text-lg font-bold truncate">Rs. {(stats.totalRevenue / 1000).toLocaleString('en-IN')}K</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative group" style={{ flex: "1 1 auto", minWidth: "250px" }}>
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-green-600" />
                  <Input
                    placeholder="Search by name, phone, or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-14 text-base h-12 w-full rounded-full border-gray-200 bg-gray-50 hover:bg-white focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-green-500 focus-visible:border-green-500 shadow-sm transition-all transition-colors duration-200"
                  />
                </div>
                
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="h-12 items-center cursor-pointer justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ width: "150px", flexShrink: 0 }}
                >
                <option value="all">All Sources</option>
              <option value="manual">Manual Orders</option>
              <option value="online">Online Orders</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <CalendarDays className="mr-1.5 h-3 w-3" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                      </>
                    ) : (
                      format(dateRange.from, "MMM dd")
                    )
                  ) : (
                    <span>Date Range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 min-w-[280px]" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>
            {dateRange && (
              <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)} className="text-xs h-8">
                Clear
              </Button>
            )}

            {/* Status Filters - Horizontal */}
            <div className="flex gap-1 flex-wrap">
              {['all', 'pending', 'processing', 'completed'].map(status => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(status)}
                  size="sm"
                  className="text-xs py-1 h-8"
                >
                  {status.slice(0, 3)}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Checkboxes */}
            <div className="flex items-center space-x-1 border px-2 py-1 rounded text-xs">
              <Checkbox 
                id="advance-filter" 
                checked={showAdvanceOnly} 
                onCheckedChange={(c) => {
                  setShowAdvanceOnly(c);
                  if(c) setShowUnpaidOnly(false); 
                }} 
              />
              <Label htmlFor="advance-filter" className="text-xs cursor-pointer">Advance Only</Label>
            </div>

            <div className="flex items-center space-x-1 border border-red-200 px-2 py-1 rounded bg-red-50 text-xs">
              <Checkbox 
                id="unpaid-filter" 
                checked={showUnpaidOnly} 
                onCheckedChange={(c) => {
                  setShowUnpaidOnly(c);
                  if(c) setShowAdvanceOnly(false);
                }} 
              />
              <Label htmlFor="unpaid-filter" className="text-xs cursor-pointer text-red-700">Unpaid/Due</Label>
            </div>

            <Button 
              variant="default" 
              size="sm"
              className="ml-auto text-xs h-8"
              disabled={filteredOrders.length === 0}
              onClick={() => setShowPrintList(true)}
            >
              <FileText className="h-3 w-3 mr-1" />
              Print
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-3 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">Filtered Summary</h3>
            <p className="text-lg font-bold mt-1">Rs. {totalPayment.toLocaleString('en-IN')}</p>
          </div>
          <p className="text-xs text-muted-foreground text-right">{filteredOrders.length} orders</p>
        </div>
      </Card>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No orders found matching your filters.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Card className="overflow-hidden">
            <Table className="text-xs sm:text-sm">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="whitespace-nowrap">Order ID</TableHead>
                  <TableHead className="whitespace-nowrap">Customer</TableHead>
                  <TableHead className="whitespace-nowrap">Items</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
                  <TableHead className="whitespace-nowrap">Payment</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const remainingBalance = order.total - (order.advancePayment || 0);
                  
                  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
                  const isOverdue = (Date.now() - new Date(order.createdAt).getTime() > sevenDaysMs) && 
                                    (order.paymentStatus === 'pending' || order.paymentStatus === 'partial') && 
                                    order.status !== 'cancelled';

                  return (
                  <TableRow key={order.id} className={isOverdue ? "bg-red-50 hover:bg-red-100" : ""}>
                    <TableCell>
                      <div className="font-mono text-xs font-bold mb-1.5">{order.id}</div>
                      <Badge variant="outline" className={`text-[9px] uppercase font-bold flex items-center gap-1 py-0 px-1.5 h-[18px] w-fit ${order.source === 'manual' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-blue-700 bg-blue-50 border-blue-200'}`}>
                         {order.source === 'manual' ? <Store className="h-2.5 w-2.5" /> : <Monitor className="h-2.5 w-2.5" />}
                         {order.source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-muted-foreground">{order.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        {order.items.slice(0, 1).map((item, idx) => (
                          <p key={idx}>{item.service.name} ×{item.quantity}</p>
                        ))}
                        {order.items.length > 1 && <p className="text-muted-foreground">+{order.items.length - 1}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">Rs. {order.total}</TableCell>
                    <TableCell>
                      <div className="text-xs">
                        {getPaymentStatusBadge(order.paymentStatus)}
                        {remainingBalance > 0 && <p className="text-red-600 font-medium text-xs">Due: {remainingBalance}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">{getStatusBadge(order.status)}{order.status === "cancelled" && order.cancelReason && (<div className="text-[11px] text-red-600 bg-red-50 p-1 rounded font-medium max-w-[150px]" title={`${order.cancelReason} (${order.cancelledBy || "User"})`}><span className="font-bold border-b border-red-200 block mb-0.5 pb-0.5">{order.cancelledBy || "User"} Reason:</span><span className="line-clamp-2">{order.cancelReason}</span></div>)}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col gap-1 items-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 py-0"
                          onClick={() => setPrintOrder(order)}
                        >
                          <Printer className="h-3 w-3 mr-0.5" />
                          Print
                        </Button>
                        
                        {order.paymentStatus !== 'paid' && order.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-primary hover:text-primary hover:bg-primary/10 text-xs h-7 py-0"
                            onClick={() => {
                              setPaymentOrder(order);
                              setPaymentAmount('');
                            }}
                          >
                            <CreditCard className="h-3 w-3 mr-0.5" />
                            Pay
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      <div className="mt-4 text-center text-sm text-muted-foreground">
        Showing {filteredOrders.length} of {orders.length} orders
      </div>
      
      <PrintOrderDetails
        order={printOrder}
        open={!!printOrder}
        onClose={() => setPrintOrder(null)}
      />

      <PrintTaskList 
        orders={filteredOrders}
        title={`Orders List ${showUnpaidOnly ? '(Unpaid/Due Only)' : ''}`}
        open={showPrintList}
        onClose={() => setShowPrintList(false)}
      />

      <Dialog open={!!paymentOrder} onOpenChange={() => setPaymentOrder(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add Payment</DialogTitle>
                <DialogDescription>
                    Record a payment for Order #{paymentOrder?.id}. 
                    Current Due: Rs. {(paymentOrder?.total || 0) - (paymentOrder?.advancePayment || 0)}
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
                <div className="space-y-2">
                    <Label htmlFor="amount">Amount Received (Rs.)</Label>
                    <Input 
                        id="amount" 
                        type="number" 
                        placeholder="Enter amount" 
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        max={(paymentOrder?.total || 0) - (paymentOrder?.advancePayment || 0)}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setPaymentOrder(null)} disabled={isSavingPayment}>Cancel</Button>
                <Button onClick={handleSavePayment} disabled={isSavingPayment}>
                  {isSavingPayment ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {isSavingPayment ? 'Saving...' : 'Save Payment'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}


export default OrdersRecord;
