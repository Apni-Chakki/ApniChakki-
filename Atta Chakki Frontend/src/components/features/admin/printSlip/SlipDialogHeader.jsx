import React from 'react';
import { X } from 'lucide-react';
import { DialogHeader, DialogTitle } from '@/components/common/dialog';
import { LogoSVG } from './printSlipUtils';

export default function SlipDialogHeader({ storeSettings, onClose }) {
  return (
    <DialogHeader className="px-5 pt-4 pb-3 border-b border-border/50 bg-gradient-to-r from-amber-900/10 to-amber-800/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {storeSettings.logo ? (
            <img
              src={storeSettings.logo}
              alt=""
              className="rounded-full object-cover shrink-0"
              style={{ width: 36, height: 36 }}
            />
          ) : (
            <LogoSVG size={36} />
          )}
          <div>
            <DialogTitle className="text-sm font-black tracking-wide uppercase">
              {storeSettings.name}
            </DialogTitle>
            <p className="text-[10px] text-muted-foreground">Print Order Slip</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 hover:bg-muted transition-colors"
          type="button"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </DialogHeader>
  );
}
