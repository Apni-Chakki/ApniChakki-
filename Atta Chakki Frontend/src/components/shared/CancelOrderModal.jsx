import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../common/dialog';
import { Button } from '../common/button';
import { Textarea } from '../common/textarea';
import { AlertCircle, Loader2 } from 'lucide-react';

export function CancelOrderModal({
  cancelOrder,
  setCancelOrder,
  cancelReason,
  setCancelReason,
  handleCancelOrder,
  isCancelling,
  title,
  description,
  placeholder,
  cancelText,
  confirmText,
  requireReason = false,
  t = (s) => s,
}) {
  const handleConfirm = () => {
    handleCancelOrder();
  };

  const handleClose = () => {
    if (setCancelOrder) setCancelOrder(null);
    if (setCancelReason) setCancelReason('');
  };

  return (
    <Dialog open={!!cancelOrder} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive text-base">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {title || `${t('Cancel Order')} #${cancelOrder?.id || ''}`}
          </DialogTitle>
          <DialogDescription>
            {description || t('Are you sure you want to cancel this order? This action cannot be undone.')}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder={placeholder || (requireReason ? t('Cancellation reason (mandatory)...') : t('Optional: Reason for cancellation...'))}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          className="min-h-[100px] resize-none"
        />
        <DialogFooter className="flex flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
            onClick={handleClose}
            disabled={isCancelling}
          >
            {cancelText || t('Keep Order')}
          </Button>
          <Button
            className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
            onClick={handleConfirm}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin text-white" />
                {t('Cancelling...')}
              </>
            ) : (
              confirmText || t('Yes, Cancel Order')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CancelOrderModal;
