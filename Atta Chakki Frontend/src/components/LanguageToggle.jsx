import { Languages } from 'lucide-react';
import { Button } from './ui/button';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { useState } from 'react';

export function LanguageToggle({ className }) {
  const { i18n } = useTranslation();
  const [switching, setSwitching] = useState(false);

  const currentLang = localStorage.getItem('apni_chakki_lang') || i18n.language || 'en';

  const toggleLanguage = () => {
    if (switching) return; // Prevent double-click
    setSwitching(true);

    const newLang = currentLang === 'en' ? 'ur' : 'en';
    
    // 1. Save to localStorage FIRST (survives reload)
    localStorage.setItem('apni_chakki_lang', newLang);
    
    // 2. Update i18next state (for RTL direction, font)
    i18n.changeLanguage(newLang);
    
    // 3. Switch Google Translate
    if (typeof window.switchGoogleTranslate === 'function') {
      window.switchGoogleTranslate(newLang);
    } else {
      // Google Translate script not loaded yet — just reload
      window.location.reload();
    }

    // Reset switching state after a delay
    setTimeout(() => setSwitching(false), 3000);
  };

  return (
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
  );
}