import React from 'react';
import { Dialog, DialogContent } from '@/components/common/dialog';
import {
  usePrintSlip,
  SlipDialogHeader,
  SlipStoreCard,
  SlipCustomerInfo,
  SlipItemsList,
  SlipTotalsSummary,
  SlipActionButtons
} from './index';

export function PrintSlip({ order, open, onClose }) {
  const {
    storeSettings,
    financials,
    dateStr,
    timeStr,
    language,
    isTranslating,
    toggleLanguage,
    activeOrder,
    handlePrint,
    handleWhatsAppShare
  } = usePrintSlip(order, open);

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden" hideCloseButton>
        {/* Header */}
        <SlipDialogHeader
          storeSettings={storeSettings}
          onClose={onClose}
          language={language}
          onToggleLanguage={toggleLanguage}
          isTranslating={isTranslating}
        />

        {/* Scrollable Bill Preview */}
        <div
          className={`scroll-modal-preview custom-modal-scrollbar ${language === 'ur' ? 'font-sans' : 'font-mono'}`}
          dir={language === 'ur' ? 'rtl' : 'ltr'}
        >
          <div className="text-sm px-5 py-4 space-y-3">
            <SlipStoreCard storeSettings={storeSettings} language={language} />
            <SlipCustomerInfo order={activeOrder} dateStr={dateStr} timeStr={timeStr} language={language} />
            <SlipItemsList items={activeOrder.items} language={language} />
            <SlipTotalsSummary order={activeOrder} storeSettings={storeSettings} financials={financials} language={language} />
          </div>
        </div>

        {/* Sticky Action Buttons */}
        <SlipActionButtons
          onWhatsAppShare={handleWhatsAppShare}
          onPrint={handlePrint}
          onClose={onClose}
          language={language}
        />
      </DialogContent>
    </Dialog>
  );
}

export default PrintSlip;
