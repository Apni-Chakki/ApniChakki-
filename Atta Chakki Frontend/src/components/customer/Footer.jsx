import { useState, useEffect } from 'react';
import { MapPin, Phone, Megaphone, X, Mail, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../config';

const DEFAULT_SETTINGS = {
  storeName: "Apni Chakki",
  phone: "+92 300 1234567",
  email: "info@example.com",
  address: "Lahore, Pakistan",
  openingTime: "08:00",
  closingTime: "20:00",
  announcement: ""
};

export function Footer() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_store_settings.php`);
      const data = await response.json();
      if (data.success && data.settings) {
        setSettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch (error) {
      console.error("Could not load store settings for footer:", error);
    }
  };

  useEffect(() => {
    // Fetch settings from API
    fetchSettings();

    // Listen for settings updates from admin panel
    const handleSettingsUpdate = () => {
      fetchSettings();
    };
    
    window.addEventListener('settingsUpdated', handleSettingsUpdate);

    const handleScroll = () => {
      const scrollPosition = window.innerHeight + window.pageYOffset;
      const threshold = document.documentElement.scrollHeight - 120;
      setIsAtBottom(scrollPosition >= threshold);
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    };
  }, []);

  useEffect(() => {
    // Only add padding when banner is visible AND fixed (not at bottom)
    if (settings.announcement && isBannerVisible && !isAtBottom) {
      document.body.classList.add('has-announcement');
      document.body.style.paddingBottom = '80px';
    } else {
      document.body.classList.remove('has-announcement');
      document.body.style.paddingBottom = '0';
    }
    // Show banner when announcement changes
    if (settings.announcement && !isBannerVisible) {
      setIsBannerVisible(true);
    }
    return () => {
      document.body.classList.remove('has-announcement');
      document.body.style.paddingBottom = '0';
    };
  }, [settings.announcement, isBannerVisible, isAtBottom]);

  return (
    <>
      {/* Announcement Banner */}
      {settings.announcement && isBannerVisible && (
        <div 
          className={cn(
            "left-0 right-0 w-full transition-all duration-300 ease-in-out px-4 py-4 border-t border-primary-foreground/10",
            "bg-primary text-primary-foreground", 
            isAtBottom 
              ? "relative z-40" 
              : "fixed bottom-0 left-0 right-0 z-[9999] shadow-[0_-10px_25px_rgba(0,0,0,0.2)]"
          )}
          style={!isAtBottom ? { position: 'fixed', bottom: 0, left: 0, right: 0 } : {}}
        >
          <div className="container mx-auto max-w-6xl flex items-center justify-between gap-4">
            <div className="w-10 hidden md:block"></div>
            
            <div className="flex-1 flex items-center justify-center gap-3">
              <Megaphone className="h-5 w-5 animate-pulse flex-shrink-0" />
              <p className="text-center text-sm md:text-base font-bold tracking-wide leading-tight">
                {settings.announcement}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/20 h-9 w-9 rounded-full flex-shrink-0"
              onClick={() => setIsBannerVisible(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Footer Content */}
      <footer className="bg-primary text-primary-foreground py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Quick Links */}
            <div>
              <h4 className="mb-4 font-bold uppercase tracking-wider text-primary-foreground/70">{t('Quick Links')}</h4>
              <div className="space-y-2 opacity-90">
                <Link to="/" className="block hover:translate-x-1 transition-transform">{t('Home')}</Link>
                <Link to="/track-order" className="block hover:translate-x-1 transition-transform">{t('Track Order')}</Link>
                <Link to="/contact" className="block hover:translate-x-1 transition-transform">{t('Contact Us')}</Link>
              </div>
            </div>

            {/* Contact Info (Dynamic) */}
            <div>
              <h4 className="mb-4 font-bold uppercase tracking-wider text-primary-foreground/70">{t('Contact Us')}</h4>
              <div className="space-y-3 opacity-90 text-sm">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 shrink-0" />
                  <a href={`tel:${settings.phone}`} className="hover:underline">{settings.phone}</a>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 shrink-0" />
                  <a href={`mailto:${settings.email}`} className="hover:underline break-all">{settings.email}</a>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 shrink-0 mt-1" />
                  <span>{settings.address}</span>
                </div>
              </div>
            </div>

            {/* Working Hours (Dynamic) */}
            <div>
              <h4 className="mb-4 font-bold uppercase tracking-wider text-primary-foreground/70">{t('Working Hours')}</h4>
              <div className="space-y-2 opacity-90 text-sm">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>{settings.openingTime} - {settings.closingTime}</span>
                </div>
                <p className="mt-2 text-primary-foreground/80 italic">{t('Mon - Sun')}</p>
              </div>
            </div>

            {/* About */}
            <div>
              <h4 className="mb-4 font-bold uppercase tracking-wider text-primary-foreground/70">{settings.storeName}</h4>
              <p className="text-sm opacity-80 leading-relaxed">
                {t('Traditional stone-ground quality. Serving 100% pure grains for over two decades.')}
              </p>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-primary-foreground/10 text-center flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm opacity-50">&copy; {new Date().getFullYear()} {settings.storeName}. All rights reserved.</p>
            <div className="flex items-center gap-6 text-xs opacity-40">
              <Link to="/login/admin" className="hover:opacity-100 underline">{t('Staff Portal')}</Link>
              <Link to="/login/delivery" className="hover:opacity-100 underline">{t('Delivery Hub')}</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}