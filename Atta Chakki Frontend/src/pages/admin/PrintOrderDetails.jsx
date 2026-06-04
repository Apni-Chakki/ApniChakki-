import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/common/dialog';
import { Button } from '../../components/common/button';
import { Printer, X, ClipboardList, Languages, Wheat, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';

/* ─── Header-style Logo (Wheat icon in primary circle — same as app header) ─── */
const HeaderLogo = ({ size = 40 }) => (
  <div
    className="rounded-full bg-primary flex items-center justify-center shadow-sm flex-shrink-0"
    style={{ width: size, height: size }}
  >
    <Wheat className="text-primary-foreground" style={{ width: size * 0.6, height: size * 0.6 }} />
  </div>
);

export function PrintOrderDetails({ order, open, onClose }) {
  const [lang, setLang] = useState('en');
  const [storeSettings, setStoreSettings] = useState({
    name: 'MUGHAL ATTA CHAKKI',
    address: 'Main Bazaar, Lahore',
    phone: '+92 322 8483029',
    tagline: 'Pure & Fresh Processing'
  });

  useEffect(() => {
    if (open) {
      fetch(`${API_BASE_URL}/get_store_settings.php`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.settings) {
            setStoreSettings({
              name: data.settings.storeName || 'MUGHAL ATTA CHAKKI',
              address: data.settings.address || 'Main Bazaar, Lahore',
              phone: data.settings.phone || '+92 322 8483029',
              tagline: 'Pure & Fresh Processing'
            });
          }
        })
        .catch(err => console.error("Error fetching store settings:", err));
    }
  }, [open]);

  if (!order) return null;

  const hasPendingItems = order.items.some(i => i.isWeightPending);
  const remainingBalance = order.total - (order.advancePayment || 0);

  // Calculate discounts for both print and preview
  let itemDiscountsTotal = 0;
  let originalSubtotal = 0;
  
  order.items.forEach(item => {
    if (!item.isWeightPending) {
      const itemPrice = parseFloat(item.price_at_purchase) || parseFloat(item.service?.price) || 0;
      const origPrice = parseFloat(item.original_price) || null;
      const qty = parseFloat(item.quantity) || 0;
      const hasItemDiscount = origPrice && origPrice > itemPrice;
      
      if (hasItemDiscount) {
        itemDiscountsTotal += (origPrice - itemPrice) * qty;
        originalSubtotal += origPrice * qty;
      } else {
        originalSubtotal += itemPrice * qty;
      }
    }
  });

  const couponDiscount = parseFloat(order.couponDiscount) || 0;
  const totalDiscount = itemDiscountsTotal + couponDiscount;
  const hasDiscount = totalDiscount > 0;

  const translateText = (text, currentLang) => {
    if (currentLang === 'en') return text;
    if (!text) return '';
    const clean = text.trim();
    
    const dict = {
      "MUGHAL ATTA CHAKKI": "مغل آٹا چکی",
      "Main Bazaar, Lahore": "مین بازار، لاہور",
      "Pure & Fresh Processing": "خالص اور تازہ پروسیسنگ",
      "Pure Grains, Fresh Quality": "خالص اناج، بہترین معیار",
      "Wheat Flour": "گندم کا آٹا",
      "Chakki Atta": "چکی کا آٹا",
      "Special Atta": "خصوصی آٹا",
      "Fine Atta": "فائن آٹا",
      "Maida": "میدہ",
      "Suji": "سوجی",
      "Besan": "بیسن",
      "Grinding Service": "پسائی کی سروس",
      "Cleaning Service": "صفائی کی سروس",
      "Wheat": "گندم",
      "Gram": "چنا",
      "Maize": "مکئی",
      "Barley": "جَو",
      "Millet": "باجرہ",
      "Oats": "جئی",
      "Rice": "چاول",
      "Spices": "مصالحہ جات",
      "Red Chili": "سرخ مرچ",
      "Turmeric": "ہلدی",
      "Coriander": "دھنیا"
    };
    
    if (dict[clean]) return dict[clean];
    
    const lower = clean.toLowerCase();
    for (const key in dict) {
      if (key.toLowerCase() === lower) {
        return dict[key];
      }
    }
    
    return text;
  };

  const getStatusLabel = (status, currentLang = 'en') => {
    const mapEn = {
      pending: 'Pending',
      processing: 'Processing',
      ready: 'Ready for Pickup/Delivery',
      'out-for-delivery': 'Out for Delivery',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    const mapUr = {
      pending: 'زیر التواء',
      processing: 'جاری ہے',
      ready: 'تیار ہے پک اپ/ڈیلیوری کیلئے',
      'out-for-delivery': 'ڈیلیوری کے لیے روانہ',
      completed: 'مکمل شدہ',
      cancelled: 'منسوخ شدہ',
    };
    const map = currentLang === 'ur' ? mapUr : mapEn;
    return map[status] || status;
  };

  const getStatusBadgeStyle = (status) => {
    const map = {
      pending: 'background:#fef9c3;color:#854d0e;border:1px solid #fde047;',
      processing: 'background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;',
      ready: 'background:#dcfce7;color:#166534;border:1px solid #86efac;',
      'out-for-delivery': 'background:#f3e8ff;color:#6b21a8;border:1px solid #c4b5fd;',
      completed: 'background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;',
      cancelled: 'background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;',
    };
    return map[status] || 'background:#f3f4f6;color:#374151;border:1px solid #d1d5db;';
  };

  const getStatusColorClass = (status) => {
    const map = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      processing: 'bg-blue-100 text-blue-800 border-blue-300',
      ready: 'bg-green-100 text-green-800 border-green-300',
      'out-for-delivery': 'bg-purple-100 text-purple-800 border-purple-300',
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
    };
    return map[status] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const getOrderTypeLabel = (type) => {
    if (lang === 'ur') {
      return type === 'delivery' ? 'ڈیلیوری' : 'پک اپ';
    }
    return type === 'delivery' ? 'Delivery' : 'Pickup';
  };

  const getPaymentMethodLabel = (method) => {
    const lower = (method || '').toLowerCase();
    if (lang === 'ur') {
      if (lower === 'jazzcash') return 'جائز کیش';
      if (lower === 'easypaisa') return 'ایزی پیسہ';
      if (lower === 'cash') return 'نقد رقم';
      return method || 'نقد رقم';
    }
    if (lower === 'jazzcash') return 'JazzCash';
    if (lower === 'easypaisa') return 'EasyPaisa';
    if (lower === 'cash') return 'CASH';
    return method || 'CASH';
  };

  const getPaymentStatusLabel = (status) => {
    if (lang === 'ur') {
      if (status === 'paid') return '✓ ادا شدہ';
      if (status === 'partial') return 'جزوی ادائیگی';
      return '✗ غیر ادا شدہ';
    }
    if (status === 'paid') return '✓ PAID';
    if (status === 'partial') return 'PARTIAL';
    return '✗ UNPAID';
  };

  const translateUnit = (unit, quantity, currentLang) => {
    if (currentLang !== 'ur') return unit;
    const lower = unit.toLowerCase();
    if (lower === 'kg') return 'کلو';
    if (lower === 'unit' || lower === 'units' || lower === 'pcs' || lower === 'piece' || lower === 'pieces') return 'عدد';
    return unit;
  };

  const getCustomizationsText = (item) => {
    if (item.customizations?.length > 0) {
      return item.customizations.map(c => translateText(c.option_name, lang)).join(' + ');
    }
    const services = [];
    if (item.is_cleaning == 1) services.push(lang === 'ur' ? 'صفائی' : 'Cleaning');
    if (item.is_grinding == 1) services.push(lang === 'ur' ? 'پسائی' : 'Grinding');
    return services.join(' + ');
  };

  const buildPrintHTML = () => {
    const isUrdu = lang === 'ur';
    const direction = isUrdu ? 'rtl' : 'ltr';
    const fontFamily = isUrdu 
      ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaliq', 'Urdu Typesetting', 'Tahoma', 'Arial', sans-serif" 
      : "'Courier New', monospace";
    
    const logoHTMLForPrint = `
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:14px 0 10px;">
        <div style="width:50px;height:50px;border-radius:50%;background:#1a1a1a;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-bottom:8px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 22 16 8"/><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z"/><path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/><path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/><path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/>
          </svg>
        </div>
        <div>
          <div style="font-size:18px;font-weight:900;letter-spacing:${isUrdu ? '0' : '2px'};color:#1a1a1a;text-transform:uppercase;">${translateText(storeSettings.name, lang)}</div>
          <div style="font-size:10px;color:#666;letter-spacing:${isUrdu ? '0' : '1px'};margin-top:2px;">${translateText(storeSettings.tagline, lang)}</div>
          <div style="font-size:10px;color:#666;margin-top:1px;">📍 ${translateText(storeSettings.address, lang)} &nbsp;|&nbsp; 📞 ${storeSettings.phone}</div>
        </div>
      </div>
    `;

    const itemsHTMLForPrint = order.items.map(item => {
      const isRental = item.is_rental === 1 || item.is_rental === '1' || item.isRental;
      const itemName = translateText(item.name || item.service?.name, lang);
      
      if (item.isWeightPending) {
        return `
          <div style="border-bottom:1px dashed #ccc;padding:7px 0;text-align:${isUrdu ? 'right' : 'left'};">
            <div style="font-weight:600;font-size:12px;">${itemName}</div>
            <div style="color:#d97706;font-size:10px;font-weight:700;margin-top:2px;">⚠ ${isUrdu ? 'وزن کی تصدیق باقی ہے' : 'WEIGHT TO BE CONFIRMED'}</div>
          </div>`;
      }
      
      const itemPrice = item.price_at_purchase || item.service?.price || 0;
      const origPrice = item.original_price || null;
      const hasItemDiscount = origPrice && origPrice > itemPrice;
      
      if (isRental) {
        const rate = item.rental_price_per_day || itemPrice;
        const days = item.rental_days || 0;
        const deposit = item.security_deposit || 0;
        const runningPenalty = item.runningPenalty || item.late_penalty_total || 0;
        const lineTotal = rate * days;

        const rentalStartFormatted = item.rental_start_date ? new Date(item.rental_start_date).toLocaleDateString() : '';
        const rentalEndFormatted = item.rental_end_date ? new Date(item.rental_end_date).toLocaleDateString() : '';

        return `
          <div style="border-bottom:1px dashed #ccc;padding:7px 0;direction:${direction};">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div style="flex:1;padding-${isUrdu ? 'left' : 'right'}:10px;text-align:${isUrdu ? 'right' : 'left'};">
                <div style="font-weight:600;font-size:12px;">${itemName} (${isUrdu ? 'کرایہ' : 'Rental'})</div>
                <div style="font-size:10px;color:#555;margin-top:2px;">
                  🗓️ ${isUrdu ? 'مدت کرایہ:' : 'Rental Period:'} ${days} ${isUrdu ? 'دن' : 'days'} (${rentalStartFormatted} - ${rentalEndFormatted})
                </div>
                <div style="font-size:10px;color:#555;margin-top:2px;">
                  💰 ${isUrdu ? 'شرح کرایہ:' : 'Rate:'} Rs.${Number(rate).toLocaleString()}/${isUrdu ? 'دن' : 'day'}
                </div>
                <div style="font-size:10px;color:#555;margin-top:2px;">
                  🛡️ ${isUrdu ? 'سیکیورٹی ڈپازٹ:' : 'Security Deposit:'} Rs.${Number(deposit).toLocaleString()}
                </div>
                ${runningPenalty > 0 ? `
                  <div style="font-size:10px;color:#b91c1c;font-weight:bold;margin-top:2px;">
                    ⚠️ ${isUrdu ? 'بقایا جرمانہ:' : 'Late Penalty:'} Rs.${Number(runningPenalty).toLocaleString()}
                  </div>
                ` : ''}
              </div>
              <div style="text-align:${isUrdu ? 'left' : 'right'};">
                <div style="font-weight:700;white-space:nowrap;font-size:13px;">Rs.${Number(lineTotal).toLocaleString()}</div>
              </div>
            </div>
          </div>
        `;
      }

      const lineTotal = item.quantity * itemPrice;
      const customText = getCustomizationsText(item);
      const unitText = translateUnit(item.unit || item.service?.unit || 'unit', item.quantity, lang);

      return `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px dashed #ccc;padding:7px 0;direction:${direction};">
          <div style="flex:1;padding-${isUrdu ? 'left' : 'right'}:10px;text-align:${isUrdu ? 'right' : 'left'};">
            <div style="font-weight:600;font-size:12px;">${itemName}</div>
            ${customText ? `
              <div style="color:#666;font-size:9px;font-style:italic;margin-top:2px;">
                (${customText})
              </div>
            ` : ''}
            <div style="font-size:10px;margin-top:2px;">
              ${item.quantity} ${unitText} ×
              ${hasItemDiscount
                ? `<span style="text-decoration:line-through;color:#999;">Rs.${Number(origPrice).toLocaleString()}</span> <span style="color:#15803d;font-weight:700;">Rs.${Number(itemPrice).toLocaleString()}</span>`
                : `<span style="color:#555;">Rs.${Number(itemPrice).toLocaleString()}</span>`
              }
            </div>
          </div>
          <div style="text-align:${isUrdu ? 'left' : 'right'};">
            <div style="font-weight:700;white-space:nowrap;font-size:13px;">Rs.${Number(lineTotal).toLocaleString()}</div>
            ${hasItemDiscount ? `<div style="font-size:9px;color:#15803d;font-weight:700;">🏷 ${isUrdu ? 'ڈسکاؤنٹ' : 'Disc.'}</div>` : ''}
          </div>
        </div>`;
    }).join('');

    const originalSubtotalLabel = isUrdu ? 'سب ٹوٹل (اصل قیمت)' : 'SUBTOTAL (ORIGINAL PRICE)';
    const itemDiscountLabel = isUrdu ? 'پروڈکٹ ڈسکاؤنٹ' : 'PRODUCT DISCOUNT';
    const couponDiscountLabel = isUrdu ? `کوپن ڈسکاؤنٹ (${order.couponCode || 'PROMO'})` : `COUPON DISCOUNT (${order.couponCode || 'PROMO'})`;
    const grandTotalAfterDiscountLabel = isUrdu ? 'کل رقم (ڈسکاؤنٹ کے بعد)' : 'GRAND TOTAL (AFTER DISCOUNT)';

    const subtotalLabel = isUrdu ? 'سب ٹوٹل' : 'SUBTOTAL';
    const discountLabel = isUrdu ? `ڈسکاؤنٹ (${order.couponCode || 'PROMO'})` : `DISCOUNT (${order.couponCode || 'PROMO'})`;
    const grandTotalLabel = isUrdu ? 'کل رقم' : 'GRAND TOTAL';
    const advancePaidLabel = isUrdu ? 'ایڈوانس ادائیگی' : 'ADVANCE PAID';
    const remainingDueLabel = isUrdu ? 'بقایا رقم' : 'REMAINING DUE';
    const paymentMethodLabel = isUrdu ? 'ادائیگی کا طریقہ' : 'Payment Method';
    const paymentMethodValue = getPaymentMethodLabel(order.paymentMethod);
    const paymentStatusLabel = isUrdu ? 'ادائیگی کی صورتحال' : 'Payment Status';
    const paymentStatusValue = getPaymentStatusLabel(order.paymentStatus);
    const transactionIdLabel = isUrdu ? 'ٹرانزیکشن آئی ڈی' : 'Transaction ID';
    
    const collectPaymentText = isUrdu 
      ? `⚠ رقم وصول کریں: Rs.${Number(remainingBalance).toLocaleString()}${hasPendingItems ? ' (+ تصدیق طلب)' : ''}`
      : `⚠ COLLECT PAYMENT: Rs.${Number(remainingBalance).toLocaleString()}${hasPendingItems ? ' (+ TBD)' : ''}`;
      
    const printedDateText = isUrdu
      ? `پرنٹ کی تاریخ: ${new Date().toLocaleDateString('en-GB')} بجے ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
      : `Printed on: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      
    const thankYouText = isUrdu ? '🙏 ہمارے کاروبار پر بھروسہ کرنے کا شکریہ!' : '🙏 Thank you for your business!';
    const logoName = translateText(storeSettings.name, lang);
    const logoTagline = translateText(storeSettings.tagline, lang);

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>${isUrdu ? 'آرڈر کی تفصیلات' : 'Order Details'} — ${order.id}</title>
      <style>
        @page { size: A4; margin: 15mm 12mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { font-family: ${fontFamily}; font-size: 12px; color: #111; background: #fff; direction: ${direction}; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .header { text-align: center; border-bottom: 2.5px dashed #333; padding-bottom: 10px; margin-bottom: 12px; }
        .doc-title { display:inline-block; border: 1.5px solid #555; padding: 3px 14px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: ${isUrdu ? '0' : '2px'}; text-transform: uppercase; margin-top: 6px; }
        .section-title { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: ${isUrdu ? '0' : '2px'}; color: #555; border-bottom: 1px dashed #aaa; padding-bottom: 4px; margin: 12px 0 7px; text-align: ${isUrdu ? 'right' : 'left'}; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; background: #f9fafb; border: 1px solid #e5e7eb; padding: 10px 12px; border-radius: 6px; direction: ${direction}; }
        .info-label { font-size: 9px; text-transform: uppercase; letter-spacing: ${isUrdu ? '0' : '1px'}; color: #777; font-weight: 700; margin-bottom: 2px; text-align: ${isUrdu ? 'right' : 'left'}; }
        .info-value { font-size: 11px; font-weight: 600; text-align: ${isUrdu ? 'right' : 'left'}; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 30px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: ${isUrdu ? '0' : '1px'}; }
        .row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; direction: ${direction}; }
        .muted { color: #666; }
        .bold { font-weight: 700; }
        .total-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; direction: ${direction}; }
        .due-row { color: #b91c1c; border-top: 2px dashed #333; padding-top: 7px; margin-top: 7px; font-size: 15px; }
        .advance-row { color: #15803d; font-weight: 700; }
        .collect-box { background: #fef2f2; border: 2px solid #fca5a5; border-radius: 6px; padding: 10px; text-align: center; margin-top: 10px; }
        .collect-box p { font-size: 14px; font-weight: 900; text-transform: uppercase; color: #7f1d1d; }
        .footer { text-align: center; font-size: 10px; color: #777; border-top: 1.5px dashed #aaa; padding-top: 10px; margin-top: 14px; }
        .items-header { display:flex; justify-content:space-between; font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing: ${isUrdu ? '0' : '1px'}; color:#888; padding:0 0 4px; direction: ${direction}; }
        .cancel-box { grid-column:span 2; background:#fef2f2; border:1px solid #fca5a5; border-radius:4px; padding:8px; margin-top:4px; text-align: ${isUrdu ? 'right' : 'left'}; }
        .delivery-addr { font-size:11px; background:#eff6ff; border:1px solid #bfdbfe; padding:5px 8px; border-radius:4px; word-break:break-word; margin-top:4px; text-align: ${isUrdu ? 'right' : 'left'}; }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoHTMLForPrint}
        <div class="doc-title">${isUrdu ? 'آرڈر کی تفصیلات' : 'Order Details'}</div>
      </div>

      <!-- Order Info -->
      <div class="section-title">${isUrdu ? 'آرڈر کی معلومات' : 'Order Information'}</div>
      <div class="info-grid">
        <div>
          <div class="info-label">${isUrdu ? 'آرڈر آئی ڈی' : 'Order ID'}</div>
          <div class="info-value" style="font-size:10px;word-break:break-all;">${order.id}</div>
        </div>
        <div>
          <div class="info-label">${isUrdu ? 'آرڈر کی قسم' : 'Order Type'}</div>
          <div class="info-value" style="text-transform:uppercase;">${getOrderTypeLabel(order.type)}</div>
        </div>
        <div>
          <div class="info-label">${isUrdu ? 'تاریخ اور وقت' : 'Date & Time'}</div>
          <div class="info-value">${new Date(order.createdAt).toLocaleDateString('en-GB')} ${new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div>
          <div class="info-label">${isUrdu ? 'حیثیت' : 'Status'}</div>
          <span class="badge" style="${getStatusBadgeStyle(order.status)}">${getStatusLabel(order.status, lang)}</span>
        </div>
        ${order.status === 'cancelled' && order.cancellationReason
          ? `<div class="cancel-box"><div style="font-size:10px;color:#7f1d1d;font-weight:700;">${isUrdu ? 'منسوخی کی وجہ:' : 'Cancellation Reason:'}</div><div style="font-size:11px;color:#b91c1c;font-style:italic;margin-top:2px;">"${order.cancellationReason}"</div></div>`
          : ''}
      </div>

      <!-- Customer Info -->
      <div class="section-title">${isUrdu ? 'کسٹمر کی معلومات' : 'Customer Information'}</div>
      <div class="row"><span class="muted">${isUrdu ? 'گاہک کا نام' : 'Customer Name'}</span><span class="bold">${order.customerName}</span></div>
      <div class="row"><span class="muted">${isUrdu ? 'فون نمبر' : 'Phone Number'}</span><span class="bold" style="font-family:monospace;">${order.phone}</span></div>
      ${order.deliveryAddress ? `<div style="margin-top:4px;text-align:${isUrdu ? 'right' : 'left'};"><span style="font-size:10px;color:#666;">${isUrdu ? 'ڈیلیوری کا پتہ:' : 'Delivery Address:'}</span><div class="delivery-addr">${translateText(order.deliveryAddress, lang)}</div></div>` : ''}
      ${order.deliveryPersonnel ? `<div class="row" style="margin-top:4px;"><span class="muted">${isUrdu ? 'ڈیلیوری کنندہ' : 'Delivery By'}</span><span class="bold">${order.deliveryPersonnel}</span></div>` : ''}

      <!-- Items -->
      <div class="section-title">${isUrdu ? 'آرڈر کی اشیاء' : 'Order Items'}</div>
      <div class="items-header"><span>${isUrdu ? 'چیز / آئٹم' : 'Item'}</span><span>${isUrdu ? 'رقم' : 'Amount'}</span></div>
      ${itemsHTMLForPrint}

      <!-- Totals -->
      <div style="border-top:2.5px dashed #333;margin-top:10px;padding-top:10px;">
        ${hasDiscount ? `
          <div class="total-row">
            <span>${originalSubtotalLabel}</span>
            <span>Rs.${Number(originalSubtotal).toLocaleString()}${hasPendingItems ? (isUrdu ? ' + تصدیق طلب' : ' + TBD') : ''}</span>
          </div>
          ${itemDiscountsTotal > 0 ? `
            <div class="row" style="color:#15803d;margin-top:5px;font-weight:700;">
              <span>${itemDiscountLabel}</span>
              <span>- Rs.${Number(itemDiscountsTotal).toLocaleString()}</span>
            </div>
          ` : ''}
          ${couponDiscount > 0 ? `
            <div class="row" style="color:#15803d;margin-top:5px;font-weight:700;">
              <span>${couponDiscountLabel}</span>
              <span>- Rs.${Number(couponDiscount).toLocaleString()}</span>
            </div>
          ` : ''}
          <div class="total-row" style="border-top:1px dashed #ccc;padding-top:7px;margin-top:7px;font-size:14px;color:#15803d;font-weight:900;">
            <span>${grandTotalAfterDiscountLabel}</span>
            <span>Rs.${Number(order.total).toLocaleString()}</span>
          </div>
        ` : `
          <div class="total-row">
            <span>${subtotalLabel}</span>
            <span>Rs.${Number(order.total).toLocaleString()}${hasPendingItems ? (isUrdu ? ' + تصدیق طلب' : ' + TBD') : ''}</span>
          </div>
        `}
        ${order.advancePayment && order.advancePayment > 0 ? `
          <div class="row advance-row" style="margin-top:5px;">
            <span>${advancePaidLabel}</span>
            <span>- Rs.${Number(order.advancePayment).toLocaleString()}</span>
          </div>
        ` : ''}
        ${remainingBalance > 0 ? `
          <div class="total-row due-row">
            <span>${remainingDueLabel}</span>
            <span>Rs.${Number(remainingBalance).toLocaleString()}</span>
          </div>
        ` : ''}
      </div>

      <!-- Payment -->
      <div class="section-title">${isUrdu ? 'ادائیگی کی معلومات' : 'Payment Information'}</div>
      <div class="row"><span class="muted">${paymentMethodLabel}</span><span class="bold" style="text-transform:uppercase;">${paymentMethodValue}</span></div>
      <div class="row"><span class="muted">${paymentStatusLabel}</span>
        <span style="font-weight:900;text-transform:uppercase;${order.paymentStatus === 'paid' ? 'color:#15803d;' : order.paymentStatus === 'partial' ? 'color:#1d4ed8;' : 'color:#d97706;'}">
          ${paymentStatusValue}
        </span>
      </div>
      ${order.paymentStatus === 'paid' && order.transactionId ? `<div class="row"><span class="muted">${isUrdu ? 'ٹرانزیکشن آئی ڈی' : 'Transaction ID'}</span><span style="font-family:monospace;font-size:10px;">${order.transactionId}</span></div>` : ''}
      ${order.paymentStatus !== 'paid' && remainingBalance > 0 ? `<div class="collect-box"><p>${collectPaymentText}</p></div>` : ''}

      <div class="footer">
        <p>${printedDateText}</p>
        <p style="margin-top:4px;">${thankYouText}</p>
        <p style="font-weight:700;margin-top:2px;">${logoName} — ${logoTagline}</p>
      </div>
    </body>
    </html>
  `;
  };

  const handleWhatsAppShare = () => {
    const isUrdu = lang === 'ur';
    const lineBreak = "%0A";
    const remainingBal = order.total - (order.advancePayment || 0);
    const dateStrFormatted = new Date(order.createdAt).toLocaleDateString('en-GB');
    const timeStrFormatted = new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    let message = "";
    if (isUrdu) {
      message += `*🧾 ${translateText(storeSettings.name, 'ur')} - ڈیجیٹل بل*${lineBreak}`;
      message += `─────────────────────────${lineBreak}`;
      message += `📅 *تاریخ:* ${dateStrFormatted}   ⏰ *وقت:* ${timeStrFormatted}${lineBreak}`;
      message += `🔢 *آرڈر نمبر:* ${order.id.slice(-6)}${lineBreak}`;
      message += `👤 *گاہک:* ${order.customerName}${lineBreak}`;
      message += `─────────────────────────${lineBreak}`;
      message += `*🛒 آرڈر کی تفصیلات:*${lineBreak}`;
      order.items.forEach(item => {
        if (item.isWeightPending) {
          message += `▫️ *${translateText(item.name || item.service?.name, 'ur')}*${lineBreak}`;
          message += `    _وزن کی تصدیق دکان پر کی جائے گی_${lineBreak}`;
        } else {
          const itemPrice = item.price_at_purchase || item.service?.price;
          const itemUnit = translateUnit(item.unit || item.service?.unit || 'unit', item.quantity, 'ur');
          const itemName = translateText(item.name || item.service?.name, 'ur');
          message += `▫️ *${itemName}*${lineBreak}`;
          const customText = getCustomizationsText(item);
          if (customText) {
             message += `    _(${customText})_${lineBreak}`;
          }
          message += `    ${item.quantity} ${itemUnit} x Rs.${itemPrice} = *Rs.${(item.quantity * itemPrice).toLocaleString()}*${lineBreak}`;
          
          if (item.is_rental === 1 || item.is_rental === '1' || item.isRental) {
             message += `    🗓️ _کرایہ: ${item.rental_days} دن (${item.rental_start_date} سے ${item.rental_end_date})_${lineBreak}`;
             message += `    💰 _شرح: Rs. ${Number(item.rental_price_per_day).toLocaleString()}/دن | سیکیورٹی ڈپازٹ: Rs. ${Number(item.security_deposit).toLocaleString()}_${lineBreak}`;
          }
        }
      });
      message += `─────────────────────────${lineBreak}`;
      if (hasPendingItems) {
        message += `*⚠️ فائنل بل وزن کے بعد تیار ہوگا*${lineBreak}`;
      } else {
        if (hasDiscount) {
          message += `*سب ٹوٹل:* Rs.${originalSubtotal.toLocaleString()}${lineBreak}`;
          if (itemDiscountsTotal > 0) {
            message += `🏷️ *پروڈکٹ ڈسکاؤنٹ:* -Rs.${itemDiscountsTotal.toLocaleString()}${lineBreak}`;
          }
          if (couponDiscount > 0) {
            message += `🏷️ *کوپن ڈسکاؤنٹ (${order.couponCode || 'PROMO'}):* -Rs.${couponDiscount.toLocaleString()}${lineBreak}`;
          }
        }
        message += `*💰 کل رقم: Rs.${order.total.toLocaleString()}*${lineBreak}`;
      }
      const advancePaid = parseFloat(order.advancePayment || order.amount_paid) || 0;
      if (advancePaid > 0)
        message += `✅ *ایڈوانس ادائیگی: Rs.${advancePaid.toLocaleString()}*${lineBreak}`;
      if (remainingBal > 0 && !hasPendingItems)
        message += `❗ *بقایا رقم: Rs.${remainingBal.toLocaleString()}*${lineBreak}`;
      message += `─────────────────────────${lineBreak}`;
      if (order.type === 'delivery')
        message += `🚚 *ڈیلیوری کا پتہ:* ${order.deliveryAddress || 'فراہم نہیں کیا گیا'}${lineBreak}`;
      message += `📍 ${translateText(storeSettings.address, 'ur')}${lineBreak}📞 ${storeSettings.phone}${lineBreak}`;
      message += `🌾 _${translateText(storeSettings.tagline, 'ur')}_`;
    } else {
      message += `*🧾 ${storeSettings.name.toUpperCase()} - DIGITAL INVOICE*${lineBreak}`;
      message += `─────────────────────────${lineBreak}`;
      message += `📅 *Date:* ${dateStrFormatted}   ⏰ *Time:* ${timeStrFormatted}${lineBreak}`;
      message += `🔢 *Order No:* ${order.id.slice(-6)}${lineBreak}`;
      message += `👤 *Customer:* ${order.customerName}${lineBreak}`;
      message += `─────────────────────────${lineBreak}`;
      message += `*🛒 ORDER SUMMARY:*${lineBreak}`;
      order.items.forEach(item => {
        if (item.isWeightPending) {
          message += `▫️ *${item.service.name}*${lineBreak}`;
          message += `    _Weight to be confirmed at shop_${lineBreak}`;
        } else {
          const itemPrice = item.price_at_purchase || item.service?.price;
          const itemUnit = item.unit || item.service?.unit || 'unit';
          const itemName = item.name || item.service?.name;
          message += `▫️ *${itemName}*${lineBreak}`;
          const customText = getCustomizationsText(item);
          if (customText) {
             message += `    _(${customText})_${lineBreak}`;
          }
          message += `    ${item.quantity} ${itemUnit} x Rs.${itemPrice} = *Rs.${(item.quantity * itemPrice).toLocaleString()}*${lineBreak}`;
          
          if (item.is_rental === 1 || item.is_rental === '1' || item.isRental) {
             message += `    🗓️ _Rental: ${item.rental_days} days (${item.rental_start_date} to ${item.rental_end_date})_${lineBreak}`;
             message += `    💰 _Rate: Rs. ${Number(item.rental_price_per_day).toLocaleString()}/day | Deposit: Rs. ${Number(item.security_deposit).toLocaleString()}_${lineBreak}`;
          }
        }
      });
      message += `─────────────────────────${lineBreak}`;
      if (hasPendingItems) {
        message += `*⚠️ FINAL TOTAL PENDING*${lineBreak}`;
      } else {
        if (hasDiscount) {
          message += `*Subtotal:* Rs.${originalSubtotal.toLocaleString()}${lineBreak}`;
          if (itemDiscountsTotal > 0) {
            message += `🏷️ *Product Discount:* -Rs.${itemDiscountsTotal.toLocaleString()}${lineBreak}`;
          }
          if (couponDiscount > 0) {
            message += `🏷️ *Coupon Discount (${order.couponCode || 'PROMO'}):* -Rs.${couponDiscount.toLocaleString()}${lineBreak}`;
          }
        }
        message += `*💰 GRAND TOTAL: Rs.${order.total.toLocaleString()}*${lineBreak}`;
      }
      const advancePaid = parseFloat(order.advancePayment || order.amount_paid) || 0;
      if (advancePaid > 0)
        message += `✅ *Advance Paid: Rs.${advancePaid.toLocaleString()}*${lineBreak}`;
      if (remainingBal > 0 && !hasPendingItems)
        message += `❗ *BALANCE DUE: Rs.${remainingBal.toLocaleString()}*${lineBreak}`;
      message += `─────────────────────────${lineBreak}`;
      if (order.type === 'delivery')
        message += `🚚 *Delivery Address:* ${order.deliveryAddress || 'Not provided'}${lineBreak}`;
      message += `📍 ${storeSettings.address}${lineBreak}📞 ${storeSettings.phone}${lineBreak}`;
      message += `🌾 _${storeSettings.tagline}_`;
    }

    let phone = order.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '92' + phone.slice(1);
    else if (!phone.startsWith('92')) phone = '92' + phone;
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handlePrint = () => {
    const printWin = window.open('', '_blank', 'width=700,height=800');
    printWin.document.open();
    printWin.document.write(buildPrintHTML());
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-lg p-0 gap-0 overflow-hidden ${lang === 'ur' ? 'text-right' : 'text-left'}`}
        hideCloseButton
      >
        {/* Dialog Header with Logo */}
        <DialogHeader className="px-6 pt-4 pb-3 border-b border-border/50 bg-gradient-to-r from-amber-900/10 to-amber-800/5">
          <div className="flex items-center justify-between" dir={lang === 'ur' ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-3">
              <HeaderLogo size={40} />
              <div className={lang === 'ur' ? 'text-right' : 'text-left'}>
                <DialogTitle className={`text-sm font-black uppercase ${lang === 'ur' ? 'tracking-normal text-right' : 'tracking-wide'}`}>
                  {translateText(storeSettings.name, lang)}
                </DialogTitle>
                <p className={`text-[10px] text-muted-foreground ${lang === 'ur' ? 'text-right' : ''}`}>
                  {lang === 'ur' ? 'آرڈر کی مکمل تفصیلات' : 'Full Order Details'}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* ── Scrollable Bill Preview ── */}
        <div className="overflow-y-auto" style={{ maxHeight: '65vh' }}>
          <div 
            className={`${lang === 'en' ? 'font-mono' : ''} text-sm px-6 py-5 space-y-4`}
            dir={lang === 'ur' ? 'rtl' : 'ltr'}
            style={{ 
              direction: lang === 'ur' ? 'rtl' : 'ltr', 
              fontFamily: lang === 'ur' ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaliq', 'Urdu Typesetting', 'Tahoma', 'Arial', sans-serif" : "monospace" 
            }}
          >

            {/* Store Letterhead — Logo centered above text */}
            <div className="pb-4 border-b-2 border-dashed border-border">
              <div className="flex flex-col items-center text-center gap-2 mb-2.5">
                <HeaderLogo size={50} />
                <div>
                  <h2 className={`text-base font-black uppercase ${lang === 'ur' ? 'tracking-normal' : 'tracking-widest'}`}>
                    {translateText(storeSettings.name, lang)}
                  </h2>
                  <p className={`text-[9px] text-muted-foreground mt-0.5 uppercase ${lang === 'ur' ? 'tracking-normal' : 'tracking-wider'}`}>
                    {translateText(storeSettings.tagline, lang)}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    📍 {translateText(storeSettings.address, lang)} &nbsp;|&nbsp; 📞 {storeSettings.phone}
                  </p>
                </div>
              </div>
              <div className="text-center mt-2.5">
                <div className="inline-block border border-border rounded px-3 py-0.5">
                  <p className={`text-[9px] font-bold uppercase ${lang === 'ur' ? 'tracking-normal' : 'tracking-widest'}`}>
                    {lang === 'ur' ? 'آرڈر کی تفصیلات' : 'Order Details'}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Info Card */}
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div style={{ textAlign: lang === 'ur' ? 'right' : 'left' }}>
                  <p className={`text-[9px] uppercase text-muted-foreground font-bold ${lang === 'ur' ? 'tracking-normal' : 'tracking-wider'}`}>
                    {lang === 'ur' ? 'آرڈر آئی ڈی' : 'Order ID'}
                  </p>
                  <p className="text-[10px] font-mono font-bold mt-0.5 break-all">{order.id}</p>
                </div>
                <div style={{ textAlign: lang === 'ur' ? 'right' : 'left' }}>
                  <p className={`text-[9px] uppercase text-muted-foreground font-bold ${lang === 'ur' ? 'tracking-normal' : 'tracking-wider'}`}>
                    {lang === 'ur' ? 'قسم' : 'Type'}
                  </p>
                  <p className="text-[11px] font-bold uppercase mt-0.5">{getOrderTypeLabel(order.type)}</p>
                </div>
                <div style={{ textAlign: lang === 'ur' ? 'right' : 'left' }}>
                  <p className={`text-[9px] uppercase text-muted-foreground font-bold ${lang === 'ur' ? 'tracking-normal' : 'tracking-wider'}`}>
                    {lang === 'ur' ? 'تاریخ اور وقت' : 'Date & Time'}
                  </p>
                  <p className="text-[10px] font-medium mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('en-GB')}{' '}
                    {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div style={{ textAlign: lang === 'ur' ? 'right' : 'left' }}>
                  <p className={`text-[9px] uppercase text-muted-foreground font-bold ${lang === 'ur' ? 'tracking-normal' : 'tracking-wider'}`}>
                    {lang === 'ur' ? 'حیثیت' : 'Status'}
                  </p>
                  <span className={`inline-block mt-0.5 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${getStatusColorClass(order.status)}`}>
                    {getStatusLabel(order.status, lang)}
                  </span>
                </div>
                {order.status === 'cancelled' && order.cancellationReason && (
                  <div className="col-span-2 bg-red-50 border border-red-300 rounded-lg p-2.5 mt-1" style={{ textAlign: lang === 'ur' ? 'right' : 'left' }}>
                    <p className={`text-[9px] uppercase text-red-500 font-bold mb-0.5 ${lang === 'ur' ? 'tracking-normal' : 'tracking-wider'}`}>
                      {lang === 'ur' ? 'منسوخی کی وجہ' : 'Cancellation Reason'}
                    </p>
                    <p className="text-[11px] text-red-700 italic">"{order.cancellationReason}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Customer */}
            <div>
              <p className={`text-[9px] font-bold uppercase text-muted-foreground border-b border-dashed border-border pb-1.5 mb-2.5 ${lang === 'ur' ? 'tracking-normal' : 'tracking-widest'}`}>
                👤 {lang === 'ur' ? 'کسٹمر کی معلومات' : 'Customer Information'}
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{lang === 'ur' ? 'گاہک کا نام' : 'Customer Name'}</span>
                  <span className="font-bold">{order.customerName}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{lang === 'ur' ? 'فون نمبر' : 'Phone Number'}</span>
                  <span className="font-mono font-semibold">{order.phone}</span>
                </div>
                {order.deliveryAddress && (
                  <div style={{ textAlign: lang === 'ur' ? 'right' : 'left' }}>
                    <p className="text-muted-foreground text-[9px] mb-1">{lang === 'ur' ? 'ڈیلیوری کا پتہ' : 'Delivery Address'}</p>
                    <p className="text-[11px] bg-blue-50 border border-blue-200 p-2 rounded-lg whitespace-normal break-words">
                      {translateText(order.deliveryAddress, lang)}
                    </p>
                  </div>
                )}
                {order.deliveryPersonnel && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">{lang === 'ur' ? 'ڈیلیوری کنندہ' : 'Delivery By'}</span>
                    <span className="font-semibold">{order.deliveryPersonnel}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div>
              <p className={`text-[9px] font-bold uppercase text-muted-foreground border-b-2 border-dashed border-border pb-1.5 mb-2.5 ${lang === 'ur' ? 'tracking-normal' : 'tracking-widest'}`}>
                🛒 {lang === 'ur' ? 'آرڈر کی اشیاء' : 'Order Items'}
              </p>
              <div className={`flex justify-between text-[9px] uppercase text-muted-foreground font-bold px-0.5 mb-1.5 ${lang === 'ur' ? 'tracking-normal' : 'tracking-wide'}`}>
                <span>{lang === 'ur' ? 'آئٹم' : 'Item'}</span>
                <span>{lang === 'ur' ? 'رقم' : 'Amount'}</span>
              </div>
              <div className="space-y-2">
                {order.items.map((item, idx) => {
                  const isRental = item.is_rental === 1 || item.is_rental === '1' || item.isRental;
                  return (
                    <div key={idx} className="flex justify-between items-start border-b border-dashed border-border/50 pb-2 last:border-0">
                      <div className={`flex-1 ${lang === 'ur' ? 'pl-4' : 'pr-4'}`} style={{ textAlign: lang === 'ur' ? 'right' : 'left' }}>
                        <p className="text-[12px] font-semibold whitespace-normal break-words">
                          {translateText(item.name || item.service?.name, lang)} {isRental && `(${lang === 'ur' ? 'کرایہ' : 'Rental'})`}
                        </p>
                        {isRental ? (
                          <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5" style={{ textAlign: lang === 'ur' ? 'right' : 'left' }}>
                            <p>🗓️ {lang === 'ur' ? 'مدت کرایہ:' : 'Rental Period:'} {item.rental_days} {lang === 'ur' ? 'دن' : 'days'} ({item.rental_start_date} {lang === 'ur' ? 'سے' : 'to'} {item.rental_end_date})</p>
                            <p>💰 {lang === 'ur' ? 'شرح کرایہ:' : 'Rate:'} Rs. {Number(item.rental_price_per_day || item.price_at_purchase).toLocaleString()}/{lang === 'ur' ? 'دن' : 'day'}</p>
                            <p>🛡️ {lang === 'ur' ? 'سیکیورٹی ڈپازٹ:' : 'Security Deposit:'} Rs. {Number(item.security_deposit).toLocaleString()}</p>
                            {parseFloat(item.runningPenalty || item.late_penalty_total || 0) > 0 && (
                              <p className="text-red-600 font-bold">⚠️ {lang === 'ur' ? 'بقایا جرمانہ:' : 'Late Penalty:'} Rs. {Number(item.runningPenalty || item.late_penalty_total).toLocaleString()}</p>
                            )}
                          </div>
                        ) : (
                          <>
                            {(item.customizations?.length > 0 || item.is_cleaning == 1 || item.is_grinding == 1) && (
                              <p className="text-[9px] text-muted-foreground italic mt-0.5">
                                 ({getCustomizationsText(item)})
                              </p>
                            )}
                            {item.isWeightPending ? (
                              <p className="text-[10px] text-orange-600 font-bold mt-0.5">
                                ⚠ {lang === 'ur' ? 'وزن کی تصدیق باقی ہے' : 'WEIGHT TO BE CONFIRMED'}
                              </p>
                            ) : (() => {
                              const iPrice = item.price_at_purchase || item.service?.price || 0;
                              const oPrice = item.original_price || null;
                              const hasDisc = oPrice && oPrice > iPrice;
                              const unitText = translateUnit(item.unit || item.service?.unit || 'unit', item.quantity, lang);
                              return (
                                <p className="text-[10px] mt-0.5 flex items-center gap-1 flex-wrap">
                                  <span className="text-muted-foreground">{item.quantity} {unitText} ×</span>
                                  {hasDisc ? (
                                    <>
                                      <span className="line-through text-muted-foreground">Rs.{Number(oPrice).toLocaleString()}</span>
                                      <span className="text-green-600 font-bold">Rs.{Number(iPrice).toLocaleString()}</span>
                                      <span className="text-green-600 text-[9px] font-bold bg-green-50 border border-green-200 px-1 rounded">
                                        🏷 {lang === 'ur' ? 'ڈسکاؤنٹ' : 'DISC'}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground">Rs.{Number(iPrice).toLocaleString()}</span>
                                  )}
                                </p>
                              );
                            })()}
                          </>
                        )}
                      </div>
                      {!item.isWeightPending && (
                        <p className="text-[12px] font-bold whitespace-nowrap">
                          Rs.{isRental 
                            ? (Number(item.rental_days) * Number(item.rental_price_per_day || item.price_at_purchase)).toLocaleString()
                            : (item.quantity * (item.price_at_purchase || item.service?.price || 0)).toLocaleString()
                          }
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
              {hasDiscount ? (
                <>
                  <div className="flex justify-between text-[13px] font-bold text-muted-foreground">
                    <span>{lang === 'ur' ? 'سب ٹوٹل (اصل قیمت)' : 'SUBTOTAL (ORIGINAL PRICE)'}</span>
                    <span className="whitespace-nowrap">
                      Rs.{Number(originalSubtotal).toLocaleString()}
                      {hasPendingItems && <span className="text-orange-500">{lang === 'ur' ? ' + تصدیق طلب' : ' + TBD'}</span>}
                    </span>
                  </div>
                  {itemDiscountsTotal > 0 && (
                    <div className="flex justify-between text-[12px] text-green-600 font-bold">
                      <span>{lang === 'ur' ? 'پروڈکٹ ڈسکاؤنٹ' : 'PRODUCT DISCOUNT'}</span>
                      <span className="whitespace-nowrap">- Rs.{Number(itemDiscountsTotal).toLocaleString()}</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-[12px] text-green-600 font-bold">
                      <span>
                        {lang === 'ur' ? `کوپن ڈسکاؤنٹ (${order.couponCode || 'PROMO'})` : `COUPON DISCOUNT (${order.couponCode || 'PROMO'})`}
                      </span>
                      <span className="whitespace-nowrap">- Rs.{Number(couponDiscount).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[14px] font-black pt-2 border-t border-dashed border-border text-green-700">
                    <span>{lang === 'ur' ? 'کل رقم (ڈسکاؤنٹ کے بعد)' : 'GRAND TOTAL (AFTER DISCOUNT)'}</span>
                    <span className="whitespace-nowrap">Rs.{Number(order.total).toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-[13px] font-bold">
                  <span>{lang === 'ur' ? 'سب ٹوٹل' : 'SUBTOTAL'}</span>
                  <span className="whitespace-nowrap">
                    Rs.{Number(order.total).toLocaleString()}
                    {hasPendingItems && <span className="text-orange-500">{lang === 'ur' ? ' + تصدیق طلب' : ' + TBD'}</span>}
                  </span>
                </div>
              )}

              {parseFloat(order.advancePayment) > 0 && (
                <div className="flex justify-between text-[12px]">
                  <span className="text-muted-foreground">{lang === 'ur' ? 'ایڈوانس ادائیگی' : 'ADVANCE PAID'}</span>
                  <span className="text-green-600 font-bold whitespace-nowrap">- Rs.{Number(order.advancePayment).toLocaleString()}</span>
                </div>
              )}
              {remainingBalance > 0 && (
                <div className="flex justify-between text-[15px] font-black pt-2 border-t-2 border-dashed border-border">
                  <span className="text-red-600">{lang === 'ur' ? 'بقایا رقم' : 'REMAINING DUE'}</span>
                  <span className="text-red-600 whitespace-nowrap">Rs.{Number(remainingBalance).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Payment */}
            <div>
              <p className={`text-[9px] font-bold uppercase text-muted-foreground border-b border-dashed border-border pb-1.5 mb-2.5 ${lang === 'ur' ? 'tracking-normal' : 'tracking-widest'}`}>
                💳 {lang === 'ur' ? 'ادائیگی کی معلومات' : 'Payment Information'}
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{lang === 'ur' ? 'ادائیگی کا طریقہ' : 'Payment Method'}</span>
                  <span className="uppercase font-bold">
                    {getPaymentMethodLabel(order.paymentMethod)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{lang === 'ur' ? 'ادائیگی کی صورتحال' : 'Payment Status'}</span>
                  <span className={`uppercase font-black ${order.paymentStatus === 'paid' ? 'text-green-600' : order.paymentStatus === 'partial' ? 'text-blue-600' : 'text-orange-500'}`}>
                    {getPaymentStatusLabel(order.paymentStatus)}
                  </span>
                </div>
                {order.paymentStatus === 'paid' && order.transactionId && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">{lang === 'ur' ? 'ٹرانزیکشن آئی ڈی' : 'Transaction ID'}</span>
                    <span className="font-mono text-[10px]">{order.transactionId}</span>
                  </div>
                )}
              </div>
              {order.paymentStatus !== 'paid' && remainingBalance > 0 && (
                <div className="mt-3 bg-red-50 border-2 border-red-300 rounded-xl p-3 text-center">
                  <p className="text-red-900 font-black text-[13px] uppercase tracking-wide">
                    ⚠ {lang === 'ur' ? 'رقم وصول کریں:' : 'COLLECT PAYMENT:'} Rs.{Number(remainingBalance).toLocaleString()}{hasPendingItems && (lang === 'ur' ? ' (+ تصدیق طلب)' : ' (+ TBD)')}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-dashed border-border pt-3 text-center space-y-0.5">
              <p className="text-[9px] text-muted-foreground">
                {lang === 'ur' ? 'پرنٹ کی تاریخ:' : 'Printed:'} {new Date().toLocaleDateString('en-GB')} {lang === 'ur' ? 'بجے' : 'at'} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-[9px] text-muted-foreground">
                {lang === 'ur' ? '🙏 ہمارے کاروبار پر بھروسہ کرنے کا شکریہ!' : '🙏 Thank you for your business!'}
              </p>
              <p className="text-[9px] text-muted-foreground font-bold">
                {translateText(storeSettings.name, lang)} — {translateText(storeSettings.tagline, lang)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Sticky Action Buttons ── */}
        <div className="flex gap-2.5 px-6 py-4 border-t border-border/50 bg-background" dir={lang === 'ur' ? 'rtl' : 'ltr'}>
          <Button onClick={handlePrint} className="flex-1 bg-primary hover:bg-primary/90 text-sm h-9">
            <Printer className={`h-4 w-4 ${lang === 'ur' ? 'ml-2' : 'mr-2'}`} />
            {lang === 'ur' ? 'پرنٹ کریں' : 'Print Details'}
          </Button>

          <Button onClick={handleWhatsAppShare} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm h-9">
            <MessageCircle className={`h-4 w-4 ${lang === 'ur' ? 'ml-2' : 'mr-2'}`} />
            {lang === 'ur' ? 'واٹس ایپ' : 'WhatsApp'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
            className="flex items-center gap-2 px-3 min-w-[80px] justify-center border-input bg-transparent hover:bg-accent hover:text-accent-foreground"
          >
            <Languages className="h-4 w-4" />
            <span className="font-semibold text-xs">
              {lang === 'en' ? 'اردو' : 'English'}
            </span>
          </Button>

          <Button onClick={onClose} variant="outline" className="flex-1 text-sm h-9">
            {lang === 'ur' ? 'بند کریں' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}




