import { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { ShoppingBag, Clock, CheckCircle, TrendingUp, DollarSign, Package, AlertTriangle, Users, AlertCircle, RefreshCcw, Loader2, Weight, Timer, User, Phone, MapPin, ArrowRight, CalendarClock, History } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../ui/skeleton';
import { API_BASE_URL } from '../../config'; 
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { toast } from 'sonner';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

export function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    completedToday: 0,
    tomorrowScheduled: 0
  });

  const [allTimeStats, setAllTimeStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    completedOrders: 0
  });

  const [overdueOrdersCount, setOverdueOrdersCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState([]);

  const notifiedOrders = useRef(new Set());

  // EOD State - Option A flow with checkbox selection
  const [eodData, setEodData] = useState(null);
  const [showEodModal, setShowEodModal] = useState(false);
  const [isProcessingEod, setIsProcessingEod] = useState(false);
  const [yesterdayOrders, setYesterdayOrders] = useState([]);
  const [selectedCompleted, setSelectedCompleted] = useState(new Set());
  const [eodStep, setEodStep] = useState('loading'); // 'loading' | 'select' | 'processing' | 'done'
  const [loadingYesterday, setLoadingYesterday] = useState(false);

  useEffect(() => {
    fetchStats();
    checkEodStatus();
  }, []);

  const checkEodStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/check_eod_status.php`);
      const data = await response.json();
      if (data.success && data.has_leftover) {
        setEodData(data);
        setShowEodModal(true);
        setEodStep('loading');
        // Automatically fetch detailed yesterday orders
        fetchYesterdayOrders();
      }
    } catch (error) {
      console.error("Failed to check EOD status:", error);
    }
  };

  const fetchYesterdayOrders = async () => {
    setLoadingYesterday(true);
    try {
      const response = await fetch(`${API_BASE_URL}/get_yesterday_pending.php`);
      const data = await response.json();
      if (data.success) {
        setYesterdayOrders(data.orders || []);
        setEodStep('select');
      } else {
        toast.error('Failed to load yesterday\'s orders');
        setEodStep('select');
      }
    } catch (error) {
      console.error("Error fetching yesterday orders:", error);
      toast.error('Network error loading orders');
      setEodStep('select');
    } finally {
      setLoadingYesterday(false);
    }
  };

  const toggleOrderCompleted = (orderId) => {
    setSelectedCompleted(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedCompleted.size === yesterdayOrders.length) {
      setSelectedCompleted(new Set());
    } else {
      setSelectedCompleted(new Set(yesterdayOrders.map(o => o.id)));
    }
  };

  const handleProcessEodSelection = async () => {
    setIsProcessingEod(true);
    setEodStep('processing');
    try {
      const response = await fetch(`${API_BASE_URL}/process_eod_selection.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed_order_ids: Array.from(selectedCompleted)
        })
      });
      const data = await response.json();
      if (data.success) {
        const pendingCount = yesterdayOrders.length - selectedCompleted.size;
        setEodStep('done');
        toast.success(
          `✅ ${data.completed_count} order(s) marked completed, ${data.carried_forward_count} carried forward to today's queue.`
        );
        setTimeout(() => {
          setShowEodModal(false);
          setEodStep('loading');
          setSelectedCompleted(new Set());
          setYesterdayOrders([]);
          fetchStats();
        }, 1500);
      } else {
        toast.error(data.message || 'Failed to process selection');
        setEodStep('select');
      }
    } catch (error) {
      console.error("EOD selection error:", error);
      toast.error('Network error during processing');
      setEodStep('select');
    } finally {
      setIsProcessingEod(false);
    }
  };

  // Legacy Option B handler (auto_fill)
  const handleEodAction = async (actionType) => {
    setIsProcessingEod(true);
    try {
      const response = await fetch(`${API_BASE_URL}/process_rollover.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: actionType })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`EOD Rollover completed successfully! (Auto-Filled & Rescheduled)`);
        setShowEodModal(false);
        fetchStats();
      } else {
        toast.error(data.message || 'Failed to process rollover');
      }
    } catch (error) {
      console.error("Rollover error:", error);
      toast.error('Network error during rollover');
    } finally {
      setIsProcessingEod(false);
    }
  };

  // Polling for arrived_at_shop orders
  useEffect(() => {
    const checkArrivedOrders = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/get_pickup_requests.php`);
        const data = await response.json();
        if (data.success && data.orders) {
          const arrived = data.orders.filter(o => o.status === 'arrived_at_shop');
          arrived.forEach(order => {
            if (!notifiedOrders.current.has(order.id)) {
              notifiedOrders.current.add(order.id);
              toast.info(`New Items Arrived from Pickup Request #${order.id}`, {
                duration: 10000,
                icon: <Package className="h-5 w-5 text-teal-600" />,
                action: {
                  label: 'View',
                  onClick: () => navigate('/admin/pickup-requests')
                }
              });
            }
          });
        }
      } catch (error) {
        console.error("Error polling pickup requests:", error);
      }
    };

    checkArrivedOrders();
    const interval = setInterval(checkArrivedOrders, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin_stats.php`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setStats({
          todayRevenue: Number(data.data.todayRevenue) || 0,
          todayOrders: Number(data.data.todayOrders) || 0,
          pendingOrders: Number(data.data.pendingOrders) || 0,
          processingOrders: Number(data.data.processingOrders) || 0,
          completedToday: Number(data.data.completedToday) || 0,
          tomorrowScheduled: Number(data.data.tomorrowScheduled) || 0
        });

        if (data.stats) {
          setAllTimeStats({
            totalOrders: Number(data.stats.totalOrders) || 0,
            totalRevenue: Number(data.stats.totalRevenue) || 0,
            totalCustomers: Number(data.stats.totalCustomers) || 0,
            completedOrders: Number(data.stats.completedOrders) || 0
          });
        }
        
        setOverdueOrdersCount(Number(data.data.overdueCount) || 0);

        const lStockCount = Number(data.data.lowStockCount) || 0;
        setLowStockCount(lStockCount);
        setLowStockItems(data.data.lowStockItems || []);

        if (lStockCount > 0) {
          toast.error(`${lStockCount} product(s) are critically low on stock!`, {
            duration: 6000,
            icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
            action: {
              label: 'View',
              onClick: () => navigate('/admin/inventory')
            }
          });
        }
      }
    } catch (error) {
      console.error("API Error:", error);
      toast.error("Failed to load dashboard metrics");
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    { title: "Today's Revenue", value: `Rs. ${(stats.todayRevenue).toLocaleString()}`, icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-50' },
    { title: "Today's Orders", value: stats.todayOrders, icon: ShoppingBag, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { title: 'Completed Today', value: stats.completedToday, icon: CheckCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { title: 'Pending (New)', value: stats.pendingOrders, icon: Clock, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { title: 'In Progress', value: stats.processingOrders, icon: Package, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { title: 'Tomorrow Scheduled', value: stats.tomorrowScheduled, icon: TrendingUp, color: 'text-indigo-600', bgColor: 'bg-indigo-50' }
  ];

  const allTimeCards = [
    { title: "Total Revenue", value: `Rs. ${(allTimeStats.totalRevenue).toLocaleString()}`, icon: DollarSign, color: 'text-green-700', bgColor: 'bg-green-100' },
    { title: "Total Orders All-Time", value: allTimeStats.totalOrders, icon: ShoppingBag, color: 'text-blue-700', bgColor: 'bg-blue-100' },
    { title: 'Total Registered Customers', value: allTimeStats.totalCustomers, icon: Users, color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
    { title: 'Total Completed Orders', value: allTimeStats.completedOrders, icon: CheckCircle, color: 'text-emerald-700', bgColor: 'bg-emerald-100' }
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('Dashboard')} Overview</h1>
          <p className="text-muted-foreground text-sm">Real-time store metrics and alerts</p>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm" className="hidden sm:flex" disabled={isLoading}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </Button>
      </div>

      {/* Critical Alerts Section */}
      <div className="grid grid-cols-1 gap-4">
        {/* Low Stock Alert Component */}
        {!isLoading && lowStockCount > 0 && (
          <Card className="border-red-200 bg-gradient-to-r from-red-50 to-white shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-red-200 bg-red-50 flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-red-100 p-3 rounded-full shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-red-900 text-lg uppercase tracking-tight">Stock Exhaustion Warning</h3>
                  <p className="text-red-700 text-sm font-medium mt-1">
                    {lowStockCount} product(s) have fallen below their minimum safe threshold.
                  </p>
                </div>
              </div>
              <Button variant="destructive" className="shrink-0 font-bold tracking-wide w-full md:w-auto shadow-sm" onClick={() => navigate('/admin/inventory')}>
                Manage Inventory
              </Button>
            </div>
            <div className="p-4 sm:p-6 bg-red-50/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {lowStockItems.slice(0, 7).map((item, i) => (
                  <div key={item.id || i} className="flex justify-between items-center p-3 sm:p-4 bg-white border border-red-100 rounded-xl shadow-[0_2px_10px_-4px_rgba(220,38,38,0.15)] hover:border-red-300 transition-colors">
                    <div className="mr-3 overflow-hidden">
                      <p className="font-bold text-gray-800 text-sm truncate">{item.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Min required: {item.min} {item.unit}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-red-700 font-extrabold text-xl leading-none">{item.stock}</p>
                      <p className="text-[10px] uppercase font-bold text-red-800/60 tracking-wider mt-1">{item.unit}</p>
                    </div>
                  </div>
                ))}
                {lowStockCount > 7 && (
                  <div 
                    onClick={() => navigate('/admin/inventory')}
                    className="flex flex-col items-center justify-center p-3 bg-red-50/50 border border-red-200 border-dashed rounded-xl text-red-800 font-bold text-sm cursor-pointer hover:bg-red-100 transition-colors h-full min-h-[70px]"
                  >
                    <span>+{lowStockCount - 7} more items</span>
                    <span className="text-xs font-normal opacity-80 mt-0.5">Click to view all</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Overdue Orders Alert - Only shows if Overdue items exist */}
        {!isLoading && overdueOrdersCount > 0 && (
          <Alert variant="destructive" className="bg-orange-50 border-orange-200 text-orange-900 shadow-sm relative overflow-hidden">
             <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
             <AlertCircle className="h-5 w-5 text-orange-600 mb-0.5" />
             <AlertTitle className="text-orange-900 font-bold ml-2">Overdue Orders Detection</AlertTitle>
             <AlertDescription className="text-orange-800 ml-2 mt-1">
               There are <strong>{overdueOrdersCount}</strong> orders that have passed their expected delivery or pickup date. 
               <Button variant="link" onClick={() => navigate('/admin/orders/pending')} className="text-orange-900 font-bold px-1 h-auto py-0 ml-1 underline underline-offset-2">Process Now</Button>
             </AlertDescription>
          </Alert>
        )}
      </div>

      {/* TODAY'S OVERVIEW */}
      <div className="pt-2">
        <h2 className="text-lg font-bold text-gray-800 mb-4 px-1 border-b border-gray-200 pb-2">Today's Pulse</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-200 border-transparent bg-white">
                {isLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium mb-1">{t(stat.title)}</p>
                      <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{stat.value}</h2>
                    </div>
                    <div className={`${stat.bgColor} ${stat.color} p-3 sm:p-4 rounded-xl shadow-inner`}>
                      <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.5} />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* ALL-TIME STATS OVERVIEW */}
      <div className="pt-4">
        <h2 className="text-lg font-bold text-gray-800 mb-4 px-1 border-b border-gray-200 pb-2">All-Time Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {allTimeCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="p-4 shadow-sm border border-gray-100 bg-gray-50/50">
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <div className="flex items-center gap-4">
                    <div className={`${stat.bgColor} ${stat.color} p-2.5 rounded-lg border border-white/50 shadow-sm`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{t(stat.title)}</p>
                      <h2 className="text-xl font-bold text-gray-900">{stat.value}</h2>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* EOD Rollover Modal - Option A with checkbox selection */}
      <Dialog open={showEodModal} onOpenChange={(open) => {
        if (!isProcessingEod && open === false) {
           setShowEodModal(false);
           setEodStep('loading');
           setSelectedCompleted(new Set());
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-2xl font-bold text-orange-600 flex items-center gap-2">
              <AlertCircle className="h-6 w-6" />
              End of Day (EOD) — Previous Day Review
            </DialogTitle>
            <DialogDescription className="text-base text-gray-700 mt-2">
              You have <strong>{eodData?.leftover_count || yesterdayOrders.length} pending order(s)</strong> from previous days 
              (Total Weight: <strong>{eodData?.leftover_total_weight_kg || 0} kg</strong>, Est. Processing: <strong>{eodData?.leftover_total_minutes || 0} mins</strong>).
            </DialogDescription>
          </DialogHeader>

          {/* Step: Loading */}
          {eodStep === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-4" />
              <p className="text-gray-500 font-medium">Loading yesterday's pending orders...</p>
            </div>
          )}

          {/* Step: Select completed orders */}
          {eodStep === 'select' && (
            <div className="flex flex-col gap-4 min-h-0 flex-1">
              {/* Instruction banner */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                <h3 className="font-bold text-amber-900 text-base flex items-center gap-2">
                  <History className="h-5 w-5 text-amber-600" />
                  Which of these orders from yesterday have been completed?
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  Select the orders that were finished. Unselected orders will be carried forward to the <strong>top of Today's Work List</strong>.
                </p>
              </div>

              {/* Select All / Summary bar */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 border">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="select-all-eod" 
                    checked={yesterdayOrders.length > 0 && selectedCompleted.size === yesterdayOrders.length}
                    onCheckedChange={toggleSelectAll}
                    className="h-5 w-5"
                  />
                  <label htmlFor="select-all-eod" className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
                    Select All ({yesterdayOrders.length})
                  </label>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    {selectedCompleted.size} Completed
                  </Badge>
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100">
                    <ArrowRight className="h-3.5 w-3.5 mr-1" />
                    {yesterdayOrders.length - selectedCompleted.size} Carry Forward
                  </Badge>
                </div>
              </div>

              {/* Orders list with checkboxes */}
              <ScrollArea className="flex-1 min-h-0" style={{ maxHeight: 'calc(90vh - 380px)' }}>
                <div className="space-y-3 pr-4 pb-2">
                  {yesterdayOrders.map((order) => {
                    const isChecked = selectedCompleted.has(order.id);
                    return (
                      <div
                        key={order.id}
                        onClick={() => toggleOrderCompleted(order.id)}
                        className={`relative border rounded-xl p-4 cursor-pointer transition-all duration-200 select-none ${
                          isChecked 
                            ? 'bg-green-50/80 border-green-300 shadow-sm ring-1 ring-green-200' 
                            : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-sm'
                        }`}
                      >
                        {/* Completed overlay badge */}
                        {isChecked && (
                          <div className="absolute top-3 right-3">
                            <Badge className="bg-green-600 text-white text-[10px] px-2 py-0.5">
                              <CheckCircle className="h-3 w-3 mr-1" /> COMPLETED
                            </Badge>
                          </div>
                        )}

                        <div className="flex items-start gap-4">
                          {/* Checkbox */}
                          <div className="pt-1">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleOrderCompleted(order.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-5 w-5"
                            />
                          </div>

                          {/* Order details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-base text-gray-900">Order #{order.id}</h4>
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5 border-gray-300 text-gray-600">
                                  {order.assigned_date || new Date(order.created_at).toLocaleDateString()}
                                </Badge>
                              </div>
                              {!isChecked && (
                                <span className="text-lg font-bold text-gray-800">Rs. {parseInt(order.total_amount || 0).toLocaleString()}</span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                              <div className="flex items-center gap-2 text-gray-600">
                                <User className="h-3.5 w-3.5 text-gray-400" />
                                <span className="font-medium">{order.customer_name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="h-3.5 w-3.5 text-gray-400" />
                                <span>{order.customer_phone}</span>
                              </div>
                            </div>

                            {/* Items summary */}
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {order.items?.map((item, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                                  {item.name} × {item.quantity}
                                </span>
                              ))}
                            </div>

                            {/* Weight & time chips */}
                            <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Weight className="h-3 w-3" />
                                {parseFloat(order.total_weight_kg || 0).toFixed(1)} kg
                              </span>
                              <span className="flex items-center gap-1">
                                <Timer className="h-3 w-3" />
                                {order.processing_time_minutes || '~'} mins
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate max-w-[180px]">{order.shipping_address || 'N/A'}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {yesterdayOrders.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-400" />
                      <p className="font-medium">No pending orders from previous days!</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Action footer */}
              <div className="shrink-0 border-t pt-4 space-y-3">
                {/* Visual summary of what will happen */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-green-50 border border-green-200 rounded-lg py-2.5 px-3">
                    <p className="text-2xl font-bold text-green-700">{selectedCompleted.size}</p>
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Will be Completed</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg py-2.5 px-3">
                    <p className="text-2xl font-bold text-orange-700">{yesterdayOrders.length - selectedCompleted.size}</p>
                    <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Carry Forward to Today</p>
                  </div>
                </div>

                <Button 
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-base h-12 shadow-md" 
                  onClick={handleProcessEodSelection}
                  disabled={isProcessingEod}
                >
                  {isProcessingEod ? (
                    <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Processing...</>
                  ) : (
                    <><ArrowRight className="h-5 w-5 mr-2" /> Confirm & Start Today's Work</>
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  * Unchecked orders will be placed at the <strong>top</strong> of today's processing queue with priority.
                  Capacity: {eodData?.opening_time || '08:00'} to {eodData?.closing_time || '21:00'}.
                </p>
              </div>
            </div>
          )}

          {/* Step: Processing */}
          {eodStep === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-4" />
              <p className="text-gray-700 font-semibold text-lg">Processing your selections...</p>
              <p className="text-gray-500 text-sm mt-1">Updating order statuses and recalculating today's schedule.</p>
            </div>
          )}

          {/* Step: Done */}
          {eodStep === 'done' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-green-100 p-4 mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <p className="text-gray-900 font-bold text-xl">All Set!</p>
              <p className="text-gray-500 text-sm mt-1">Today's work list has been updated. Redirecting...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
