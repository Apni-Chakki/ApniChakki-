import React from 'react';
import { Package } from 'lucide-react';
import { useTrackOrder } from '../../components/features/customer/trackOrder/useTrackOrder';
import { TrackOrderLoginPrompt } from '../../components/features/customer/trackOrder/TrackOrderLoginPrompt';
import { TrackOrderHero } from '../../components/features/customer/trackOrder/TrackOrderHero';
import { TrackOrderCard } from '../../components/features/customer/trackOrder/TrackOrderCard';
import { CancelOrderModal } from '../../components/shared/CancelOrderModal';

export function TrackOrder() {
  const {
    user,
    t,
    orderId,
    setOrderId,
    orders,
    expandedOrderId,
    setExpandedOrderId,
    notFound,
    loading,
    currentSlide,
    handleSearch,
    cancelOrder,
    setCancelOrder,
    cancelReason,
    setCancelReason,
    isCancelling,
    handleCancelOrder,
  } = useTrackOrder();

  if (!user) {
    return <TrackOrderLoginPrompt currentSlide={currentSlide} />;
  }

  return (
    <>
      <TrackOrderHero
        currentSlide={currentSlide}
        orderId={orderId}
        setOrderId={setOrderId}
        loading={loading}
        notFound={notFound}
        onSearch={handleSearch}
      />

      {orders.length > 0 && (
        <div className="py-8 px-4 sm:px-6 bg-slate-50">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-slate-800">
                {t('Found')} {orders.length} {orders.length === 1 ? t('Order') : t('Orders')}
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {orders.map((order) => (
                <TrackOrderCard
                  key={order.id}
                  order={order}
                  isExpanded={expandedOrderId === order.id}
                  onToggleExpand={() =>
                    setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                  }
                  onCancelClick={setCancelOrder}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <CancelOrderModal
        cancelOrder={cancelOrder}
        setCancelOrder={setCancelOrder}
        cancelReason={cancelReason}
        setCancelReason={setCancelReason}
        handleCancelOrder={handleCancelOrder}
        isCancelling={isCancelling}
        t={t}
      />
    </>
  );
}
