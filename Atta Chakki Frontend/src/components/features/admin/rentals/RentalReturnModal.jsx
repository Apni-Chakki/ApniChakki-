import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../common/dialog';
import { Button } from '../../../common/button';
import { Label } from '../../../common/label';
import { Textarea } from '../../../common/textarea';
import {
  ArrowDownCircle,
  AlertTriangle,
  CheckCircle,
  Loader2,
  PackageCheck,
  Coins,
  ShieldAlert,
} from 'lucide-react';
import { getOverdueDays } from './rentalUtils';
import {
  SettlementStepper,
  LostItemBreakdown,
  NormalReturnBreakdown,
} from './RentalReturnBreakdown';

export function RentalReturnModal({
  rental,
  onClose,
  returnNotes,
  setReturnNotes,
  onConfirmReturn,
  isReturning,
}) {
  if (!rental) return null;

  return (
    <Dialog open={!!rental} onOpenChange={(open) => { if (!open) onClose(); }}>
      <RentalReturnModalContent
        key={rental.id}
        rental={rental}
        onClose={onClose}
        returnNotes={returnNotes}
        setReturnNotes={setReturnNotes}
        onConfirmReturn={onConfirmReturn}
        isReturning={isReturning}
      />
    </Dialog>
  );
}

function RentalReturnModalContent({
  rental,
  onClose,
  returnNotes,
  setReturnNotes,
  onConfirmReturn,
  isReturning,
}) {
  const [settlementMode, setSettlementMode] = useState('return'); // 'return' | 'lost'
  const [amountCollected, setAmountCollected] = useState('');

  const totalQty = parseInt(rental?.quantity || 1, 10);
  const alreadyReturned = parseInt(rental?.returned_quantity || 0, 10);
  const remainingQty = Math.max(1, totalQty - alreadyReturned);

  const [returnedQty, setReturnedQty] = useState(remainingQty);

  const handleQtyChange = (val) => {
    if (val === '') {
      setReturnedQty('');
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setReturnedQty(Math.min(remainingQty, Math.max(0, num)));
    }
  };

  const handleBlur = () => {
    if (!returnedQty || returnedQty < 1) {
      setReturnedQty(1);
    }
  };

  const safeQty = Math.max(1, Math.min(remainingQty, parseInt(returnedQty || 1, 10)));
  const overdueDays = getOverdueDays(rental);
  const penalty = overdueDays * parseFloat(rental.late_penalty_per_day || 0);
  const unitDeposit = parseFloat(rental.security_deposit || 0);
  const depositSubtotal = unitDeposit * safeQty;
  const refund = Math.max(0, depositSubtotal - penalty);

  const safeExtraCollected = Math.max(0, parseFloat(amountCollected || 0));
  const totalStoreRecovery = depositSubtotal + safeExtraCollected;

  const handleSubmit = () => {
    if (settlementMode === 'lost') {
      onConfirmReturn({
        returned_quantity: safeQty,
        is_lost: true,
        amount_collected: safeExtraCollected,
      });
    } else {
      onConfirmReturn({
        returned_quantity: safeQty,
        is_lost: false,
        amount_collected: 0,
      });
    }
  };

  return (
    <DialogContent className="max-w-md max-h-[88vh] flex flex-col p-4 sm:p-5 gap-0 overflow-hidden">
      <DialogHeader className="pb-2 border-b border-slate-100 shrink-0">
        <DialogTitle className="flex items-center gap-2">
          {settlementMode === 'lost' ? (
            <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
          ) : (
            <ArrowDownCircle className="h-5 w-5 text-teal-600 shrink-0" />
          )}
          {settlementMode === 'lost' ? 'Settle Lost Item' : 'Process Return'} — #{rental?.id}
        </DialogTitle>
        <DialogDescription>
          {settlementMode === 'lost' ? 'Misplaced item settlement for ' : 'Returning '}
          <strong>{rental?.product_name}</strong> from {rental?.customer_name}
        </DialogDescription>
      </DialogHeader>

      {/* Mode Switcher Tabs */}
      <div className="pt-2 pb-1 shrink-0">
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setSettlementMode('return')}
            className={`py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all ${
              settlementMode === 'return'
                ? 'bg-white text-teal-700 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            disabled={isReturning}
          >
            <PackageCheck className="h-4 w-4 shrink-0" />
            Item Returned
          </button>
          <button
            type="button"
            onClick={() => setSettlementMode('lost')}
            className={`py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all ${
              settlementMode === 'lost'
                ? 'bg-red-600 text-white shadow-sm font-bold'
                : 'text-slate-600 hover:text-red-700'
            }`}
            disabled={isReturning}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Item Lost / Misplaced
          </button>
        </div>
      </div>

      <div className="space-y-3.5 py-2 overflow-y-auto flex-1 pr-2 overscroll-contain custom-scrollbar">
        {/* Quantity Stepper Section */}
        <SettlementStepper
          settlementMode={settlementMode}
          totalQty={totalQty}
          alreadyReturned={alreadyReturned}
          remainingQty={remainingQty}
          returnedQty={returnedQty}
          safeQty={safeQty}
          onQtyChange={handleQtyChange}
          onBlur={handleBlur}
          onIncrement={() => setReturnedQty((prev) => Math.min(remainingQty, parseInt(prev || 1, 10) + 1))}
          onDecrement={() => setReturnedQty((prev) => Math.max(1, parseInt(prev || 1, 10) - 1))}
          disabled={isReturning}
        />

        {/* Additional Compensation Input (Lost mode only) */}
        {settlementMode === 'lost' && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 space-y-1.5">
            <Label className="text-xs font-bold text-amber-950 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-amber-700" />
                Additional Compensation Collected
              </span>
              <span className="text-[10px] font-normal text-amber-800">From Customer</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm font-bold text-slate-500">Rs.</span>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={amountCollected}
                onChange={(e) => setAmountCollected(e.target.value)}
                className="w-full pl-10 pr-3 py-1.5 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                disabled={isReturning}
              />
            </div>
            <p className="text-[10px] text-amber-800">
              Enter any extra amount collected from the customer to cover the lost item. This will be recorded into financial revenue & payment history.
            </p>
          </div>
        )}

        {/* Financial Breakdown */}
        {settlementMode === 'lost' ? (
          <LostItemBreakdown
            depositSubtotal={depositSubtotal}
            safeExtraCollected={safeExtraCollected}
            totalStoreRecovery={totalStoreRecovery}
          />
        ) : (
          <NormalReturnBreakdown
            rental={rental}
            safeQty={safeQty}
            overdueDays={overdueDays}
            penalty={penalty}
            unitDeposit={unitDeposit}
            depositSubtotal={depositSubtotal}
            refund={refund}
          />
        )}

        <div>
          <Label className="text-xs font-semibold text-slate-600">
            Condition / Settlement Notes (Optional)
          </Label>
          <Textarea
            placeholder={
              settlementMode === 'lost'
                ? "e.g., Customer misplaced the machine, settled price with customer..."
                : "e.g., Item returned in good condition, minor wear..."
            }
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
            className="mt-1"
            rows={2}
          />
        </div>
      </div>

      <DialogFooter className="pt-2.5 border-t border-slate-100 shrink-0 gap-2">
        <Button variant="outline" onClick={onClose} disabled={isReturning}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isReturning}
          className={
            settlementMode === 'lost'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-teal-600 hover:bg-teal-700 text-white'
          }
        >
          {isReturning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...
            </>
          ) : settlementMode === 'lost' ? (
            <>
              <ShieldAlert className="h-4 w-4 mr-2" /> Settle Lost Item ({safeQty} unit{safeQty !== 1 ? 's' : ''})
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" /> Confirm Return ({safeQty} item{safeQty !== 1 ? 's' : ''})
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
