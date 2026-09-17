import React from 'react';
import { Dialog, DialogContent } from '../../components/common/dialog';
import {
  usePrintSlip,
  SlipDialogHeader,
  SlipStoreCard,
  SlipCustomerInfo,
  SlipItemsList,
  SlipTotalsSummary,
  SlipActionButtons
} from '../../components/features/admin/printSlip';

export function PrintSlip({ order, open, onClose }) {
  const {
    storeSettings,
    financials,
    dateStr,
    timeStr,
    handlePrint,
    handleWhatsAppShare
  } = usePrintSlip(order, open);

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden" hideCloseButton>
        {/* Header */}
        <SlipDialogHeader storeSettings={storeSettings} onClose={onClose} />

        {/* Scrollable Bill Preview */}
        <div className="overflow-y-auto" style={{ maxHeight: '62vh' }}>
          <div className="font-mono text-sm px-5 py-4 space-y-3">
            <SlipStoreCard storeSettings={storeSettings} />
            <SlipCustomerInfo order={order} dateStr={dateStr} timeStr={timeStr} />
            <SlipItemsList items={order.items} />
            <SlipTotalsSummary order={order} storeSettings={storeSettings} financials={financials} />
          </div>
        </div>

        {/* Sticky Action Buttons */}
        <SlipActionButtons
          onWhatsAppShare={handleWhatsAppShare}
          onPrint={handlePrint}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

export default PrintSlip;
