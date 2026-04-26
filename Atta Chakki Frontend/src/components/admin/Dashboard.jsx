import { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { ShoppingBag, Clock, CheckCircle, TrendingUp, DollarSign, Package, AlertTriangle, Users, AlertCircle, RefreshCcw, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../ui/skeleton';
import { API_BASE_URL } from '../../config'; 
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { toast } from 'sonner';
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

  // EOD State
  const [eodData, setEodData] = useState(null);
  const [showEodModal, setShowEodModal] = useState(false);
  const [isProcessingEod, setIsProcessingEod] = useState(false);

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
      }
    } catch (error) {
      console.error("Failed to check EOD status:", error);
    }
  };

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
        toast.success(`EOD Rollover completed successfully! (${actionType === 'keep_priority' ? 'Priority Kept' : 'Auto-Filled'})`);
        setShowEodModal(false);
        fetchStats(); // Refresh dashboard stats
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

      {/* EOD Rollover Modal */}
      <Dialog open={showEodModal} onOpenChange={(open) => {
        // Prevent closing by clicking outside if we want to force a decision
        if (!isProcessingEod && open === false) {
           // We might want to allow them to close it, or force them.
           // For now, let's allow closing to not completely block the admin if they misclicked.
           // Or strictly block them: uncomment below line to strictly block.
           // return; 
           setShowEodModal(false);
        }
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-orange-600 flex items-center gap-2">
              <AlertCircle className="h-6 w-6" />
              End of Day (EOD) Rollover Required
            </DialogTitle>
            <DialogDescription className="text-base text-gray-700 mt-4">
              You have <strong>{eodData?.leftover_count} pending order(s)</strong> left over from previous days 
              (Total Weight: {eodData?.leftover_total_weight_kg} kg, Est. Processing: {eodData?.leftover_total_minutes} mins).
              <br/><br/>
              How would you like to handle today's schedule?
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
            <div className="border rounded-xl p-4 bg-orange-50/50 hover:bg-orange-50 transition-colors">
              <h3 className="font-bold text-orange-800 text-lg mb-2">Option A: Keep Priority</h3>
              <p className="text-sm text-gray-600 mb-4">
                Carry forward yesterday's pending orders to today, making them the first priority. Today's scheduled orders will be delayed accordingly.
              </p>
              <Button 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white" 
                onClick={() => handleEodAction('keep_priority')}
                disabled={isProcessingEod}
              >
                {isProcessingEod ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                Select Option A
              </Button>
            </div>

            <div className="border rounded-xl p-4 bg-blue-50/50 hover:bg-blue-50 transition-colors">
              <h3 className="font-bold text-blue-800 text-lg mb-2">Option B: Auto-Fill & Reschedule</h3>
              <p className="text-sm text-gray-600 mb-4">
                Push the leftover orders into tomorrow's list. Automatically pull fresh orders from tomorrow's queue to fill today's available capacity.
              </p>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                onClick={() => handleEodAction('auto_fill')}
                disabled={isProcessingEod}
              >
                {isProcessingEod ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                Select Option B
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center">
            * Capacity is calculated based on Store Settings ({eodData?.opening_time} to {eodData?.closing_time}).
          </p>
        </DialogContent>
      </Dialog>

    </div>
  );
}
