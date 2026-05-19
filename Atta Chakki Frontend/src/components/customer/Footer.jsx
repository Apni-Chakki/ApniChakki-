import { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
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

    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    };
  }, []);

  return (
    <>
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
                  <a href={`tel:${settings.phone}`} className="hover:underline" dir="ltr">{settings.phone}</a>
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
              <h4 className="mb-4 font-bold uppercase tracking-wider text-primary-foreground/70">{t(settings.storeName)}</h4>
              <p className="text-sm opacity-80 leading-relaxed">
                {t('Traditional stone-ground quality. Serving 100% pure grains for over two decades.')}
              </p>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-primary-foreground/10 text-center flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm opacity-50">&copy; {new Date().getFullYear()} {t(settings.storeName)}. All rights reserved.</p>
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