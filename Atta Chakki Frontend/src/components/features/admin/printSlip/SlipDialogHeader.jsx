import React from 'react';
import { X, Languages, Loader2 } from 'lucide-react';
import { DialogHeader, DialogTitle } from '@/components/common/dialog';
import { LogoSVG } from './printSlipUtils';

export default function SlipDialogHeader({
  storeSettings,
  onClose,
  language = 'en',
  onToggleLanguage,
  isTranslating = false
}) {
  return (
    <DialogHeader className="px-5 pt-4 pb-3 border-b border-border/50 bg-gradient-to-r from-amber-900/10 to-amber-800/5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {storeSettings.logo ? (
            <img
              src={storeSettings.logo}
              alt=""
              className="store-logo-header shrink-0"
            />
          ) : (
            <div className="shrink-0">
              <LogoSVG size={36} />
            </div>
          )}
          <div className="min-w-0">
            <DialogTitle className="text-sm font-black tracking-wide uppercase truncate">
              {storeSettings.name}
            </DialogTitle>
            <p className="text-[10px] text-muted-foreground truncate">
              {language === 'ur' ? 'آرڈر سلپ پرنٹ کریں' : 'Print Order Slip'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleLanguage}
            disabled={isTranslating}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border shadow-xs active:scale-95 ${
              language === 'ur'
                ? 'bg-primary text-white border-primary hover:bg-primary/90'
                : 'bg-white hover:bg-primary/10 text-primary border-primary/40'
            }`}
            title={language === 'ur' ? 'Switch to English' : 'بل کو اردو میں دیکھیں اور پرنٹ کریں'}
          >
            {isTranslating ? (
              <>
                <Loader2 className={`h-3.5 w-3.5 animate-spin ${language === 'ur' ? 'text-white' : 'text-primary'}`} />
                <span className="text-[11px] font-semibold">ترجمہ...</span>
              </>
            ) : (
              <>
                <Languages className={`h-3.5 w-3.5 ${language === 'ur' ? 'text-white' : 'text-primary'}`} />
                <span className="text-[11px]">{language === 'ur' ? 'English' : 'اردو'}</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-muted transition-colors"
            type="button"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </DialogHeader>
  );
}
