import { useState, useEffect, useRef } from 'react';
import { Card } from '../../components/common/card';
import { ShoppingBag, Clock, CheckCircle, TrendingUp, DollarSign, Package, AlertTriangle, Users, AlertCircle, RefreshCcw, Loader2, Weight, Timer, User, Phone, MapPin, ArrowRight, CalendarClock, History } from 'lucide-react';
import { Button } from '../../components/common/button';
import { Badge } from '../../components/common/badge';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../../components/common/skeleton';
import { API_BASE_URL } from '../../config'; 
import { Alert, AlertDescription, AlertTitle } from '../../components/common/alert';
import { toast } from 'sonner';
import { Checkbox } from '../../components/common/checkbox';
import { ScrollArea } from '../../components/common/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/common/dialog";

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
    { id: 'revenue', title: "Today's Revenue",
 value: `Rs. ${(stats.todayRevenue).toLocaleString()}`, icon: DollarSign, iconBg: '#ECFDF5', iconColor: '#059669' },
    { id: 'orders', title: "Today's Orders", value: stats.todayOrders, icon: ShoppingBag, iconBg: '#FEF3C7', iconColor: '#B45309' },
    { id: 'completed', title: 'Completed Today', value: stats.completedToday, icon: CheckCircle, iconBg: '#F0FDFA', iconColor: '#0D9488' },
    { id: 'pending', title: 'Pending (New)', value: stats.pendingOrders, icon: Clock, iconBg: '#FFFFFF', iconColor: '#BE123C' },
    { id: 'progress', title: 'In Progress', value: stats.processingOrders, icon: Package, iconBg: '#F5F3FF', iconColor: '#7C3AED' },
    { id: 'tomorrow', title: 'Tomorrow Scheduled', value: stats.tomorrowScheduled, icon: TrendingUp, iconBg: '#EFF6FF', iconColor: '#2563EB' }
  ];

  const allTimeCards = [
    { title: 'Total Revenue', value: `Rs. ${(allTimeStats.totalRevenue).toLocaleString()}`, subtitle: 'Lifetime cumulative', featured: true },
    { title: 'Total Orders All-Time', value: allTimeStats.totalOrders, subtitle: '↑ 12% growth', subtitleClass: 'text-emerald-600 font-semibold' },
    { title: 'Total Registered Customers', value: allTimeStats.totalCustomers, subtitle: 'Verified profiles' },
    { title: 'Total Completed Orders', value: allTimeStats.completedOrders, subtitle: 'Successful fulfillment' }
  ];

  return (
    <div className="space-y-10 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold
           sm:text-3xl font-black tracking-tight text-gray-900">{t('Dashboard')} Overview</h1>
          <p className="text-gray-500 text-sm mt-2">Real-time store metrics and alerts</p>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm" className="hidden sm:flex" style={{ borderColor: '#8b6f47', color: '#8b6f47' }} disabled={isLoading}>
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

      {/* TODAY'S PULSE */}
      <div>
        <div className="flex items-center gap-3 mb-7">
          <div className="h-7 w-1.5 rounded-full" style={{ backgroundColor: '#8b6f47' }} />
          <h2 className="text-xl mt-3 mb-3 font-bold text-gray-900 tracking-tight">Today's Pulse</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            const isPending = stat.id === 'pending';
            const showUrgent = isPending && stats.pendingOrders > 0;
            return (
              <Card
                key={index}
                className={`relative overflow-hidden border transition-all duration-200 rounded-xl ${
                  showUrgent
                    ? 'border-rose-200 shadow-sm'
                    : 'border-gray-200/70 bg-white shadow-sm hover:shadow-md'
                }`}
                style={showUrgent ? { backgroundColor: '#FBE8E2', boxShadow: '0 1px 3px rgba(190, 18, 60, 0.08)' } : {}}
              >
                {isLoading ? (
                  <div className="p-6"><Skeleton className="h-16 w-full" /></div>
                ) : (
                  <div className="p-6">
                    <p className={`text-[11px] font-bold uppercase tracking-[0.08em] mb-5 ${showUrgent ? 'text-rose-800' : 'text-gray-500'}`}>
                      {t(stat.title)}
                    </p>
                    <div className="flex items-center gap-4">
                      <div
                        className="shrink-0 flex items-center justify-center"
                        style={{
                          width: '48px',
                          height: '48px',
                          backgroundColor: stat.iconBg,
                          borderRadius: '12px',
                          border: '1px solid rgba(0, 0, 0, 0.06)',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)'
                        }}
                      >
                        <Icon style={{ height: '22px', width: '22px', color: stat.iconColor }} strokeWidth={2.25} />
                      </div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none">{stat.value}</h2>
                        {showUrgent && (
                          <span
                            style={{
                              backgroundColor: '#dc2626',
                              color: '#ffffff',
                              fontSize: '10px',
                              fontWeight: 800,
                              letterSpacing: '0.08em',
                              padding: '4px 9px',
                              borderRadius: '9999px',
                              textTransform: 'uppercase',
                              display: 'inline-flex',
                              alignItems: 'center',
                              boxShadow: '0 1px 3px rgba(220, 38, 38, 0.4)',
                              lineHeight: 1
                            }}
                          >
                            Urgent
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* ALL-TIME STATISTICS */}
      <div className="pt-2">
        <div className="flex items-center gap-3 mb-7">
          <div className="h-7 w-1.5 rounded-full" style={{ backgroundColor: '#8b6f47' }} />
          <h2 className="text-xl font-bold text-gray-900 mt-3 mb-3 tracking-tight">All-Time Statistics</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {allTimeCards.map((stat, index) => {
            const isFeatured = stat.featured;
            return (
              <Card
                key={index}
                className={`relative overflow-hidden transition-all duration-200 rounded-xl ${
                  isFeatured ? 'border-0 text-white' : 'border border-gray-100 bg-white hover:shadow-md'
                }`}
                style={isFeatured ? { background: 'linear-gradient(135deg, #6f5535, #8b6f47)' } : {}}
              >
                {isLoading ? (
                  <div className="p-6"><Skeleton className={`h-16 w-full ${isFeatured ? 'bg-white/20' : ''}`} /></div>
                ) : (
                  <div className="p-6">
                    <p className={`text-[11px] font-bold uppercase tracking-[0.08em] mb-5 ${isFeatured ? 'text-white/80' : 'text-gray-500'}`}>
                      {t(stat.title)}
                    </p>
                    <h2 className={`text-3xl font-black tracking-tight leading-none mb-3 ${isFeatured ? 'text-white' : 'text-gray-900'}`}>
                      {stat.value}
                    </h2>
                    <p className={`text-xs ${stat.subtitleClass || (isFeatured ? 'text-white/70 font-medium' : 'text-gray-400 font-medium')}`}>
                      {stat.subtitle}
                    </p>
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
        <DialogContent className="max-w-lg max-h-[85vh] p-0 gap-0 overflow-hidden !bg-white" style={{ borderColor: '#d9c9b3' }}>
          <DialogHeader className="shrink-0 border-b px-4 py-3" style={{ background: 'linear-gradient(to right, #faf6f0, #f5ede3)', borderColor: '#e5d9c4' }}>
            <DialogTitle className="text-lg font-bold flex items-center gap-2" style={{ color: '#6f5535' }}>
              <History className="h-5 w-5" />
              Pending Orders
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600 mt-2 font-medium">
              {eodData?.leftover_count || yesterdayOrders.length} orders • {eodData?.leftover_total_weight_kg || 0} kg • {eodData?.leftover_total_minutes || 0} mins
            </DialogDescription>
          </DialogHeader>

          {/* Step: Loading */}
          {eodStep === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="rounded-full p-4 mb-4" style={{ backgroundColor: '#f5ede3' }}>
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8b6f47' }} />
              </div>
              <p className="text-gray-900 font-semibold text-base">Loading orders...</p>
            </div>
          )}

          {/* Step: Select completed orders */}
          {eodStep === 'select' && (
            <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
              {/* Info header bar */}
              <div className="shrink-0 px-4 py-2 border-b" style={{ backgroundColor: '#faf6f0', borderColor: '#e5d9c4' }}>
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="select-all-eod" className="flex items-center gap-2 cursor-pointer">
                    <Checkbox 
                      id="select-all-eod" 
                      checked={yesterdayOrders.length > 0 && selectedCompleted.size === yesterdayOrders.length}
                      onCheckedChange={toggleSelectAll}
                      className="h-4 w-4"
                    />
                    <span className="text-xs font-bold" style={{ color: '#6f5535' }}>Select All</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="eod-badge-completed">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Completed: {selectedCompleted.size}
                    </div>
                    <div className="eod-badge-pending">
                      Pending: {yesterdayOrders.length - selectedCompleted.size}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable orders list */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-1.5 p-3">
                  {yesterdayOrders.map((order) => {
                    const isChecked = selectedCompleted.has(order.id);
                    return (
                      <div
                        key={order.id}
                        onClick={() => toggleOrderCompleted(order.id)}
                        className={`relative border rounded-lg p-2.5 cursor-pointer transition-all duration-200 select-none ${
                          isChecked 
                            ? 'bg-green-50 border-green-300 shadow-sm' 
                            : 'bg-white hover:shadow-sm eod-row-pending'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 justify-between">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleOrderCompleted(order.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 mt-0.5 flex-shrink-0"
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <h4 className="font-bold text-sm text-gray-900">#{order.id}</h4>
                              </div>

                              <div className="text-xs space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <User className="h-3 w-3 flex-shrink-0" style={{ color: '#8b6f47' }} />
                                  <span className="font-medium truncate">{order.customer_name}</span>
                                </div>
                                <div className="flex items-center gap-1 text-gray-600 flex-wrap">
                                  <span className="eod-tag-weight">
                                    ⚖️ {parseFloat(order.total_weight_kg || 0).toFixed(1)} kg
                                  </span>
                                  <span className="eod-tag-time">
                                    ⏱️ {order.processing_time_minutes || '~'} min
                                  </span>
                                  {!isChecked && (
                                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded text-nowrap" style={{ color: '#6f5535', backgroundColor: '#faf6f0' }}>
                                      Rs. {parseInt(order.total_amount || 0).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!isChecked && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleOrderCompleted(order.id);
                                }}
                                className="eod-btn-done"
                                title="Mark as completed"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                Done
                              </button>
                            )}
                            {isChecked && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleOrderCompleted(order.id);
                                }}
                                className="eod-btn-undo"
                                title="Mark as pending"
                              >
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Undo
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {yesterdayOrders.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
                      <p className="font-bold text-sm">All Clear!</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Action footer */}
              <div className="shrink-0 border-t p-3 space-y-2.5" style={{ borderColor: '#e5d9c4', background: 'linear-gradient(to right, #faf6f0, #f5ede3)' }}>
                <button 
                  className="eod-btn-confirm" 
                  onClick={handleProcessEodSelection}
                  disabled={isProcessingEod}
                >
                  {isProcessingEod ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Processing...</>
                  ) : (
                    <><ArrowRight className="h-4 w-4 mr-1.5" /> Confirm & Process</>
                  )}
                </button>
                <p className="text-[11px] text-gray-700 text-center font-semibold">
                  ✓ {selectedCompleted.size} done • {yesterdayOrders.length - selectedCompleted.size} to queue
                </p>
              </div>
            </div>
          )}

          {/* Step: Processing */}
          {eodStep === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full p-3 mb-3" style={{ backgroundColor: '#f5ede3' }}>
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#8b6f47' }} />
              </div>
              <p className="text-gray-900 font-semibold text-sm">Processing...</p>
            </div>
          )}

          {/* Step: Done */}
          {eodStep === 'done' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-green-100 rounded-full p-3 mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-gray-900 font-semibold text-sm">Done! Redirecting...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}





