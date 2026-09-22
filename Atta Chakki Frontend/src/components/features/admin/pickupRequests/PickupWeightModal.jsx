import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../../../common/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle as DialogTitleText,
  DialogDescription,
  DialogFooter,
} from '../../../common/dialog';

export function PickupWeightModal({
  open,
  onClose,
  selectedOrder,
  weightInputs,
  onWeightChange,
  liveTotal,
  onSaveWeights,
  isSaving,
}) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitleText>⚖️ Update Actual Weights</DialogTitleText>
          <DialogDescription>
            Order #{selectedOrder?.id} — Enter the actual weight in <strong>kg</strong> for each item.{' '}
            Bill will be calculated automatically based on current price.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Column Headers */}
          <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-muted-foreground border-b pb-2">
            <span>Item</span>
            <span className="text-center">Price/kg</span>
            <span className="text-center">Weight (kg)</span>
            <span className="text-right">Line Total</span>
          </div>

          {selectedOrder && selectedOrder.items && selectedOrder.items.length > 0 ? (
            selectedOrder.items.map((it) => {
              const kg = parseFloat(weightInputs[it.id] || 0);
              const pricePerKg = parseFloat(it.price_per_kg || 0);
              const lineTotal = kg * pricePerKg;

              return (
                <div key={it.id} className="grid grid-cols-4 gap-2 items-center">
                  {/* Item Name */}
                  <div>
                    <div className="font-medium text-sm">{it.name || `Item #${it.product_id}`}</div>
                    <div className="text-xs text-muted-foreground">Unit: {it.unit || 'trip'}</div>
                  </div>

                  {/* Price per kg */}
                  <div className="text-center text-sm font-semibold text-primary">
                    Rs. {pricePerKg.toLocaleString()}
                  </div>

                  {/* Weight Input (in kg) */}
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="0.0"
                      value={weightInputs[it.id] ?? ''}
                      onChange={(e) => onWeightChange(it.id, e.target.value)}
                      className="w-full border rounded px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Line Total */}
                  <div className={`text-right text-sm font-bold ${lineTotal > 0 ? 'text-green-700' : 'text-muted-foreground'}`}>
                    {lineTotal > 0
                      ? `Rs. ${lineTotal.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                      : '—'}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-muted-foreground py-4">No items found for this order.</div>
          )}

          {/* Subtotal & Delivery Fee Breakdown */}
          {parseFloat(selectedOrder?.delivery_fee || 0) > 0 && liveTotal > 0 && (
            <div className="border-t pt-2 space-y-1 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Items Subtotal</span>
                <span>
                  Rs. {Math.max(0, liveTotal - parseFloat(selectedOrder.delivery_fee)).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Delivery Fee</span>
                <span className="text-emerald-700 font-semibold">
                  + Rs. {parseFloat(selectedOrder.delivery_fee).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          )}

          {/* Grand Total */}
          <div className="border-t pt-3 flex items-center justify-between">
            <span className="font-semibold text-sm">Estimated Total Bill</span>
            <span className="text-xl font-bold text-primary">
              Rs. {liveTotal.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>

          <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded p-2">
            ⚡ After saving, this order will be automatically scheduled and moved to Today's Work or Tomorrow's List.
          </p>
        </div>

        <DialogFooter>
          <div className="flex w-full gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={onSaveWeights}
              disabled={isSaving || liveTotal === 0}
              className="gap-2"
            >
              {isSaving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <>💾 Save & Schedule (Rs. {liveTotal.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
