import React from 'react';
import useDashboard from '@/components/features/admin/dashboard/useDashboard';
import DashboardHeader from '@/components/features/admin/dashboard/DashboardHeader';
import DashboardAlerts from '@/components/features/admin/dashboard/DashboardAlerts';
import TodayPulseGrid from '@/components/features/admin/dashboard/TodayPulseGrid';
import AllTimeStatsGrid from '@/components/features/admin/dashboard/AllTimeStatsGrid';
import EodRolloverModal from '@/components/features/admin/dashboard/EodRolloverModal';

export function Dashboard() {
  const {
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
  } = useDashboard();

  return (
    <div className="space-y-10 pb-16">
      <DashboardHeader isLoading={isLoading} onRefresh={fetchStats} />

      <DashboardAlerts
        isLoading={isLoading}
        lowStockCount={lowStockCount}
        lowStockItems={lowStockItems}
        overdueOrdersCount={overdueOrdersCount}
      />

      <TodayPulseGrid isLoading={isLoading} statCards={statCards} stats={stats} />

      <AllTimeStatsGrid isLoading={isLoading} allTimeCards={allTimeCards} />

      <EodRolloverModal
        showEodModal={showEodModal}
        setShowEodModal={setShowEodModal}
        isProcessingEod={isProcessingEod}
        eodStep={eodStep}
        setEodStep={setEodStep}
        setSelectedCompleted={setSelectedCompleted}
        eodData={eodData}
        yesterdayOrders={yesterdayOrders}
        selectedCompleted={selectedCompleted}
        toggleSelectAll={toggleSelectAll}
        toggleOrderCompleted={toggleOrderCompleted}
        handleProcessEodSelection={handleProcessEodSelection}
      />
    </div>
  );
}

export default Dashboard;

