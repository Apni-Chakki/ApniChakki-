import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../../../config';
import { sendWhatsAppMessage } from '../../../../utils/whatsappHelper';
import { printIframeHtml } from '../../../../utils/printHelpers';
import {
  computeSlipFinancials,
  buildThermalPrintHtml,
  buildSlipWhatsAppMessage
} from './printSlipUtils';

export function usePrintSlip(order, open) {
  const [storeSettings, setStoreSettings] = useState({
    name: 'SUCHI CHAKKI',
    address: 'Main Bazaar, Lahore',
    phone: '+92 322 8483029',
    tagline: 'Pure & Fresh Processing',
    logo: ''
  });

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

  const financials = useMemo(() => computeSlipFinancials(order), [order]);

  const dateStr = useMemo(() => new Date().toLocaleDateString('en-GB'), []);
  const timeStr = useMemo(
    () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    []
  );

  const handlePrint = () => {
    if (!order) return;
    const html = buildThermalPrintHtml({ order, storeSettings, financials, dateStr, timeStr });
    printIframeHtml(html, { frameId: 'print-slip-frame' });
  };

  const handleWhatsAppShare = () => {
    if (!order) return;
    const message = buildSlipWhatsAppMessage({
      order,
      storeSettings,
      financials,
      dateStr,
      timeStr
    });
    sendWhatsAppMessage(order.phone, message);
    toast.success('Opening WhatsApp invoice...');
  };

  return {
    storeSettings,
    financials,
    dateStr,
    timeStr,
    handlePrint,
    handleWhatsAppShare
  };
}

export default usePrintSlip;
