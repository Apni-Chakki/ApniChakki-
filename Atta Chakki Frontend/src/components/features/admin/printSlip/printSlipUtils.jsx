import React from 'react';

/* Shared SVG Logo — Header style Wheat in #8b6f47 circle */
export const LogoSVG = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="32" fill="#8b6f47" />
    <g transform="translate(14, 14) scale(1.5)" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
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
);

export function computeSlipFinancials(order) {
  if (!order) return {};

  const slipTotal = order.total || 0;
  const items = order.items || [];
  const hasPendingItems = items.some(i => i.isWeightPending);
  const remainingBalance = slipTotal - (order.advancePayment || 0);

  let itemDiscountsTotal = 0;
  let originalSubtotal = 0;
  let itemsSubtotal = 0;

  items.forEach(item => {
    if (!item.isWeightPending) {
      const itemPrice = parseFloat(item.price_at_purchase) || parseFloat(item.service?.price) || 0;
      const origPrice = parseFloat(item.original_price) || null;
      const qty = parseFloat(item.quantity) || 0;
      const hasItemDiscount = origPrice && origPrice > itemPrice;

      itemsSubtotal += itemPrice * qty;
      if (hasItemDiscount) {
        itemDiscountsTotal += (origPrice - itemPrice) * qty;
        originalSubtotal += origPrice * qty;
      } else {
        originalSubtotal += itemPrice * qty;
      }
    }
  });

  const couponDiscount = parseFloat(order.couponDiscount || order.coupon_discount) || 0;

  let deliveryFee = parseFloat(order.deliveryFee ?? order.delivery_fee ?? order.shipping_cost ?? order.delivery_cost ?? 0) || 0;
  if (!deliveryFee && (order.type === 'delivery' || order.shipping_address || order.deliveryAddress) && order.total > (itemsSubtotal - couponDiscount)) {
    deliveryFee = Math.max(0, Math.round(order.total - (itemsSubtotal - couponDiscount)));
  }

  const totalDiscount = itemDiscountsTotal + couponDiscount;
  const hasDiscount = totalDiscount > 0;

  return {
    slipTotal,
    hasPendingItems,
    remainingBalance,
    itemDiscountsTotal,
    originalSubtotal,
    itemsSubtotal,
    couponDiscount,
    deliveryFee,
    totalDiscount,
    hasDiscount
  };
}

export function buildThermalPrintHtml({ order, storeSettings, financials, dateStr, timeStr }) {
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
        <div style="border-bottom:1px dashed #ccc;padding:6px 0;">
          <div style="font-weight:600;font-size:12px;">${item.service?.name || item.name}</div>
          <div style="color:#d97706;font-size:10px;font-weight:700;">⚠ WEIGHT TO BE CONFIRMED</div>
        </div>`;
    }
    const itemPrice = item.price_at_purchase || item.service?.price || 0;
    const origPrice = item.original_price || null;
    const hasItemDiscount = origPrice && origPrice > itemPrice;
    const lineTotal = item.quantity * itemPrice;
    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px dashed #ccc;padding:6px 0;">
        <div style="flex:1;padding-right:8px;">
          <div style="font-weight:600;font-size:12px;">${item.name || item.service?.name}</div>
          ${(item.customizations?.length > 0 || item.is_cleaning || item.is_grinding) ? `
            <div style="color:#666;font-size:9px;font-style:italic;margin-bottom:2px;">
              (${item.customizations?.length > 0
                ? item.customizations.map(c => c.option_name).join(' + ')
                : `${item.is_cleaning ? 'Cleaning' : ''}${item.is_cleaning && item.is_grinding ? ' + ' : ''}${item.is_grinding ? 'Grinding' : ''}`
              })
            </div>
          ` : ''}
          <div style="font-size:10px;">
            ${item.quantity} ${item.service?.unit || item.unit || 'unit'} ×
            ${hasItemDiscount
              ? `<span style="text-decoration:line-through;color:#999;">Rs.${Number(origPrice).toLocaleString()}</span> <span style="color:#15803d;font-weight:700;">Rs.${Number(itemPrice).toLocaleString()}</span>`
              : `<span style="color:#555;">Rs.${Number(itemPrice).toLocaleString()}</span>`
            }
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700;white-space:nowrap;font-size:12px;">Rs.${Number(lineTotal).toLocaleString()}</div>
          ${hasItemDiscount ? `<div style="font-size:8px;color:#15803d;font-weight:700;">🏷 Disc.</div>` : ''}
        </div>
      </div>`;
  }).join('');

  const logoHTMLForPrint = `
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 0 8px;">
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
      <div style="text-align:left;">
        <div style="font-size:16px;font-weight:900;letter-spacing:2px;color:#1a1a1a;text-transform:uppercase;">${storeSettings.name}</div>
        <div style="font-size:10px;color:#666;letter-spacing:1px;">${storeSettings.tagline}</div>
        <div style="font-size:10px;color:#666;">📞 ${storeSettings.phone}</div>
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Order Slip — ${String(order.id).slice(-8).toUpperCase()}</title>
      <style>
        @page { size: 80mm auto; margin: 4mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Courier New', monospace; font-size: 12px; color: #111; background:#fff; }
        .divider { border: none; border-top: 1.5px dashed #aaa; margin: 8px 0; }
        .divider-heavy { border: none; border-top: 2px dashed #555; margin: 8px 0; }
        .header { text-align: center; padding-bottom: 8px; border-bottom: 2px dashed #555; }
        .store-name { font-size: 15px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
        .store-sub { font-size: 9px; color: #555; letter-spacing: 1px; }
        .section-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #666; border-bottom: 1px dashed #ccc; padding-bottom: 3px; margin-bottom: 6px; margin-top: 8px; }
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

      <div class="section-title">Order Info</div>
      <div class="row"><span class="muted">Order #</span><span class="bold">${String(order.id).slice(-8).toUpperCase()}</span></div>
      <div class="row"><span class="muted">Date</span><span>${dateStr}</span></div>
      <div class="row"><span class="muted">Time</span><span>${timeStr}</span></div>

      <div class="section-title">Customer</div>
      <div class="row"><span class="muted">Name</span><span class="bold">${order.customerName}</span></div>
      <div class="row"><span class="muted">Phone</span><span>${order.phone}</span></div>
      <div class="row"><span class="muted">Type</span><span style="text-transform:uppercase;">${order.type}</span></div>
      ${order.deliveryAddress ? `<div style="margin-top:4px;font-size:10px;color:#555;">Address:</div><div style="font-size:11px;background:#f0f9ff;border:1px solid #bae6fd;padding:4px 6px;border-radius:4px;word-break:break-word;">${order.deliveryAddress}</div>` : ''}

      <div class="section-title">Items</div>
      ${itemsHTML}

      <div class="divider-heavy"></div>
      <div class="row" style="color:#555;font-weight:600;">
        <span>PRODUCTS SUBTOTAL</span>
        <span>Rs.${Number(itemsSubtotal || (slipTotal - deliveryFee + couponDiscount)).toLocaleString()}${hasPendingItems ? ' + TBD' : ''}</span>
      </div>
      ${itemDiscountsTotal > 0 ? `
        <div class="row" style="color:#15803d;margin-top:3px;font-weight:700;">
          <span>PRODUCT DISCOUNT</span>
          <span>- Rs.${Number(itemDiscountsTotal).toLocaleString()}</span>
        </div>
      ` : ''}
      ${couponDiscount > 0 ? `
        <div class="row" style="color:#15803d;margin-top:3px;font-weight:700;">
          <span>COUPON DISCOUNT (${order.couponCode || 'PROMO'})</span>
          <span>- Rs.${Number(couponDiscount).toLocaleString()}</span>
        </div>
      ` : ''}
      <div class="row" style="color:#555;font-weight:600;margin-top:3px;">
        <span>DELIVERY FEE</span>
        <span>${deliveryFee > 0 ? `+ Rs.${Number(deliveryFee).toLocaleString()}` : (order.type === 'delivery' ? 'Rs. 0 (FREE)' : 'Rs. 0')}</span>
      </div>
      <div class="total-row" style="border-top:1.5px dashed #555;padding-top:4px;margin-top:4px;font-size:13px;color:#15803d;font-weight:900;">
        <span>GRAND TOTAL</span>
        <span>Rs.${Number(slipTotal).toLocaleString()}</span>
      </div>
      ${order.advancePayment && order.advancePayment > 0 ? `<div class="row advance-row" style="margin-top:4px;"><span>ADVANCE PAID</span><span>- Rs.${Number(order.advancePayment).toLocaleString()}</span></div>` : ''}
      ${remainingBalance > 0 ? `<div class="total-row due-row"><span>DUE</span><span>Rs.${Number(remainingBalance).toLocaleString()}</span></div>` : ''}

      <div class="section-title" style="margin-top:10px;">Payment</div>
      <div class="row"><span class="muted">Method</span><span style="text-transform:uppercase;">${order.paymentMethod || 'CASH'}</span></div>
      <div class="row"><span class="muted">Status</span>
        <span class="${order.paymentStatus === 'paid' ? 'status-paid' : order.paymentStatus === 'partial' ? 'status-partial' : 'status-unpaid'}">
          ${order.paymentStatus === 'paid' ? '✓ PAID' : order.paymentStatus === 'partial' ? 'PARTIAL' : '✗ UNPAID'}
        </span>
      </div>
      ${order.paymentStatus !== 'paid' && order.paymentMethod === 'cash' && remainingBalance > 0 ? `
        <div class="collect-box">
          <p>💵 Collect: Rs.${Number(remainingBalance).toLocaleString()}${hasPendingItems ? ' (+ TBD)' : ''}</p>
        </div>` : ''}

      <div class="footer">
        <p>🙏 Thank you for your order!</p>
        <p style="margin-top:2px;">Visit ${storeSettings.name} again</p>
        <p style="color:#999;margin-top:2px;">${storeSettings.address}</p>
      </div>
    </body>
    </html>
  `;
}

export function buildSlipWhatsAppMessage({ order, storeSettings, financials, dateStr, timeStr }) {
  const lineBreak = "%0A";
  const {
    hasPendingItems,
    hasDiscount,
    originalSubtotal,
    itemDiscountsTotal,
    couponDiscount,
    remainingBalance
  } = financials;

  let message = `*🧾 ${storeSettings.name.toUpperCase()} - DIGITAL INVOICE*${lineBreak}`;
  message += `─────────────────────────${lineBreak}`;
  message += `📅 *Date:* ${dateStr}   ⏰ *Time:* ${timeStr}${lineBreak}`;
  message += `🔢 *Order No:* ${String(order.id).slice(-6)}${lineBreak}`;
  message += `👤 *Customer:* ${order.customerName}${lineBreak}`;
  message += `─────────────────────────${lineBreak}`;
  message += `*🛒 ORDER SUMMARY:*${lineBreak}`;

  (order.items || []).forEach(item => {
    if (item.isWeightPending) {
      message += `▫️ *${item.service?.name || item.name}*${lineBreak}`;
      message += `    _Weight to be confirmed at shop_${lineBreak}`;
    } else {
      const itemPrice = item.price_at_purchase || item.service?.price;
      const itemUnit = item.unit || item.service?.unit;
      const itemName = item.name || item.service?.name;
      message += `▫️ *${itemName}*${lineBreak}`;
      if (item.customizations?.length > 0) {
        message += `    _(${item.customizations.map(c => c.option_name).join(' + ')})_${lineBreak}`;
      } else if (item.is_cleaning || item.is_grinding) {
        message += `    _(${item.is_cleaning ? 'Cleaning' : ''}${item.is_cleaning && item.is_grinding ? ' + ' : ''}${item.is_grinding ? 'Grinding' : ''})_${lineBreak}`;
      }
      message += `    ${item.quantity} ${itemUnit} x Rs.${itemPrice} = *Rs.${(item.quantity * itemPrice).toLocaleString()}*${lineBreak}`;

      // Include Rental Details if applicable
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
  if (advancePaid > 0) {
    message += `✅ *Advance Paid: Rs.${advancePaid.toLocaleString()}*${lineBreak}`;
  }
  if (remainingBalance > 0 && !hasPendingItems) {
    message += `❗ *BALANCE DUE: Rs.${remainingBalance.toLocaleString()}*${lineBreak}`;
  }
  message += `─────────────────────────${lineBreak}`;
  if (order.type === 'delivery') {
    message += `🚚 *Delivery Address:* ${order.deliveryAddress || 'Not provided'}${lineBreak}`;
  }
  message += `📍 ${storeSettings.address}${lineBreak}📞 ${storeSettings.phone}${lineBreak}`;
  message += `🌾 _${storeSettings.tagline}_`;

  return message;
}
