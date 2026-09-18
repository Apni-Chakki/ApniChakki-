import { translateSlipUnit, translateSlipCustomizations } from './slipUrduHelpers';

/**
 * Builds standalone 80mm thermal receipt HTML for iframe printing
 */
export function buildThermalPrintHtml({
  order,
  storeSettings,
  financials,
  dateStr,
  timeStr,
  language = 'en'
}) {
  const isUrdu = language === 'ur';
  const {
    slipTotal,
    hasPendingItems,
    remainingBalance,
    itemDiscountsTotal,
    itemsSubtotal,
    couponDiscount,
    deliveryFee
  } = financials;

  const items = order.items || [];

  const itemsHTML = items.map(item => {
    if (item.isWeightPending) {
      return `
        <div style="border-bottom:1px dashed #ccc;padding:6px 0;text-align:${isUrdu ? 'right' : 'left'};">
          <div style="font-weight:600;font-size:12px;">${item.service?.name || item.name}</div>
          <div style="color:#d97706;font-size:10px;font-weight:700;">⚠ ${isUrdu ? 'وزن کی تصدیق باقی ہے' : 'WEIGHT TO BE CONFIRMED'}</div>
        </div>`;
    }
    const itemPrice = item.price_at_purchase || item.service?.price || 0;
    const origPrice = item.original_price || null;
    const hasItemDiscount = origPrice && origPrice > itemPrice;
    const lineTotal = item.quantity * itemPrice;
    const custs = translateSlipCustomizations(item, isUrdu);

    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px dashed #ccc;padding:6px 0;direction:${isUrdu ? 'rtl' : 'ltr'};">
        <div style="flex:1;padding-${isUrdu ? 'left' : 'right'}:8px;text-align:${isUrdu ? 'right' : 'left'};">
          <div style="font-weight:600;font-size:12px;">${item.name || item.service?.name}</div>
          ${custs ? `
            <div style="color:#666;font-size:9px;font-style:italic;margin-bottom:2px;">
              (${custs})
            </div>
          ` : ''}
          <div style="font-size:10px;">
            ${item.quantity} ${translateSlipUnit(item.service?.unit || item.unit, isUrdu)} ×
            ${hasItemDiscount
              ? `<span style="text-decoration:line-through;color:#999;">Rs.${Number(origPrice).toLocaleString()}</span> <span style="color:#15803d;font-weight:700;">Rs.${Number(itemPrice).toLocaleString()}</span>`
              : `<span style="color:#555;">Rs.${Number(itemPrice).toLocaleString()}</span>`
            }
          </div>
        </div>
        <div style="text-align:${isUrdu ? 'left' : 'right'};">
          <div style="font-weight:700;white-space:nowrap;font-size:12px;">Rs.${Number(lineTotal).toLocaleString()}</div>
          ${hasItemDiscount ? `<div style="font-size:8px;color:#15803d;font-weight:700;">${isUrdu ? '🏷 رعایت' : '🏷 Disc.'}</div>` : ''}
        </div>
      </div>`;
  }).join('');

  const logoHTMLForPrint = `
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 0 8px;direction:${isUrdu ? 'rtl' : 'ltr'};">
      ${storeSettings.logo ? `
        <img src="${storeSettings.logo}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;flex-shrink:0;" />
      ` : `
        <svg width="52" height="52" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
          <circle cx="32" cy="32" r="32" fill="#8b6f47"/>
          <g transform="translate(14, 14) scale(1.5)" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 22 16 8"/>
            <path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/>
            <path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/>
            <path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/>
            <path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z"/>
            <path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/>
            <path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/>
            <path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1 4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/>
          </g>
        </svg>
      `}
      <div style="text-align:${isUrdu ? 'right' : 'left'};">
        <div style="font-size:16px;font-weight:900;letter-spacing:${isUrdu ? '0' : '2px'};color:#1a1a1a;text-transform:uppercase;">${storeSettings.name}</div>
        <div style="font-size:10px;color:#666;letter-spacing:${isUrdu ? '0' : '1px'};margin-top:2px;">${storeSettings.tagline}</div>
        <div style="font-size:10px;color:#666;margin-top:1px;">📞 ${storeSettings.phone}</div>
      </div>
    </div>
  `;

  const orderTypeLabel = order.type === 'pickup'
    ? (isUrdu ? 'دکان سے وصولی' : 'PICKUP')
    : (isUrdu ? 'ہوم ڈیلیوری' : 'DELIVERY');

  const paymentMethodLabel = order.paymentMethod === 'cash'
    ? (isUrdu ? 'نقد (کیش)' : 'CASH')
    : (order.paymentMethod || 'CASH');

  const paymentStatusLabel = order.paymentStatus === 'paid'
    ? (isUrdu ? '✓ ادا شدہ' : '✓ PAID')
    : order.paymentStatus === 'partial'
    ? (isUrdu ? 'جزوی ادائیگی' : 'PARTIAL')
    : (isUrdu ? '✗ غیر ادا شدہ' : '✗ UNPAID');

  const deliveryFeeText = deliveryFee > 0
    ? `+ Rs.${Number(deliveryFee).toLocaleString()}`
    : (order.type === 'delivery' ? (isUrdu ? 'روپے 0 (مفت)' : 'Rs. 0 (FREE)') : 'Rs. 0');

  return `
    <!DOCTYPE html>
    <html dir="${isUrdu ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="utf-8"/>
      <title>Order Slip — ${String(order.id).slice(-8).toUpperCase()}</title>
      <style>
        @page { size: 80mm auto; margin: 4mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: ${isUrdu ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Segoe UI', Tahoma, Arial, sans-serif" : "'Courier New', monospace"};
          font-size: 12px;
          color: #111;
          background: #fff;
          direction: ${isUrdu ? 'rtl' : 'ltr'};
        }
        .divider { border: none; border-top: 1.5px dashed #aaa; margin: 8px 0; }
        .divider-heavy { border: none; border-top: 2px dashed #555; margin: 8px 0; }
        .header { text-align: center; padding-bottom: 8px; border-bottom: 2px dashed #555; }
        .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: ${isUrdu ? '0' : '2px'}; color: #666; border-bottom: 1px dashed #ccc; padding-bottom: 3px; margin-bottom: 6px; margin-top: 8px; text-align: ${isUrdu ? 'right' : 'left'}; }
        .row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
        .muted { color: #666; }
        .bold { font-weight: 700; }
        .total-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; margin-top: 6px; }
        .due-row { font-size: 14px; font-weight: 900; color: #b91c1c; border-top: 2px dashed #555; padding-top: 6px; margin-top: 6px; }
        .advance-row { color: #15803d; font-weight: 700; }
        .collect-box { background: #fff7ed; border: 2px solid #f97316; border-radius: 6px; padding: 8px; text-align: center; margin-top: 8px; }
        .collect-box p { font-size: 12px; font-weight: 900; text-transform: uppercase; color: #7c2d12; }
        .footer { text-align: center; font-size: 9px; color: #777; padding-top: 8px; border-top: 1px dashed #ccc; margin-top: 8px; }
        .status-paid { color: #15803d; font-weight: 900; }
        .status-partial { color: #1d4ed8; font-weight: 900; }
        .status-unpaid { color: #d97706; font-weight: 900; }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoHTMLForPrint}
      </div>

      <div class="section-title">${isUrdu ? 'آرڈر کی تفصیلات' : 'Order Info'}</div>
      <div class="row"><span class="muted">${isUrdu ? 'آرڈر نمبر' : 'Order #'}</span><span class="bold">${String(order.id).slice(-8).toUpperCase()}</span></div>
      <div class="row"><span class="muted">${isUrdu ? 'تاریخ' : 'Date'}</span><span>${dateStr}</span></div>
      <div class="row"><span class="muted">${isUrdu ? 'وقت' : 'Time'}</span><span>${timeStr}</span></div>

      <div class="section-title">${isUrdu ? 'گاہک کی تفصیل' : 'Customer'}</div>
      <div class="row"><span class="muted">${isUrdu ? 'نام' : 'Name'}</span><span class="bold">${order.customerName}</span></div>
      <div class="row"><span class="muted">${isUrdu ? 'فون نمبر' : 'Phone'}</span><span style="direction:ltr;">${order.phone}</span></div>
      <div class="row"><span class="muted">${isUrdu ? 'قسم' : 'Type'}</span><span>${orderTypeLabel}</span></div>
      ${order.deliveryAddress ? `<div style="margin-top:4px;font-size:10px;color:#555;">${isUrdu ? 'ترسیل کا پتہ:' : 'Address:'}</div><div style="font-size:11px;background:#f0f9ff;border:1px solid #bae6fd;padding:4px 6px;border-radius:4px;word-break:break-word;">${order.deliveryAddress}</div>` : ''}

      <div class="section-title">${isUrdu ? 'اشیاء کی تفصیل' : 'Items'}</div>
      ${itemsHTML}

      <div class="divider-heavy"></div>
      <div class="row" style="color:#555;font-weight:600;">
        <span>${isUrdu ? 'مصنوعات کا سب ٹوٹل' : 'PRODUCTS SUBTOTAL'}</span>
        <span>Rs.${Number(itemsSubtotal || (slipTotal - deliveryFee + couponDiscount)).toLocaleString()}${hasPendingItems ? (isUrdu ? ' + نامعلوم' : ' + TBD') : ''}</span>
      </div>
      ${itemDiscountsTotal > 0 ? `
        <div class="row" style="color:#15803d;margin-top:3px;font-weight:700;">
          <span>${isUrdu ? 'پروڈکٹ رعایت' : 'PRODUCT DISCOUNT'}</span>
          <span>- Rs.${Number(itemDiscountsTotal).toLocaleString()}</span>
        </div>
      ` : ''}
      ${couponDiscount > 0 ? `
        <div class="row" style="color:#15803d;margin-top:3px;font-weight:700;">
          <span>${isUrdu ? `کوپن رعایت (${order.couponCode || 'پرومو'})` : `COUPON DISCOUNT (${order.couponCode || 'PROMO'})`}</span>
          <span>- Rs.${Number(couponDiscount).toLocaleString()}</span>
        </div>
      ` : ''}
      <div class="row" style="color:#555;font-weight:600;margin-top:3px;">
        <span>${isUrdu ? 'ڈیلیوری فیس' : 'DELIVERY FEE'}</span>
        <span>${deliveryFeeText}</span>
      </div>
      <div class="total-row" style="border-top:1.5px dashed #555;padding-top:4px;margin-top:4px;font-size:13px;color:#15803d;font-weight:900;">
        <span>${isUrdu ? 'کل رقم (ٹوٹل)' : 'GRAND TOTAL'}</span>
        <span>Rs.${Number(slipTotal).toLocaleString()}</span>
      </div>
      ${order.advancePayment && order.advancePayment > 0 ? `<div class="row advance-row" style="margin-top:4px;"><span>${isUrdu ? 'پیشگی ادائیگی' : 'ADVANCE PAID'}</span><span>- Rs.${Number(order.advancePayment).toLocaleString()}</span></div>` : ''}
      ${remainingBalance > 0 ? `<div class="total-row due-row"><span>${isUrdu ? 'واجب الادا رقم (بقایا)' : 'DUE'}</span><span>Rs.${Number(remainingBalance).toLocaleString()}</span></div>` : ''}

      <div class="section-title" style="margin-top:10px;">${isUrdu ? 'ادائیگی کی تفصیل' : 'Payment'}</div>
      <div class="row"><span class="muted">${isUrdu ? 'طریقہ' : 'Method'}</span><span>${paymentMethodLabel}</span></div>
      <div class="row"><span class="muted">${isUrdu ? 'حیثیت' : 'Status'}</span>
        <span class="${order.paymentStatus === 'paid' ? 'status-paid' : order.paymentStatus === 'partial' ? 'status-partial' : 'status-unpaid'}">
          ${paymentStatusLabel}
        </span>
      </div>
      ${order.paymentStatus !== 'paid' && order.paymentMethod === 'cash' && remainingBalance > 0 ? `
        <div class="collect-box">
          <p>💵 ${isUrdu ? `وصول کریں: روپے ${Number(remainingBalance).toLocaleString()}${hasPendingItems ? ' (+ نامعلوم)' : ''}` : `Collect: Rs.${Number(remainingBalance).toLocaleString()}${hasPendingItems ? ' (+ TBD)' : ''}`}</p>
        </div>` : ''}

      <div class="footer">
        <p>${isUrdu ? '🙏 آپ کے آرڈر کا بہت شکریہ!' : '🙏 Thank you for your order!'}</p>
        <p style="margin-top:2px;">${isUrdu ? `دوبارہ ${storeSettings.name} تشریف لائیں` : `Visit ${storeSettings.name} again`}</p>
        <p style="color:#999;margin-top:2px;">${storeSettings.address}</p>
      </div>
    </body>
    </html>
  `;
}

export default buildThermalPrintHtml;
