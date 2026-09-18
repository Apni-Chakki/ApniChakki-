import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../../../config';
import { sendWhatsAppMessage } from '../../../../utils/whatsappHelper';
import { printIframeHtml } from '../../../../utils/printHelpers';
import {
  computeSlipFinancials,
  buildThermalPrintHtml,
  buildSlipWhatsAppMessage,
  applySlipUrduCorrections
} from './printSlipUtils';

export function usePrintSlip(order, open) {
  const [storeSettings, setStoreSettings] = useState({
    name: 'SUCHI CHAKKI',
    address: 'Main Bazaar, Lahore',
    phone: '+92 322 8483029',
    tagline: 'Pure & Fresh Processing',
    logo: ''
  });

  const [language, setLanguage] = useState('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedData, setTranslatedData] = useState(null);

  // Reset language and cached translation when dialog is closed or order changes
  useEffect(() => {
    if (open) {
      setLanguage('en');
      setTranslatedData(null);
    }
  }, [open, order?.id]);

  useEffect(() => {
    if (open) {
      fetch(`${API_BASE_URL}/get_store_settings.php`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.settings) {
            setStoreSettings({
              name: data.settings.storeName || 'SUCHI CHAKKI',
              address: data.settings.address || 'Main Bazaar, Lahore',
              phone: data.settings.phone || '+92 322 8483029',
              tagline: 'Pure & Fresh Processing',
              logo: data.settings.logo || ''
            });
          }
        })
        .catch(err => console.error('Error fetching store settings:', err));
    }
  }, [open]);

  // Translate Order and Store Settings via API
  const translateOrderToUrdu = useCallback(async () => {
    if (!order) return;
    if (translatedData) {
      setLanguage(prev => (prev === 'en' ? 'ur' : 'en'));
      return;
    }

    setIsTranslating(true);
    try {
      // Gather dynamic texts that need translation
      const rawTexts = [
        storeSettings.name,
        storeSettings.tagline,
        storeSettings.address,
        order.customerName,
        order.deliveryAddress
      ];

      (order.items || []).forEach(item => {
        const iName = item.name || item.service?.name;
        if (iName) rawTexts.push(iName);
        if (item.customizations?.length > 0) {
          item.customizations.forEach(c => {
            if (c.option_name) rawTexts.push(c.option_name);
          });
        }
      });

      const uniqueTexts = Array.from(
        new Set(rawTexts.filter(t => t && typeof t === 'string' && t.trim().length > 0))
      );

      const res = await fetch(`${API_BASE_URL}/utils/translate.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: uniqueTexts, from: 'en', to: 'ur' })
      });

      const data = await res.json();
      const translationMap = {};

      if (data.success && Array.isArray(data.translations)) {
        uniqueTexts.forEach((orig, idx) => {
          const trans = data.translations[idx];
          translationMap[orig] = applySlipUrduCorrections(trans || orig);
        });
      }

      // Build translated storeSettings
      const urStoreSettings = {
        ...storeSettings,
        name: translationMap[storeSettings.name] || 'سچی چکی',
        tagline: translationMap[storeSettings.tagline] || 'خالص اور تازہ پروسیسنگ',
        address: translationMap[storeSettings.address] || storeSettings.address
      };

      // Build translated order
      const urOrder = {
        ...order,
        customerName: translationMap[order.customerName] || order.customerName,
        deliveryAddress: order.deliveryAddress ? (translationMap[order.deliveryAddress] || order.deliveryAddress) : null,
        items: (order.items || []).map(item => {
          const itemName = item.name || item.service?.name;
          const translatedItemName = translationMap[itemName] || itemName;
          const translatedCustomizations = (item.customizations || []).map(c => ({
            ...c,
            option_name: translationMap[c.option_name] || c.option_name
          }));
          return {
            ...item,
            name: translatedItemName,
            customizations: translatedCustomizations
          };
        })
      };

      setTranslatedData({
        order: urOrder,
        storeSettings: urStoreSettings
      });
      setLanguage('ur');
      toast.success('بل اردو میں تبدیل ہو گیا');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('ترجمہ سروس میں مسئلہ، متبادل اردو لوڈ کی جا رہی ہے');
      setLanguage('ur');
    } finally {
      setIsTranslating(false);
    }
  }, [order, storeSettings, translatedData]);

  const toggleLanguage = () => {
    if (language === 'en') {
      translateOrderToUrdu();
    } else {
      setLanguage('en');
    }
  };

  const activeOrder = (language === 'ur' && translatedData?.order) ? translatedData.order : order;
  const activeStoreSettings = (language === 'ur' && translatedData?.storeSettings) ? translatedData.storeSettings : storeSettings;

  const financials = useMemo(() => computeSlipFinancials(activeOrder), [activeOrder]);

  const dateStr = useMemo(
    () => new Date().toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-GB'),
    [language]
  );
  const timeStr = useMemo(
    () => new Date().toLocaleTimeString(language === 'ur' ? 'ur-PK' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
    [language]
  );

  const handlePrint = () => {
    if (!activeOrder) return;
    const html = buildThermalPrintHtml({
      order: activeOrder,
      storeSettings: activeStoreSettings,
      financials,
      dateStr,
      timeStr,
      language
    });
    printIframeHtml(html, { frameId: 'print-slip-frame' });
  };

  const handleWhatsAppShare = () => {
    if (!activeOrder) return;
    const message = buildSlipWhatsAppMessage({
      order: activeOrder,
      storeSettings: activeStoreSettings,
      financials,
      dateStr,
      timeStr,
      language
    });
    sendWhatsAppMessage(order.phone, message);
    toast.success('Opening WhatsApp invoice...');
  };

  return {
    storeSettings: activeStoreSettings,
    financials,
    dateStr,
    timeStr,
    language,
    isTranslating,
    toggleLanguage,
    activeOrder,
    handlePrint,
    handleWhatsAppShare
  };
}

export default usePrintSlip;
