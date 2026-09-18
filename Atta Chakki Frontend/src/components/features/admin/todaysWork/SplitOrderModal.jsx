import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../common/dialog';
import { Button } from '../../../common/button';
import { Input } from '../../../common/input';
import { Label } from '../../../common/label';
import { SplitSquareHorizontal, AlertTriangle, Trash2, Calendar, Weight, Package, Loader2 } from 'lucide-react';

export function SplitOrderModal({
  splitOrder,
  closeSplitModal,
  splitBatches,
  setSplitBatches,
  handleSplitOrder,
  isSplitting,
}) {
  return (
    <Dialog open={!!splitOrder} onOpenChange={closeSplitModal}>
      <DialogContent className="max-w-md p-0 gap-0 [&>button]:top-5 [&>button]:right-5">
        {/* Header */}
        <div className="p-6 pb-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SplitSquareHorizontal className="h-5 w-5 text-blue-600" />
              Heavy Order Split — #{splitOrder?.id}
            </DialogTitle>
            <DialogDescription>
              Order weight: <strong>{parseFloat(splitOrder?.total_weight_kg || splitOrder?.weightKg || 0).toFixed(1)} kg</strong>.
              Split into multiple processing batches.
            </DialogDescription>
          </DialogHeader>

          {/* Warning Banner */}
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800 mt-4">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              <strong>Note:</strong> Bill will be available only after <strong>all batches</strong> are completed.
            </p>
          </div>
        </div>

        {/* Scrollable Batches Area */}
        <div className="px-6 py-2 scroll-modal-compact">
          <div className="space-y-3">
            {splitBatches.map((batch, idx) => (
              <div key={batch.id} className="relative bg-slate-50 p-4 rounded-xl border border-slate-200 transition-all hover:border-blue-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Batch Details</span>
                  </div>

                  {splitBatches.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => setSplitBatches(splitBatches.filter(b => b.id !== batch.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <Input
                        type="date"
                        value={batch.date}
                        className="pl-9 h-9 bg-white text-sm"
                        onChange={(e) => {
                          const newB = [...splitBatches];
                          newB[idx].date = e.target.value;
                          setSplitBatches(newB);
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Weight (kg)</Label>
                    <div className="relative">
                      <Weight className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <Input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={batch.weight}
                        className="pl-9 h-9 bg-white text-sm"
                        onChange={(e) => {
                          const newB = [...splitBatches];
                          newB[idx].weight = e.target.value;
                          setSplitBatches(newB);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pb-2">
            <Button
              variant="outline"
              className="w-full border-dashed border-2 border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all h-10"
              onClick={() => {
                const lastDate = new Date(splitBatches[splitBatches.length - 1].date);
                lastDate.setDate(lastDate.getDate() + 1);
                setSplitBatches([...splitBatches, {
                  id: Date.now(),
                  date: lastDate.toISOString().slice(0, 10),
                  weight: ''
                }]);
              }}
            >
              <Package className="h-4 w-4 mr-2" /> Add Another Batch
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 bg-slate-50/50 border-t">
          {/* Live total check */}
          {splitOrder && (() => {
            const total = parseFloat(splitOrder.total_weight_kg || splitOrder.weightKg || 0);
            const sum = splitBatches.reduce((acc, curr) => acc + (parseFloat(curr.weight) || 0), 0);
            const diff = Math.abs(sum - total);
            const ok = diff <= 0.5;
            return total > 0 ? (
              <div className={`text-xs font-medium rounded px-3 py-2 mb-4 ${ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                {ok
                  ? `✅ Total: ${sum.toFixed(1)} kg — Valid!`
                  : `⚠️ Total: ${sum.toFixed(1)} kg (Expected ~${total} kg) — Mismatch`}
              </div>
            ) : null;
          })()}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={closeSplitModal} disabled={isSplitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSplitOrder}
              disabled={isSplitting}
              className="bg-blue-600 hover:bg-blue-700 font-semibold"
            >
              {isSplitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Splitting...</>
              ) : (
                <><SplitSquareHorizontal className="h-4 w-4 mr-2" /> Split Order</>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}