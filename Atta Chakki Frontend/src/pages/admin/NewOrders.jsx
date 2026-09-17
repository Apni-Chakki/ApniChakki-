import React from 'react';
import { Loader2 } from 'lucide-react';
import { TooltipProvider } from '../../components/common/tooltip';
import { Pagination } from '../../components/common/Pagination';
import { OrdersTable } from './OrdersTable';
import { CancelOrderModal } from '../../components/features/admin/todaysWork/CancelOrderModal';
import { SplitOrderModal } from '../../components/features/admin/todaysWork/SplitOrderModal';
import { useNewOrders } from '../../components/features/admin/newOrders/useNewOrders';
import { NewOrdersHeader } from '../../components/features/admin/newOrders/NewOrdersHeader';
import { NewOrderActions } from '../../components/features/admin/newOrders/NewOrderActions';

export function NewOrders() {
  const {
    orders,
    loading,
    activePersonnel,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    heavyThreshold,
    overrideOrderSchedule,
    handleAssignPersonnel,
    splitOrder,
    splitBatches,
    setSplitBatches,
    isSplitting,
    openSplitModal,
    closeSplitModal,
    handleSplitOrder,
    cancelOrder,
    setCancelOrder,
    cancelReason,
    setCancelReason,
    isCancelling,
    handleCancelOrder,
  } = useNewOrders();

  if (loading && orders.length === 0) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="animate-spin h-8 w-8 mx-auto" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div>
        <NewOrdersHeader totalItems={totalItems} heavyThreshold={heavyThreshold} />

        <OrdersTable
          orders={orders}
          actions={(order) => (
            <NewOrderActions
              order={order}
              heavyThreshold={heavyThreshold}
              activePersonnel={activePersonnel}
              onOpenSplitModal={openSplitModal}
              onAssignPersonnel={handleAssignPersonnel}
              onOverrideSchedule={overrideOrderSchedule}
              onCancelOrder={setCancelOrder}
            />
          )}
        />

        {totalItems > 0 && (
          <Pagination
            currentPage={page}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
            className="mt-4"
          />
        )}

        {/* Cancel Order Dialog */}
        <CancelOrderModal
          cancelOrder={cancelOrder}
          setCancelOrder={setCancelOrder}
          cancelReason={cancelReason}
          setCancelReason={setCancelReason}
          handleCancelOrder={handleCancelOrder}
          isCancelling={isCancelling}
        />

        {/* Split Order Modal */}
        <SplitOrderModal
          splitOrder={splitOrder}
          closeSplitModal={closeSplitModal}
          splitBatches={splitBatches}
          setSplitBatches={setSplitBatches}
          handleSplitOrder={handleSplitOrder}
          isSplitting={isSplitting}
        />
      </div>
    </TooltipProvider>
  );
}
