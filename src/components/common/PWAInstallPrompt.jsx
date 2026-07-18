import React, { useState, useEffect } from 'react';
import { Download, X, Share2, PlusSquare } from 'lucide-react';
import { useDynamicTranslation } from '../../hooks/useDynamicTranslation';

export function PWAInstallPrompt({ storeName = "Suchi Chakki", storeLogo = null }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const { t } = useDynamicTranslation();

  useEffect(() => {
    // Check if already installed as standalone PWA
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                            window.navigator.standalone || 
                            document.referrer.includes('android-app://');
    if (checkStandalone) {
      setIsStandalone(true);
      return;
    }

    // Check if user dismissed prompt recently (24h cooldown)
    const dismissedAt = localStorage.getItem('pwa_prompt_dismissed_time');
    if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 24 * 60 * 60 * 1000) {
      return;
    }

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    if (isIOSDevice && !checkStandalone) {
      setIsIOS(true);
      // Show prompt after 3 seconds on iOS
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // Listen for beforeinstallprompt on Chrome/Android/Desktop
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Also listen for appinstalled event
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed_time', Date.now().toString());
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-card border-2 border-primary/30 shadow-2xl rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden backdrop-blur-md bg-card/95">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary/50 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden p-1.5 shadow-sm">
            <img 
              src={storeLogo || "/pwa-192x192.png"} 
              alt={storeName} 
              className="w-full h-full object-contain"
              onError={(e) => { e.target.src = '/logo.svg'; }}
            />
          </div>
          <div>
            <h4 className="font-bold text-foreground text-sm sm:text-base leading-tight">
              {t('Install')} {storeName} {t('App')}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {t('Install our app for fast order tracking, offline access & exclusive discounts.')}
            </p>
          </div>
        </div>

        {isIOS ? (
          <div className="bg-secondary/30 rounded-xl p-2.5 text-xs text-foreground flex items-center gap-2 border border-border">
            <Share2 className="w-4 h-4 text-primary shrink-0" />
            <span>
              {t('Tap Share')} (<Share2 className="w-3 h-3 inline" />) {t('below, then tap')} <strong>"Add to Home Screen"</strong> (<PlusSquare className="w-3 h-3 inline" />).
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={handleDismiss}
              className="px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg"
            >
              {t('Later')}
            </button>
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('Install App')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
