import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/common/dialog';
import { Button } from '@/components/common/button';
import { Input } from '@/components/common/input';
import { Label } from '@/components/common/label';
import { Textarea } from '@/components/common/textarea';

export default function UpdateStockModal({
  showUpdateDialog,
  setShowUpdateDialog,
  selectedProduct,
  updateType,
  updateQuantity,
  setUpdateQuantity,
  updateNotes,
  setUpdateNotes,
  isUpdating,
  onUpdateStock
}) {
  return (
    <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
      <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            {updateType === 'add'
              ? 'Add Stock'
              : updateType === 'remove'
              ? 'Remove Stock'
              : 'Adjust Stock'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Update inventory for {selectedProduct?.productName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">Current Stock</p>
            <p className="text-xl sm:text-2xl font-bold break-all">
              {selectedProduct?.currentStock} {selectedProduct?.unit}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">
              {updateType === 'adjust' ? 'New Stock Level' : 'Quantity'} ({selectedProduct?.unit})
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={updateQuantity}
              onChange={(e) => setUpdateQuantity(e.target.value)}
              placeholder={updateType === 'adjust' ? 'Enter new stock level' : 'Enter quantity'}
              disabled={isUpdating}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Notes (Optional)</Label>
            <Textarea
              value={updateNotes}
              onChange={(e) => setUpdateNotes(e.target.value)}
              placeholder="Add any notes about this update..."
              rows={3}
              disabled={isUpdating}
              className="resize-none border border-input rounded-md bg-background focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0"
            />
          </div>

          {updateQuantity && selectedProduct && (
            <div className="p-3 sm:p-4 bg-muted rounded-lg">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">New Stock Level</p>
              <p className="text-lg sm:text-xl font-bold break-all">
                {updateType === 'add'
                  ? selectedProduct.currentStock + (parseFloat(updateQuantity) || 0)
                  : updateType === 'remove'
                  ? Math.max(0, selectedProduct.currentStock - (parseFloat(updateQuantity) || 0))
                  : parseFloat(updateQuantity) || 0}{' '}
                {selectedProduct.unit}
              </p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
            <Button
              variant="outline"
              disabled={isUpdating}
              onClick={() => {
                setShowUpdateDialog(false);
                setUpdateQuantity('');
                setUpdateNotes('');
              }}
              className="w-full sm:flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={onUpdateStock}
              disabled={isUpdating}
              className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-primary-foreground border-primary hover:border-primary"
            >
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isUpdating ? 'Updating...' : 'Update Inventory'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
