import React from 'react';
import { History, Loader2, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/common/dialog';
import { Checkbox } from '@/components/common/checkbox';
import './EodRolloverModal.css';

export default function EodRolloverModal({
  showEodModal,
  setShowEodModal,
  isProcessingEod,
  eodStep,
  setEodStep,
  setSelectedCompleted,
  eodData,
  yesterdayOrders = [],
  selectedCompleted,
  toggleSelectAll,
  toggleOrderCompleted,
  handleProcessEodSelection
}) {
  return (
    <Dialog
      open={showEodModal}
      onOpenChange={(open) => {
        if (!isProcessingEod && open === false) {
          setShowEodModal(false);
          setEodStep('loading');
          setSelectedCompleted(new Set());
        }
      }}
    >
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-xl border border-gray-200 shadow-2xl !bg-white">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center gap-3 px-4 py-3 border-b border-gray-100 bg-orange-50">
          <div className="bg-orange-200 rounded-lg p-1.5 shrink-0">
            <History className="h-4 w-4 text-orange-700" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-sm font-bold text-gray-900 leading-none">
              Pending Orders
            </DialogTitle>
            <DialogDescription className="text-[11px] text-gray-500 mt-0.5">
              {eodData?.leftover_count || yesterdayOrders.length} orders · {eodData?.leftover_total_weight_kg || 0} kg · {eodData?.leftover_total_minutes || 0} mins
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Step: Loading */}
        {eodStep === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-orange-500 mb-3" />
            <p className="text-gray-600 text-sm font-medium">Loading orders...</p>
          </div>
        )}

        {/* Step: Select */}
        {eodStep === 'select' && (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
              <label htmlFor="select-all-eod" className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  id="select-all-eod"
                  checked={yesterdayOrders.length > 0 && selectedCompleted.size === yesterdayOrders.length}
                  onCheckedChange={toggleSelectAll}
                  className="h-3.5 w-3.5"
                />
                <span className="text-xs font-semibold text-gray-600">Select All</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  <CheckCircle className="h-3 w-3" />
                  {selectedCompleted.size} Done
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                  <Clock className="h-3 w-3" />
                  {yesterdayOrders.length - selectedCompleted.size} Pending
                </span>
              </div>
            </div>

            {/* Orders list */}
            <div className="pl-3 pr-2 py-2 space-y-1.5 eod-items-scroll custom-modal-scrollbar">
              {yesterdayOrders.map((order) => {
                const isChecked = selectedCompleted.has(order.id);
                return (
                  <div
                    key={order.id}
                    onClick={() => toggleOrderCompleted(order.id)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-pointer select-none transition-colors border ${
                      isChecked
                        ? 'bg-green-50 border-green-200'
                        : 'bg-white border-gray-200 hover:border-orange-300 hover:bg-orange-50/40'
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleOrderCompleted(order.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-3.5 w-3.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-gray-900">#{order.id}</span>
                        <span className="text-xs text-gray-600 truncate">{order.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-medium text-blue-600">
                          ⚖ {parseFloat(order.total_weight_kg || 0).toFixed(1)} kg
                        </span>
                        <span className="text-[10px] text-gray-300">|</span>
                        <span className="text-[10px] font-medium text-purple-600">
                          ⏱ {order.processing_time_minutes || '~'} min
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-bold text-gray-800">
                        Rs. {parseInt(order.total_amount || 0).toLocaleString()}
                      </span>
                      {!isChecked ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOrderCompleted(order.id);
                          }}
                          className="flex items-center gap-1 text-[11px] font-bold bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded-full transition-colors"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Done
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOrderCompleted(order.id);
                          }}
                          className="flex items-center gap-1 text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 px-2.5 py-1 rounded-full transition-colors"
                        >
                          Undo
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {yesterdayOrders.length === 0 && (
                <div className="flex flex-col items-center py-10 text-gray-400">
                  <CheckCircle className="h-8 w-8 mb-2 text-green-400" />
                  <p className="text-sm font-semibold">All Clear!</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
              <div className="flex items-center justify-between text-[11px] font-semibold mb-2.5">
                <span className="text-green-700">✓ {selectedCompleted.size} marked as done</span>
                <span className="text-orange-600">
                  {yesterdayOrders.length - selectedCompleted.size} will go to queue
                </span>
              </div>
              <button
                className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-sm py-2.5 rounded-lg transition-colors"
                onClick={handleProcessEodSelection}
                disabled={isProcessingEod}
              >
                {isProcessingEod ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    Confirm &amp; Process
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* Step: Processing */}
        {eodStep === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-orange-500 mb-3" />
            <p className="text-gray-700 text-sm font-semibold">Processing orders...</p>
          </div>
        )}

        {/* Step: Done */}
        {eodStep === 'done' && (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-8 w-8 text-green-500 mb-3" />
            <p className="text-gray-700 text-sm font-semibold">Done! Redirecting...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
