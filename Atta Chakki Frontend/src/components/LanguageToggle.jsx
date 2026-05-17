import { Languages, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function LanguageToggle({ className }) {
  const { i18n } = useTranslation();
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    if (switching) {
      root.style.transition = 'filter 0.2s ease';
      root.style.filter = 'blur(4px)';
    } else {
      root.style.filter = '';
    }
    return () => { root.style.filter = ''; };
  }, [switching]);

  const currentLang = localStorage.getItem('apni_chakki_lang') || i18n.language || 'en';

  const toggleLanguage = () => {
    if (switching) return;
    setSwitching(true);
    const newLang = currentLang === 'en' ? 'ur' : 'en';
    localStorage.setItem('apni_chakki_lang', newLang);
    i18n.changeLanguage(newLang);
    setTimeout(() => setSwitching(false), 400);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              disabled={switching}
              className={`flex items-center gap-2 px-3 min-w-[80px] justify-center border-input bg-transparent hover:bg-accent hover:text-accent-foreground ${className}`}
            >
              <Languages className="h-4 w-4" />
              <span className="font-semibold text-xs">
                {currentLang === 'en' ? 'اردو' : 'English'}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Switch to {currentLang === 'en' ? 'Urdu' : 'English'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {switching && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/40">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            {currentLang === 'en' ? 'Switching to Urdu…' : 'Switching to English…'}
          </p>
        </div>,
        document.body
      )}
    </>
  );
}
