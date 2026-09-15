import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../common/dialog';
import { Button } from '../../../common/button';
import { Textarea } from '../../../common/textarea';
import { AlertCircle, Loader2 } from 'lucide-react';

export function CancelOrderModal({
  cancelOrder,
  setCancelOrder,
  cancelReason,
  setCancelReason,
  handleCancelOrder,
  isCancelling,
}) {
  return (
    <Dialog open={!!cancelOrder} onOpenChange={() => { setCancelOrder(null); setCancelReason(''); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive text-base">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Cancel Order #{cancelOrder?.id}
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this order? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Optional: Reason for cancellation..."
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          className="min-h-[100px] resize-none"
        />
        <DialogFooter className="flex flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
            onClick={() => { setCancelOrder(null); setCancelReason(''); }}
            disabled={isCancelling}
          >
            Keep Order
          </Button>
          <Button
            className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
            onClick={handleCancelOrder}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin text-white" />
                Cancelling...
              </>
            ) : (
              'Yes, Cancel Order'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}