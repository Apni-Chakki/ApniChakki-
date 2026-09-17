import React from 'react';
import { AlertTriangle, PackageCheck } from 'lucide-react';
import { Label } from '../../../common/label';

export function SettlementStepper({
  settlementMode,
  totalQty,
  alreadyReturned,
  remainingQty,
  returnedQty,
  safeQty,
  onQtyChange,
  onBlur,
  onIncrement,
  onDecrement,
  disabled,
}) {
  return (
    <div className={`border rounded-lg p-3 space-y-2 ${
      settlementMode === 'lost' ? 'bg-red-50/40 border-red-200' : 'bg-slate-50 border-slate-200'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <Label className={`text-xs font-bold flex items-center gap-1.5 ${
            settlementMode === 'lost' ? 'text-red-900' : 'text-slate-800'
          }`}>
            {settlementMode === 'lost' ? (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            ) : (
              <PackageCheck className="h-4 w-4 text-teal-600" />
            )}
            {settlementMode === 'lost' ? 'Quantity Lost / Misplaced' : 'Quantity Being Returned'}
          </Label>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Rented: <strong>{totalQty}</strong> {alreadyReturned > 0 && `(Returned: ${alreadyReturned})`} | Remaining: <strong>{remainingQty}</strong>
          </p>
        </div>

        {/* Quantity Stepper */}
        <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={onDecrement}
            disabled={safeQty <= 1 || disabled}
            className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed border-r border-slate-300 transition-colors shrink-0"
            aria-label="Decrease quantity"
          >
            <span className="text-lg font-black text-slate-800 leading-none select-none">−</span>
          </button>
          <input
            type="number"
            min={1}
            max={remainingQty}
            value={returnedQty}
            onChange={(e) => onQtyChange(e.target.value)}
            onBlur={onBlur}
            className="h-8 w-14 text-center text-sm font-bold text-slate-800 border-0 focus:outline-none focus:ring-0 px-1 bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            disabled={disabled}
          />
          <button
            type="button"
            onClick={onIncrement}
            disabled={safeQty >= remainingQty || disabled}
            className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed border-l border-slate-300 transition-colors shrink-0"
            aria-label="Increase quantity"
          >
            <span className="text-lg font-black text-slate-800 leading-none select-none">+</span>
          </button>
        </div>
      </div>

      {settlementMode === 'lost' ? (
        <div className="text-[11px] font-medium text-red-800 bg-red-100/60 border border-red-200 rounded px-2.5 py-1 flex items-center justify-between">
          <span>Inventory Stock Impact:</span>
          <span className="font-bold text-red-900">0 units (Stock permanently written off)</span>
        </div>
      ) : (
        <div className="text-[11px] font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded px-2.5 py-1 flex items-center justify-between">
          <span>Inventory Stock Increment:</span>
          <span className="font-bold text-teal-900">+{safeQty} units back to stock</span>
        </div>
      )}
    </div>
  );
}

export function LostItemBreakdown({
  depositSubtotal,
  safeExtraCollected,
  totalStoreRecovery,
}) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between py-1 border-b">
        <span className="text-muted-foreground">Forfeited Security Deposit</span>
        <span className="font-bold text-slate-900">
          Rs. {depositSubtotal.toLocaleString()}
        </span>
      </div>
      <div className="flex justify-between py-1 border-b">
        <span className="text-muted-foreground">Additional Cash Collected</span>
        <span className="font-bold text-slate-900">
          Rs. {safeExtraCollected.toLocaleString()}
        </span>
      </div>
      <div className="flex justify-between py-1.5 rounded-md px-2 bg-slate-100 border border-slate-200">
        <span className="font-semibold text-slate-700">Total Store Recovery</span>
        <span className="font-black text-slate-900">
          Rs. {totalStoreRecovery.toLocaleString()}
        </span>
      </div>
      <div className="flex justify-between py-2 rounded-md px-2 bg-red-50 text-red-800 border border-red-200">
        <span className="font-bold">Customer Refund Amount</span>
        <span className="font-black text-lg">Rs. 0 (Forfeited)</span>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5 text-[11px] text-red-800">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
        <p>
          <strong>Permanent Write-Off:</strong> Marking this item as lost will complete this rental order, forfeit deposit, record any collected payment in revenue, and will <strong>NOT</strong> increment inventory stock.
        </p>
      </div>
    </div>
  );
}

export function NormalReturnBreakdown({
  rental,
  safeQty,
  overdueDays,
  penalty,
  unitDeposit,
  depositSubtotal,
  refund,
}) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between py-1 border-b">
        <span className="text-muted-foreground">Return Date</span>
        <span className="font-bold">{new Date().toLocaleDateString()}</span>
      </div>
      <div className="flex justify-between py-1 border-b">
        <span className="text-muted-foreground">Rental End Date</span>
        <span className="font-bold">
          {new Date(rental.rental_end_date).toLocaleDateString()}
        </span>
      </div>
      {overdueDays > 0 && (
        <div className="flex justify-between py-1 border-b text-red-600">
          <span className="font-medium">Late Days</span>
          <span className="font-bold">
            {overdueDays} day{overdueDays !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      {penalty > 0 && (
        <div className="flex justify-between py-1 border-b text-red-600">
          <span className="font-medium">
            Late Penalty ({overdueDays} × Rs.{' '}
            {parseInt(rental.late_penalty_per_day, 10).toLocaleString()})
          </span>
          <span className="font-bold">Rs. {parseInt(penalty, 10).toLocaleString()}</span>
        </div>
      )}
      <div className="flex justify-between py-1 border-b">
        <span className="text-muted-foreground">
          Security Deposit ({safeQty} × Rs. {parseInt(unitDeposit, 10).toLocaleString()})
        </span>
        <span className="font-bold">
          Rs. {parseInt(depositSubtotal, 10).toLocaleString()}
        </span>
      </div>
      <div
        className={`flex justify-between py-2 rounded-md px-2 ${
          refund > 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}
      >
        <span className="font-bold">Deposit Refund to Customer</span>
        <span className="font-black text-lg">
          Rs. {parseInt(refund, 10).toLocaleString()}
        </span>
      </div>

      {overdueDays > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            <strong>Note:</strong> Item is{' '}
            <strong>
              {overdueDays} day{overdueDays !== 1 ? 's' : ''} overdue
            </strong>
            . Penalty of Rs. {parseInt(penalty, 10).toLocaleString()} will be deducted from
            the security deposit.
          </p>
        </div>
      )}
    </div>
  );
}
