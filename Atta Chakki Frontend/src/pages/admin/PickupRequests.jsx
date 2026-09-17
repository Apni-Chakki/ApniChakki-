import { Loader2 } from 'lucide-react';
import { Pagination } from '../../components/common/Pagination';
import { CancelOrderModal } from '../../components/shared/CancelOrderModal';
import { usePickupRequests } from '../../components/features/admin/pickupRequests/usePickupRequests';
import { PickupRequestsHeader } from '../../components/features/admin/pickupRequests/PickupRequestsHeader';
import { PickupEmptyState } from '../../components/features/admin/pickupRequests/PickupEmptyState';
import { PickupRequestsMobileCard } from '../../components/features/admin/pickupRequests/PickupRequestsMobileCard';
import { PickupRequestsTable } from '../../components/features/admin/pickupRequests/PickupRequestsTable';
import { PickupWeightModal } from '../../components/features/admin/pickupRequests/PickupWeightModal';

export function PickupRequests() {
  const {
    orders,
    loading,
    activePersonnel,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    cancelOrder,
    setCancelOrder,
    cancelReason,
    setCancelReason,
    isCancelling,
    handleCancelOrder,
    handleAssignPersonnel,
    showWeightModal,
    selectedOrder,
    weightInputs,
    isSavingWeights,
    handleArrivedAtShop,
    handleWeightChange,
    calcLiveTotal,
    handleSaveWeights,
    handleCloseWeightModal,
  } = usePickupRequests();

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PickupRequestsHeader totalItems={totalItems} />

      {totalItems === 0 ? (
        <PickupEmptyState />
      ) : (
        <>
          {/* Mobile card view (below md) */}
          <div className="md:hidden space-y-3">
            {orders.map((order) => (
              <PickupRequestsMobileCard
                key={order.id}
                order={order}
                activePersonnel={activePersonnel}
                onAssignPersonnel={handleAssignPersonnel}
                onCancelClick={setCancelOrder}
                onArrivedAtShop={handleArrivedAtShop}
              />
            ))}
          </div>

          {/* Desktop table (md and up) */}
          <PickupRequestsTable
            orders={orders}
            activePersonnel={activePersonnel}
            onAssignPersonnel={handleAssignPersonnel}
            onCancelClick={setCancelOrder}
            onArrivedAtShop={handleArrivedAtShop}
          />

          {/* Pagination */}
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
        </>
      )}

      {/* Cancel / Reject Modal */}
      <CancelOrderModal
        cancelOrder={cancelOrder}
        setCancelOrder={setCancelOrder}
        cancelReason={cancelReason}
        setCancelReason={setCancelReason}
        handleCancelOrder={handleCancelOrder}
        isCancelling={isCancelling}
        title={`Cancel/Reject Pickup Request #${cancelOrder?.id || ''}`}
        description={`Order #${cancelOrder?.id || ''} — Please provide a reason. This is mandatory and will be sent to the customer.`}
        placeholder="Cancellation reason (mandatory)..."
        cancelText="Keep Request"
        confirmText="Reject Request"
        requireReason={true}
      />

      {/* Actual Weight Update Modal */}
      <PickupWeightModal
        open={showWeightModal}
        onClose={handleCloseWeightModal}
        selectedOrder={selectedOrder}
        weightInputs={weightInputs}
        onWeightChange={handleWeightChange}
        liveTotal={calcLiveTotal()}
        onSaveWeights={handleSaveWeights}
        isSaving={isSavingWeights}
      />
    </div>
  );
}
