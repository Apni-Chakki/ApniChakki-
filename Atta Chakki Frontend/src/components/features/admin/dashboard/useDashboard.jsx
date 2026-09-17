import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Package, AlertTriangle, DollarSign, ShoppingBag, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { API_BASE_URL } from '../../../../config';

export function useDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    completedToday: 0,
    tomorrowScheduled: 0,
  });

  const [allTimeStats, setAllTimeStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    completedOrders: 0,
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

  const fetchYesterdayOrders = async () => {
    setLoadingYesterday(true);
    try {
      const response = await fetch(`${API_BASE_URL}/get_yesterday_pending.php`);
      const data = await response.json();
      if (data.success) {
        setYesterdayOrders(data.orders || []);
        setEodStep('select');
      } else {
        toast.error("Failed to load yesterday's orders");
        setEodStep('select');
      }
    } catch (error) {
      console.error('Error fetching yesterday orders:', error);
      toast.error('Network error loading orders');
      setEodStep('select');
    } finally {
      setLoadingYesterday(false);
    }
  };

  const checkEodStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/check_eod_status.php`);
      const data = await response.json();
      if (data.success && data.has_leftover) {
        setEodData(data);
        setShowEodModal(true);
        setEodStep('loading');
        fetchYesterdayOrders();
      }
    } catch (error) {
      console.error('Failed to check EOD status:', error);
    }
  }, []);

  const fetchStats = useCallback(async () => {
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
          tomorrowScheduled: Number(data.data.tomorrowScheduled) || 0,
        });

        if (data.stats) {
          setAllTimeStats({
            totalOrders: Number(data.stats.totalOrders) || 0,
            totalRevenue: Number(data.stats.totalRevenue) || 0,
            totalCustomers: Number(data.stats.totalCustomers) || 0,
            completedOrders: Number(data.stats.completedOrders) || 0,
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
              onClick: () => navigate('/admin/inventory'),
            },
          });
        }
      }
    } catch (error) {
      console.error('API Error:', error);
      toast.error('Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchStats();
    checkEodStatus();
  }, [fetchStats, checkEodStatus]);

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
                  onClick: () => navigate('/admin/pickup-requests'),
                },
              });
            }
          });
        }
      } catch (error) {
        console.error('Error polling pickup requests:', error);
      }
    };

    checkArrivedOrders();
    const interval = setInterval(checkArrivedOrders, 10000);
    return () => clearInterval(interval);
  }, [navigate]);

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
          completed_order_ids: Array.from(selectedCompleted),
        }),
      });
      const data = await response.json();
      if (data.success) {
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
      console.error('EOD selection error:', error);
      toast.error('Network error during processing');
      setEodStep('select');
    } finally {
      setIsProcessingEod(false);
    }
  };

  const handleEodAction = async (actionType) => {
    setIsProcessingEod(true);
    try {
      const response = await fetch(`${API_BASE_URL}/process_rollover.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: actionType }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('EOD Rollover completed successfully! (Auto-Filled & Rescheduled)');
        setShowEodModal(false);
        fetchStats();
      } else {
        toast.error(data.message || 'Failed to process rollover');
      }
    } catch (error) {
      console.error('Rollover error:', error);
      toast.error('Network error during rollover');
    } finally {
      setIsProcessingEod(false);
    }
  };

  const statCards = [
    { id: 'revenue', title: "Today's Revenue", value: `Rs. ${stats.todayRevenue.toLocaleString()}`, icon: DollarSign, iconBg: '#ECFDF5', iconColor: '#059669' },
    { id: 'orders', title: "Today's Orders", value: stats.todayOrders, icon: ShoppingBag, iconBg: '#FEF3C7', iconColor: '#B45309' },
    { id: 'completed', title: 'Completed Today', value: stats.completedToday, icon: CheckCircle, iconBg: '#F0FDFA', iconColor: '#0D9488' },
    { id: 'pending', title: 'Pending (New)', value: stats.pendingOrders, icon: Clock, iconBg: '#FFFFFF', iconColor: '#BE123C' },
    { id: 'progress', title: 'In Progress', value: stats.processingOrders, icon: Package, iconBg: '#F5F3FF', iconColor: '#7C3AED' },
    { id: 'tomorrow', title: 'Tomorrow Scheduled', value: stats.tomorrowScheduled, icon: TrendingUp, iconBg: '#EFF6FF', iconColor: '#2563EB' },
  ];

  const allTimeCards = [
    { title: 'Total Revenue', value: `Rs. ${allTimeStats.totalRevenue.toLocaleString()}`, subtitle: 'Lifetime cumulative', featured: true },
    { title: 'Total Orders All-Time', value: allTimeStats.totalOrders, subtitle: '↑ 12% growth', subtitleClass: 'text-emerald-600 font-semibold' },
    { title: 'Total Registered Customers', value: allTimeStats.totalCustomers, subtitle: 'Verified profiles' },
    { title: 'Total Completed Orders', value: allTimeStats.completedOrders, subtitle: 'Successful fulfillment' },
  ];

  return {
    isLoading,
    stats,
    allTimeStats,
    overdueOrdersCount,
    lowStockCount,
    lowStockItems,
    statCards,
    allTimeCards,
    fetchStats,
    eodData,
    showEodModal,
    setShowEodModal,
    isProcessingEod,
    yesterdayOrders,
    selectedCompleted,
    eodStep,
    setEodStep,
    setSelectedCompleted,
    toggleOrderCompleted,
    toggleSelectAll,
    handleProcessEodSelection,
    handleEodAction,
  };
}

export default useDashboard;

