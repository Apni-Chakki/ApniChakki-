import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/common/card';
import { Badge } from '../../components/common/badge';
import { Button } from '../../components/common/button';
import { Input } from '../../components/common/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/common/table';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/common/popover';
import { Calendar } from '../../components/common/calendar';
import { PrintSlip } from './PrintSlip';
import { PrintTaskList } from './PrintTaskList'; 
import { format } from 'date-fns';
import { cn } from '../../components/common/utils';
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
  Store,
  Download
} from 'lucide-react';
import { Checkbox } from '../../components/common/checkbox';
import { Label } from '../../components/common/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/common/dialog'; 
import { toast } from 'sonner'; 
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../../config'; // <-- NEW: Added API Config
import { Pagination } from '../../components/common/Pagination';

// Map raw API row → UI shape (shared by list + export/print fetches)
const mapOrderRow = (order) => {
  const totalAmount = parseFloat(order.total_amount) || 0;
  const amountPaid = parseFloat(order.amount_paid) || 0;

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
    paymentStatus,
    advancePayment: amountPaid,
    type: (order.order_type === 'pickup' || (order.shipping_address && (
      order.shipping_address.toLowerCase().includes('pickup') ||
      order.shipping_address.toLowerCase().includes('store') ||
      order.shipping_address.toLowerCase().includes('collect') ||
      order.shipping_address.toLowerCase().includes('self') ||
      order.shipping_address.toLowerCase().includes('shop')
    ))) ? 'pickup' : 'delivery',
    deliveryAddress: order.shipping_address,
    source: (order.source && order.source === 'manual') || (order.user_id === '1' || !order.user_id) ? 'manual' : 'online',
    deliveryPersonnel: order.driver_name || null,
    couponCode: order.coupon_code || '',
    couponDiscount: parseFloat(order.coupon_discount || 0),
    items: order.items ? order.items.map(item => ({
      quantity: item.quantity,
      isWeightPending: item.is_weight_pending || false,
      is_cleaning: item.is_cleaning == 1,
      is_grinding: item.is_grinding == 1,
      customizations: item.customizations || [],
      price_at_purchase: item.price_at_purchase || 0,
      name: item.name,
      service: { name: item.name, price: item.price_at_purchase || 0, unit: item.unit || 'Kg' }
    })) : []
  };
};

export function OrdersRecord() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateRange, setDateRange] = useState(undefined);

  const [printOrder, setPrintOrder] = useState(null);
  const [showPrintList, setShowPrintList] = useState(false);
  const [printListOrders, setPrintListOrders] = useState([]);
  const [isPreparingExport, setIsPreparingExport] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [filteredPaid, setFilteredPaid] = useState(0);

  const [stats, setStats] = useState({
    total: 0, pending: 0, processing: 0, ready: 0,
    outForDelivery: 0, completed: 0, cancelled: 0,
    totalRevenue: 0, paidOrders: 0, unpaidOrders: 0, partialOrders: 0,
  });

  const [showAdvanceOnly, setShowAdvanceOnly] = useState(false);
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);

  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Debounce free-text search so we don't hit the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset to page 1 whenever a filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, typeFilter, sourceFilter, dateRange, showAdvanceOnly, showUnpaidOnly, pageSize]);

  // Build the query string used by both list fetch and export/print fetch
  const buildQuery = (extra = {}) => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    if (sourceFilter && sourceFilter !== 'all') params.set('source', sourceFilter);
    if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter);
    if (dateRange?.from) {
      const iso = (d) => new Date(d).toISOString().slice(0, 10);
      params.set('date_from', iso(dateRange.from));
      params.set('date_to', iso(dateRange.to || dateRange.from));
    }
    if (showAdvanceOnly) params.set('advance_only', '1');
    if (showUnpaidOnly) params.set('unpaid_only', '1');
    Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    return params.toString();
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch, statusFilter, typeFilter, sourceFilter, dateRange, showAdvanceOnly, showUnpaidOnly]);

  const loadOrders = async () => {
    try {
      const qs = buildQuery({ page: String(page), limit: String(pageSize) });
      const response = await fetch(`${API_BASE_URL}/get_all_orders.php?${qs}`);
      const data = await response.json();

      if (data.success) {
        setOrders(data.orders.map(mapOrderRow));
        setTotalItems(data.total || 0);
        setFilteredPaid(parseFloat(data.filtered_paid) || 0);
        if (data.stats) {
          setStats({
            total: data.stats.total || 0,
            pending: data.stats.pending || 0,
            processing: data.stats.processing || 0,
            ready: data.stats.ready || 0,
            outForDelivery: data.stats.out_for_delivery || 0,
            completed: data.stats.completed || 0,
            cancelled: data.stats.cancelled || 0,
            totalRevenue: parseFloat(data.stats.total_revenue) || 0,
            paidOrders: data.stats.paid_orders || 0,
            unpaidOrders: data.stats.unpaid_orders || 0,
            partialOrders: data.stats.partial_orders || 0,
          });
        }
      } else {
        console.error("API Error:", data.message);
      }
    } catch (error) {
      console.error("Network error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch full filtered set for Export / Print
  const fetchAllFiltered = async () => {
    const qs = buildQuery({ all: '1' });
    const response = await fetch(`${API_BASE_URL}/get_all_orders.php?${qs}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to load orders');
    return data.orders.map(mapOrderRow);
  };

  // Server already filters, sorts, and paginates — `orders` is the current page
  const filteredOrders = orders;
  const totalPayment = filteredPaid;

  const prettifyStatus = (status) =>
    String(status || '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { label: 'Pending', className: 'bg-yellow-500 text-white' },
      'pickup_pending': { label: 'Pickup Pending', className: 'bg-amber-500 text-white' },
      'arrived_at_shop': { label: 'Arrived at Shop', className: 'bg-teal-500 text-white' },
      'processing': { label: 'Processing', className: 'bg-blue-500 text-white' },
      'ready': { label: 'Ready', className: 'bg-green-500 text-white' },
      'out-for-delivery': { label: 'Out for Delivery', className: 'bg-purple-500 text-white' },
      'completed': { label: 'Completed', className: 'bg-gray-500 text-white' },
      'cancelled': { label: 'Cancelled', className: 'bg-red-500 text-white' },
    };

    const config = statusConfig[status] || { label: prettifyStatus(status), className: 'bg-slate-500 text-white' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPaymentStatusBadge = (status) => {
    switch(status) {
        case 'paid':
            return <Badge className='bg-green-500 text-white'>Paid</Badge>;
        case 'partial':
            return <Badge className='bg-blue-500 text-white'>Partial</Badge>;
        case 'pending':
        default:
            return <Badge className='bg-orange-500 text-white'>Unpaid</Badge>;
    }
  }

  // Export to Real Excel (.xlsx) — always fetch the full filtered set, not just the current page
  const handleExportCSV = async () => {
    if (totalItems === 0) {
      toast.error('No orders to export');
      return;
    }

    setIsPreparingExport(true);
    let fullList = [];
    try {
      fullList = await fetchAllFiltered();
    } catch (e) {
      console.error(e);
      toast.error('Failed to prepare export');
      setIsPreparingExport(false);
      return;
    }
    setIsPreparingExport(false);

    if (fullList.length === 0) {
      toast.error('No orders to export');
      return;
    }

    const excelData = fullList.map(order => {
      const remainingBalance = order.total - (order.advancePayment || 0);
      const itemsStr = order.items.map(i => `${i.service.name} x${i.quantity}`).join(' | ');
      
      return {
        'Order ID': order.id,
        'Date': new Date(order.createdAt).toLocaleDateString(),
        'Customer Name': order.customerName || '',
        'Phone': order.phone || '',
        'Items': itemsStr,
        'Total Amount (Rs)': order.total,
        'Advance Paid (Rs)': order.advancePayment || 0,
        'Remaining Due (Rs)': remainingBalance > 0 ? remainingBalance : 0,
        'Payment Status': order.paymentStatus,
        'Order Status': order.status,
        'Source': order.source,
        'Delivery/Pickup': order.type
      };
    });

    // Create a new workbook and a worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Auto-adjust column widths (basic approximation)
    const columnWidths = [
      { wch: 10 }, // Order ID
      { wch: 12 }, // Date
      { wch: 20 }, // Customer Name
      { wch: 15 }, // Phone
      { wch: 40 }, // Items
      { wch: 18 }, // Total Amount
      { wch: 18 }, // Advance Paid
      { wch: 18 }, // Remaining Due
      { wch: 15 }, // Payment Status
      { wch: 15 }, // Order Status
      { wch: 12 }, // Source
      { wch: 15 }  // Delivery/Pickup
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Orders");

    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, `Orders_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success('Excel file downloaded successfully');
  };

  // Record payment via API
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
      <div className="mb-3 sm:mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">{t("Orders Record")}</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Complete order history</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
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
      <Card className="p-3 sm:p-4 mb-4">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="relative group flex-1 min-w-0">
                  <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground transition-colors group-focus-within:text-green-600" />
                  <Input
                    placeholder="Search by name, phone, or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 sm:pl-14 text-sm sm:text-base h-10 sm:h-12 w-full rounded-full border-gray-200 bg-gray-50 hover:bg-white focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-green-500 focus-visible:border-green-500 shadow-sm transition-all transition-colors duration-200"
                  />
                </div>

                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="h-10 sm:h-12 w-full sm:w-[150px] flex-shrink-0 items-center cursor-pointer justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="text-xs h-8 py-1"
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
              <PopoverContent
                className="w-auto p-0 min-w-[280px]"
                align="start"
                side="bottom"
                sideOffset={6}
                collisionPadding={{ top: 80, bottom: 16, left: 8, right: 8 }}
              >
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
              <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)} className="text-xs h-8 py-1">
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
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Checkboxes */}
            <div 
              onClick={() => {
                setShowAdvanceOnly(!showAdvanceOnly);
                if(!showAdvanceOnly) setShowUnpaidOnly(false);
              }}
              className="flex items-center space-x-2 px-4 py-1.5 rounded bg-gray-50 h-8 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <Checkbox 
                id="advance-filter" 
                checked={showAdvanceOnly} 
                onCheckedChange={() => {
                  setShowAdvanceOnly(!showAdvanceOnly);
                  if(!showAdvanceOnly) setShowUnpaidOnly(false);
                }} 
              />
              <Label htmlFor="advance-filter" className="text-xs cursor-pointer">Advance Only</Label>
            </div>

            <div 
              onClick={() => {
                setShowUnpaidOnly(!showUnpaidOnly);
                if(!showUnpaidOnly) setShowAdvanceOnly(false);
              }}
              className="flex items-center space-x-2 px-4 py-1.5 rounded bg-red-50 h-8 cursor-pointer hover:bg-red-100 transition-colors"
            >
              <Checkbox 
                id="unpaid-filter" 
                checked={showUnpaidOnly} 
                onCheckedChange={() => {
                  setShowUnpaidOnly(!showUnpaidOnly);
                  if(!showUnpaidOnly) setShowAdvanceOnly(false);
                }} 
              />
              <Label htmlFor="unpaid-filter" className="text-xs cursor-pointer text-red-700">Unpaid/Due</Label>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 text-green-700 border-green-200 hover:bg-green-50 px-4"
              disabled={totalItems === 0 || isPreparingExport}
              onClick={handleExportCSV}
            >
              {isPreparingExport ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
              Export
            </Button>

            <Button
              variant="default"
              size="sm"
              className="text-xs h-8 px-4"
              disabled={totalItems === 0 || isPreparingExport}
              onClick={async () => {
                setIsPreparingExport(true);
                try {
                  const full = await fetchAllFiltered();
                  setPrintListOrders(full);
                  setShowPrintList(true);
                } catch (e) {
                  console.error(e);
                  toast.error('Failed to prepare print list');
                } finally {
                  setIsPreparingExport(false);
                }
              }}
            >
              {isPreparingExport ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileText className="h-3 w-3 mr-1" />}
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
          <p className="text-xs text-muted-foreground text-right">{totalItems} orders</p>
        </div>
      </Card>

      {/* Orders Table / Cards */}
      {totalItems === 0 ? (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No orders found matching your filters.</p>
        </Card>
      ) : (
        <>
        {/* Mobile card view (below md) */}
        <div className="md:hidden space-y-3">
          {filteredOrders
            .map((order) => {
            const remainingBalance = order.total - (order.advancePayment || 0);
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
            const isOverdue = (Date.now() - new Date(order.createdAt).getTime() > sevenDaysMs) &&
                              (order.paymentStatus === 'pending' || order.paymentStatus === 'partial') &&
                              order.status !== 'cancelled';
            return (
              <Card key={order.id} className={`p-3 space-y-3 ${isOverdue ? 'bg-red-50 border-red-200' : ''}`}>
                {/* Top row: Order ID + source + date */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-border">
                  <div className="min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold">#{order.id}</span>
                    <Badge variant="outline" className={`text-[9px] uppercase font-bold flex items-center gap-1 py-0 px-1.5 h-[18px] ${order.source === 'manual' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-blue-700 bg-blue-50 border-blue-200'}`}>
                      {order.source === 'manual' ? <Store className="h-2.5 w-2.5" /> : <Monitor className="h-2.5 w-2.5" />}
                      {order.source}
                    </Badge>
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground shrink-0">
                    <div className="font-medium text-foreground">{new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    <div className="text-[10px]">{new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                  </div>
                </div>

                {/* Customer */}
                <div className="text-sm">
                  <p className="font-semibold break-words">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground break-all">{order.phone}</p>
                </div>

                {/* Items */}
                <div className="text-xs space-y-0.5">
                  {order.items.slice(0, 2).map((item, idx) => (
                    <p key={idx} className="break-words"><span className="font-medium">{item.service.name}</span> ×{item.quantity}</p>
                  ))}
                  {order.items.length > 2 && <p className="text-muted-foreground">+{order.items.length - 2} more</p>}
                </div>

                {/* Amount + Payment + Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                  <div>
                    <div className="font-bold text-base">
                      Rs. {order.total}
                      {order.items.some(i => i.isWeightPending) && <span className="text-primary text-[10px] ml-1">(+ TBD)</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {getPaymentStatusBadge(order.paymentStatus)}
                      {getStatusBadge(order.status)}
                    </div>
                    {remainingBalance > 0 && <p className="text-red-600 font-medium text-xs mt-1">Due: Rs. {remainingBalance}</p>}
                  </div>
                </div>

                {order.status === "cancelled" && order.cancelReason && (
                  <div className="text-[11px] text-red-600 bg-red-50 p-2 rounded font-medium">
                    <span className="font-bold border-b border-red-200 block mb-0.5 pb-0.5">{order.cancelledBy || "User"} Reason:</span>
                    <span>{order.cancelReason}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs h-8"
                    onClick={() => setPrintOrder(order)}
                  >
                    <Printer className="h-3 w-3 mr-1 shrink-0" />
                    Print
                  </Button>
                  {order.paymentStatus !== 'paid' && order.status !== 'cancelled' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs h-8 bg-green-600 hover:bg-green-700 text-white border-green-700 hover:border-green-800 shadow-sm"
                      onClick={() => {
                        setPaymentOrder(order);
                        setPaymentAmount('');
                      }}
                    >
                      <CreditCard className="h-3 w-3 mr-1 shrink-0" />
                      Pay
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Desktop table (md and up) */}
        <div className="hidden md:block overflow-x-auto">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Order ID</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders
                  .map((order) => {
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
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        <span className="font-medium text-foreground">{new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <br />
                        <span className="text-[10px]">{new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
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
                    <TableCell className="text-right font-bold whitespace-nowrap">
                      Rs. {order.total}
                      {order.items.some(i => i.isWeightPending) && <span className="text-primary text-[10px] ml-1">(+ TBD)</span>}
                    </TableCell>
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
                      <div className="flex flex-col gap-1.5 items-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 py-0 px-3 w-[72px]"
                          onClick={() => setPrintOrder(order)}
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          Print
                        </Button>

                        {order.paymentStatus !== 'paid' && order.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 py-0 px-3 w-[72px] bg-green-600 hover:bg-green-700 text-white border-green-700 hover:border-green-800 shadow-sm"
                            onClick={() => {
                              setPaymentOrder(order);
                              setPaymentAmount('');
                            }}
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
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
        </>
      )}

      {totalItems > 0 && (
        <Pagination
          currentPage={page}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          className="mt-4"
        />
      )}

      <PrintSlip
        order={printOrder}
        open={!!printOrder}
        onClose={() => setPrintOrder(null)}
      />

      <PrintTaskList
        orders={printListOrders}
        title={`Orders List ${showUnpaidOnly ? '(Unpaid/Due Only)' : ''}`}
        open={showPrintList}
        onClose={() => { setShowPrintList(false); setPrintListOrders([]); }}
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





