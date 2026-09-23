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
  const allItems = selectedOrder?.items || [];
  const grainItems = allItems.filter(
    (it) => it.is_weight_pending === 1 || it.is_weight_pending === '1' || it.unit === 'trip'
  );
  const deliveredItems = allItems.filter(
    (it) => !(it.is_weight_pending === 1 || it.is_weight_pending === '1' || it.unit === 'trip')
  );

  // If there are specific grain items, show only those. Otherwise fallback to allItems.
  const displayItems = grainItems.length > 0 ? grainItems : allItems;

  // Calculate subtotals
  const deliveredSubtotal = deliveredItems.reduce((sum, it) => {
    const qty = parseFloat(it.quantity || 1);
    const price = parseFloat(it.price_at_purchase || it.price_per_kg || 0);
    return sum + (qty * price);
  }, 0);

  const grainSubtotal = displayItems.reduce((sum, it) => {
    const kg = parseFloat(weightInputs[it.id] || 0);
    const price = parseFloat(it.price_per_kg || it.price_at_purchase || 0);
    return sum + (kg * price);
  }, 0);

  const deliveryFee = parseFloat(selectedOrder?.delivery_fee || 0);
  const calculatedGrandTotal = deliveredSubtotal + grainSubtotal + deliveryFee;

  const hasUnenteredWeight = displayItems.some(
    (it) => !weightInputs[it.id] || parseFloat(weightInputs[it.id]) <= 0
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitleText>⚖️ Update Actual Weights</DialogTitleText>
          <DialogDescription>
            Order #{selectedOrder?.id} — Enter the actual weight in <strong>kg</strong> for each collected grain item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Column Headers */}
          <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-muted-foreground border-b pb-2">
            <span>Grain Item</span>
            <span className="text-center">Price/kg</span>
            <span className="text-center">Weight (kg)</span>
            <span className="text-right">Line Total</span>
          </div>

          {displayItems.length > 0 ? (
            displayItems.map((it) => {
              const pricePerKg = parseFloat(it.price_per_kg || it.price_at_purchase || 0);
              const kg = parseFloat(weightInputs[it.id] || 0);
              const lineTotal = kg * pricePerKg;

              return (
                <div key={it.id} className="grid grid-cols-4 gap-2 items-center py-2.5 border-b border-gray-100 last:border-b-0">
                  {/* Item Name */}
                  <div>
                    <div className="font-semibold text-sm text-gray-900 truncate" title={it.name || `Item #${it.product_id}`}>
                      {it.name || `Item #${it.product_id}`}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        🌾 Grain (Weigh)
                      </span>
                    </div>
                  </div>

                  {/* Price per unit/kg */}
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
                      className="w-full border rounded-lg px-2 py-1.5 text-center text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary border-amber-300 bg-amber-50/50 shadow-inner"
                      autoFocus
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
            <div className="text-center text-muted-foreground py-4">No grain items found for this order.</div>
          )}

          {/* Subtotal & Delivery Fee Breakdown */}
          <div className="border-t pt-2.5 space-y-1.5 text-xs bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
            {deliveredItems.length > 0 && (
              <div className="flex items-center justify-between text-slate-600">
                <span>
                  Delivered Items Subtotal ({deliveredItems.length} {deliveredItems.length === 1 ? 'item' : 'items'})
                </span>
                <span className="font-semibold text-slate-800">
                  Rs. {deliveredSubtotal.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-slate-600">
              <span>Grain Items Subtotal</span>
              <span className="font-semibold text-slate-800">
                {grainSubtotal > 0
                  ? `Rs. ${grainSubtotal.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                  : 'TBD (Enter Weight)'}
              </span>
            </div>

            {deliveryFee > 0 && (
              <div className="flex items-center justify-between text-slate-600">
                <span>Delivery Fee</span>
                <span className="text-emerald-700 font-semibold">
                  + Rs. {deliveryFee.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            )}
          </div>

          {/* Grand Total */}
          <div className="border-t pt-3 flex items-center justify-between">
            <div>
              <span className="font-semibold text-sm text-slate-900 block">Total Final Bill</span>
              {hasUnenteredWeight && (
                <span className="text-[11px] text-amber-600 font-medium">Pending grain weight</span>
              )}
            </div>
            <span className="text-xl font-extrabold text-primary">
              Rs. {calculatedGrandTotal.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              {hasUnenteredWeight && <span className="text-xs font-normal text-muted-foreground ml-1">(+ TBD)</span>}
            </span>
          </div>

          <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded p-2">
            ⚡ After saving weights, this order will proceed to Grinding and automatically be scheduled into the processing queue.
          </p>
        </div>

        <DialogFooter>
          <div className="flex w-full gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={onSaveWeights}
              disabled={isSaving || hasUnenteredWeight}
              className="gap-2 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white"
            >
              {isSaving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <>💾 Save & Schedule (Rs. {calculatedGrandTotal.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
