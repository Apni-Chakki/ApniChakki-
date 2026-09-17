import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../config';

/**
 * Custom hook providing state and execution logic for cancelling an order.
 * Centralizes duplicate cancellation fetch calls across admin and customer pages.
 */
export function useCancelOrder({
  onSuccess,
  cancelledBy = 'Admin',
  enforceDateGuard = false,
  requireReason = false,
  t = (str) => str,
} = {}) {
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const resetCancelState = useCallback(() => {
    setCancelOrder(null);
    setCancelReason('');
  }, []);

  const handleCancelOrder = useCallback(
    async (overrideReason) => {
      if (!cancelOrder || isCancelling) return;

      const effectiveReason = (overrideReason !== undefined ? overrideReason : cancelReason)?.trim();

      if (requireReason && !effectiveReason) {
        toast.error(t('Please provide a cancellation reason.'));
        return;
      }

      // Check date guard for customer cancellations
      const shouldCheckDate = enforceDateGuard || cancelledBy === 'User' || cancelledBy === 'Customer';
      if (shouldCheckDate && cancelOrder.assignedDate) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (cancelOrder.assignedDate <= todayStr) {
          toast.error(t('Processing has started, this order cannot be cancelled now.'));
          resetCancelState();
          return;
        }
      }

      setIsCancelling(true);
      try {
        const response = await fetch(`${API_BASE_URL}/cancel_order.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: cancelOrder.id,
            reason: effectiveReason || 'No reason provided',
            cancelled_by: cancelledBy,
          }),
        });
        const result = await response.json();
        if (result.success) {
          toast.success(result.message || t('Order cancelled successfully'));
          const cancelledItem = cancelOrder;
          resetCancelState();
          if (onSuccess) {
            onSuccess(cancelledItem);
          }
        } else {
          toast.error(result.message || t('Failed to cancel order'));
        }
      } catch (error) {
        toast.error(t('Network error while cancelling order'));
      } finally {
        setIsCancelling(false);
      }
    },
    [cancelOrder, cancelReason, isCancelling, cancelledBy, enforceDateGuard, requireReason, t, onSuccess, resetCancelState]
  );

  return {
    cancelOrder,
    setCancelOrder,
    cancelReason,
    setCancelReason,
    isCancelling,
    handleCancelOrder,
    resetCancelState,
  };
}

export default useCancelOrder;
