import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/common/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import { Pagination } from '../../components/common/Pagination';
import { PrintSlip } from './PrintSlip';
import { PrintTaskList } from './PrintTaskList'; 
import {
  OrdersRecordStats,
  OrdersRecordFilters,
  OrdersRecordList,
  RecordPaymentModal
} from '../../components/features/admin/ordersRecord';

// Map raw API row → UI shape (shared by list + export/print fetches)
const mapOrderRow = (order) => {
  const totalAmount = parseFloat(order.total_amount) || 0;
  const amountPaid = parseFloat(order.amount_paid) || 0;

  let paymentStatus = order.payment_status || 'pending';
  const isCompletedCod = ['completed', 'delivered'].includes(String(order.status).toLowerCase()) &&
                         ['cod', 'cash'].includes(String(order.payment_method || 'cod').toLowerCase());
  if (paymentStatus === 'paid' || amountPaid >= totalAmount || isCompletedCod) {
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

  // Debounce free-text search so we don't hit the API on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
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

    // Load xlsx on demand — heavy library, only needed when exporting
    const XLSX = await import('xlsx');

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

  const handlePrintList = async () => {
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
      <OrdersRecordStats stats={stats} />

      {/* Filters */}
      <OrdersRecordFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
        dateRange={dateRange}
        setDateRange={setDateRange}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        showAdvanceOnly={showAdvanceOnly}
        setShowAdvanceOnly={setShowAdvanceOnly}
        showUnpaidOnly={showUnpaidOnly}
        setShowUnpaidOnly={setShowUnpaidOnly}
        totalItems={totalItems}
        isPreparingExport={isPreparingExport}
        onExportCSV={handleExportCSV}
        onPrintList={handlePrintList}
      />

      {/* Filtered Summary */}
      <Card className="p-3 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">Filtered Summary</h3>
            <p className="text-lg font-bold mt-1">Rs. {filteredPaid.toLocaleString('en-IN')}</p>
          </div>
          <p className="text-xs text-muted-foreground text-right">{totalItems} orders</p>
        </div>
      </Card>

      {/* Orders Table / Cards */}
      <OrdersRecordList
        orders={orders}
        totalItems={totalItems}
        onPrintOrder={setPrintOrder}
        onPayOrder={setPaymentOrder}
      />

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

      {/* Print Modals */}
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

      {/* Payment Modal */}
      <RecordPaymentModal
        order={paymentOrder}
        open={!!paymentOrder}
        onClose={() => setPaymentOrder(null)}
        onPaymentSuccess={loadOrders}
      />
    </div>
  );
}

export default OrdersRecord;
