import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../common/dialog';
import { Button } from '../../../common/button';
import { toast } from 'sonner';

export function WhatsAppReadyModal({
  whatsappReadyModal,
  setWhatsappReadyModal,
  openWhatsAppSafely,
}) {
  return (
    <Dialog open={!!whatsappReadyModal} onOpenChange={(open) => !open && setWhatsappReadyModal(null)}>
      <DialogContent className="max-w-md w-[95vw] rounded-2xl p-0 overflow-hidden shadow-2xl border-emerald-100">
        <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-xl">
              📱
            </div>
            <div>
              <DialogTitle className="text-white text-lg font-bold">Order Ready & Bill Generated!</DialogTitle>
              <DialogDescription className="text-emerald-100 text-xs">
                Order #{whatsappReadyModal?.order?.id} marked as ready
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs font-medium">Customer:</span>
              <span className="font-semibold text-slate-800">{whatsappReadyModal?.customerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs font-medium">WhatsApp Number:</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                {whatsappReadyModal?.phone || 'No phone provided'}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-200/60 pt-1.5 mt-1.5">
              <span className="text-muted-foreground text-xs font-medium">PDF Bill:</span>
              <span className="text-xs text-slate-600 font-medium">Downloaded to device ✅</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 shadow-md shadow-emerald-600/20 text-sm flex items-center justify-center gap-2"
              onClick={() => {
                if (whatsappReadyModal?.url) {
                  openWhatsAppSafely(whatsappReadyModal.url, true);
                  setWhatsappReadyModal(null);
                }
              }}
            >
              <span className="text-base">📱</span> Open WhatsApp (کسٹمر کو بل بھیجیں)
            </Button>

            <Button
              variant="outline"
              className="w-full font-medium h-10 border-slate-200 hover:bg-slate-50 text-xs flex items-center justify-center gap-2"
              onClick={() => {
                if (whatsappReadyModal?.rawMessage) {
                  navigator.clipboard.writeText(whatsappReadyModal.rawMessage);
                  toast.success('📋 Message copied to clipboard!');
                }
              }}
            >
              <span>📋</span> Copy Message Text
            </Button>
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50/50 border-t flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setWhatsappReadyModal(null)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}