/**
 * Print-ready HTML generator for order bills. Extracted from PrintOrderDetails.jsx
 * (Phase 3.7b) — behavior preserved exactly.
 *
 * This is a pure function: it takes an order + settings + pre-computed totals and
 * returns an HTML string suitable for `iframe.contentWindow.document.write()`.
 *
 * @param {{
 *   order: any,
 *   lang: 'en' | 'ur',
 *   storeSettings: { name: string, tagline: string, address: string, phone: string, logo?: string },
 *   hasPendingItems: boolean,
 *   itemsSubtotal: number,
 *   itemDiscountsTotal: number,
 *   couponDiscount: number,
 *   deliveryFee: number,
 *   remainingBalance: number,
 * }} params
 * @returns {string} full HTML document
 */

import {
  translateText,
  translateUnit,
  getCustomizationsText,
  getStatusLabel,
  getStatusBadgeStyle,
  getOrderTypeLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from './printOrderHelpers';

export function buildPrintOrderHTML({
  order,
  lang,
  storeSettings,
  hasPendingItems,
  itemsSubtotal,
  itemDiscountsTotal,
  couponDiscount,
  deliveryFee,
  remainingBalance,
}) {
  const isUrdu = lang === 'ur';
  const direction = isUrdu ? 'rtl' : 'ltr';
  const fontFamily = isUrdu
    ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaliq', 'Urdu Typesetting', 'Tahoma', 'Arial', sans-serif"
    : "'Courier New', monospace";

  const logoHTMLForPrint = `
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:14px 0 10px;">
        ${storeSettings.logo ? `
          <img src="${storeSettings.logo}" style="width:50px;height:50px;border-radius:50%;object-fit:cover;flex-shrink:0;margin-bottom:8px;" />
        ` : `
          <div style="width:50px;height:50px;border-radius:50%;background:#8b6f47;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-bottom:8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 22 16 8"/><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z"/><path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/><path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/><path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/>
            </svg>
          </div>
        `}
        <div>
          <div style="font-size:18px;font-weight:900;letter-spacing:${isUrdu ? '0' : '2px'};color:#1a1a1a;text-transform:uppercase;">${translateText(storeSettings.name, lang)}</div>
          <div style="font-size:10px;color:#666;letter-spacing:${isUrdu ? '0' : '1px'};margin-top:2px;">${translateText(storeSettings.tagline, lang)}</div>
          <div style="font-size:10px;color:#666;margin-top:1px;">📍 ${translateText(storeSettings.address, lang)} &nbsp;|&nbsp; 📞 ${storeSettings.phone}</div>
        </div>
      </div>
    `;

  const itemsHTMLForPrint = order.items.map((item) => {
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
    const customText = getCustomizationsText(item, lang);
    const unitText = translateUnit(item.unit || item.service?.unit || 'unit', lang);

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

  const couponDiscountLabel = isUrdu ? `کوپن ڈسکاؤنٹ (${order.couponCode || 'PROMO'})` : `COUPON DISCOUNT (${order.couponCode || 'PROMO'})`;
  const grandTotalLabel = isUrdu ? 'کل رقم' : 'GRAND TOTAL';
  const advancePaidLabel = isUrdu ? 'ایڈوانس ادائیگی' : 'ADVANCE PAID';
  const remainingDueLabel = isUrdu ? 'بقایا رقم' : 'REMAINING DUE';
  const paymentMethodLabel = isUrdu ? 'ادائیگی کا طریقہ' : 'Payment Method';
  const paymentMethodValue = getPaymentMethodLabel(order.paymentMethod, lang);
  const paymentStatusLabel = isUrdu ? 'ادائیگی کی صورتحال' : 'Payment Status';
  const paymentStatusValue = getPaymentStatusLabel(order.paymentStatus, lang);

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
          <div class="info-value" style="text-transform:uppercase;">${getOrderTypeLabel(order.type, lang)}</div>
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
        <div class="row" style="color:#555;font-weight:600;">
          <span>${isUrdu ? 'پروڈکٹ سب ٹوٹل (قیمت)' : 'PRODUCTS SUBTOTAL'}</span>
          <span>Rs.${Number(itemsSubtotal || (order.total - deliveryFee + couponDiscount)).toLocaleString()}${hasPendingItems ? (isUrdu ? ' + تصدیق طلب' : ' + TBD') : ''}</span>
        </div>
        ${itemDiscountsTotal > 0 ? `
          <div class="row" style="color:#15803d;font-weight:700;margin-top:4px;">
            <span>${isUrdu ? 'پروڈکٹ ڈسکاؤنٹ' : 'PRODUCT DISCOUNT'}</span>
            <span>- Rs.${Number(itemDiscountsTotal).toLocaleString()}</span>
          </div>
        ` : ''}
        ${couponDiscount > 0 ? `
          <div class="row" style="color:#15803d;font-weight:700;margin-top:4px;">
            <span>${couponDiscountLabel}</span>
            <span>- Rs.${Number(couponDiscount).toLocaleString()}</span>
          </div>
        ` : ''}
        <div class="row" style="color:#555;font-weight:600;margin-top:4px;">
          <span>${isUrdu ? 'ڈیلیوری فیس' : 'DELIVERY FEE'}</span>
          <span>${deliveryFee > 0 ? `+ Rs.${Number(deliveryFee).toLocaleString()}` : (order.type === 'delivery' ? (isUrdu ? 'مفت (Rs. 0)' : 'Rs. 0 (FREE)') : 'Rs. 0')}</span>
        </div>
        <div class="total-row" style="border-top:1.5px dashed #333;padding-top:7px;margin-top:7px;font-size:14px;color:#15803d;font-weight:900;">
          <span>${grandTotalLabel}</span>
          <span>Rs.${Number(order.total).toLocaleString()}</span>
        </div>
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
}
