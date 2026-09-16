/**
 * WhatsApp bill message builder for orders. Extracted from PrintOrderDetails.jsx
 * (Phase 3.7b) — behavior preserved exactly.
 *
 * Builds a URL-encoded message body (with `%0A` newlines) that the caller then
 * hands to `window.open('https://wa.me/<phone>?text=<message>', ...)`.
 *
 * The Urdu branch uses hardcoded 'ur' inside its item loop (matching the
 * original behavior where the WhatsApp share always renders the *whole* message
 * in whichever language is currently active).
 *
 * @param {{
 *   order: any,
 *   lang: 'en' | 'ur',
 *   storeSettings: { name: string, tagline: string, address: string, phone: string },
 *   hasPendingItems: boolean,
 *   hasDiscount: boolean,
 *   originalSubtotal: number,
 *   itemDiscountsTotal: number,
 *   couponDiscount: number,
 * }} params
 * @returns {string} URL-encoded WhatsApp message body
 */

import { translateText, translateUnit, getCustomizationsText } from './printOrderHelpers';

export function buildWhatsAppOrderMessage({
  order,
  lang,
  storeSettings,
  hasPendingItems,
  hasDiscount,
  originalSubtotal,
  itemDiscountsTotal,
  couponDiscount,
}) {
  const isUrdu = lang === 'ur';
  const lineBreak = '%0A';
  const remainingBal = order.total - (order.advancePayment || 0);
  const dateStrFormatted = new Date(order.createdAt).toLocaleDateString('en-GB');
  const timeStrFormatted = new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  let message = '';
  if (isUrdu) {
    message += `*🧾 ${translateText(storeSettings.name, 'ur')} - ڈیجیٹل بل*${lineBreak}`;
    message += `─────────────────────────${lineBreak}`;
    message += `📅 *تاریخ:* ${dateStrFormatted}   ⏰ *وقت:* ${timeStrFormatted}${lineBreak}`;
    message += `🔢 *آرڈر نمبر:* ${order.id.slice(-6)}${lineBreak}`;
    message += `👤 *گاہک:* ${order.customerName}${lineBreak}`;
    message += `─────────────────────────${lineBreak}`;
    message += `*🛒 آرڈر کی تفصیلات:*${lineBreak}`;
    order.items.forEach((item) => {
      if (item.isWeightPending) {
        message += `▫️ *${translateText(item.name || item.service?.name, 'ur')}*${lineBreak}`;
        message += `    _وزن کی تصدیق دکان پر کی جائے گی_${lineBreak}`;
      } else {
        const itemPrice = item.price_at_purchase || item.service?.price;
        const itemUnit = translateUnit(item.unit || item.service?.unit || 'unit', 'ur');
        const itemName = translateText(item.name || item.service?.name, 'ur');
        message += `▫️ *${itemName}*${lineBreak}`;
        const customText = getCustomizationsText(item, 'ur');
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
    if (advancePaid > 0) message += `✅ *ایڈوانس ادائیگی: Rs.${advancePaid.toLocaleString()}*${lineBreak}`;
    if (remainingBal > 0 && !hasPendingItems) message += `❗ *بقایا رقم: Rs.${remainingBal.toLocaleString()}*${lineBreak}`;
    message += `─────────────────────────${lineBreak}`;
    if (order.type === 'delivery') message += `🚚 *ڈیلیوری کا پتہ:* ${order.deliveryAddress || 'فراہم نہیں کیا گیا'}${lineBreak}`;
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
    order.items.forEach((item) => {
      if (item.isWeightPending) {
        message += `▫️ *${item.service.name}*${lineBreak}`;
        message += `    _Weight to be confirmed at shop_${lineBreak}`;
      } else {
        const itemPrice = item.price_at_purchase || item.service?.price;
        const itemUnit = item.unit || item.service?.unit || 'unit';
        const itemName = item.name || item.service?.name;
        message += `▫️ *${itemName}*${lineBreak}`;
        const customText = getCustomizationsText(item, 'en');
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
    if (advancePaid > 0) message += `✅ *Advance Paid: Rs.${advancePaid.toLocaleString()}*${lineBreak}`;
    if (remainingBal > 0 && !hasPendingItems) message += `❗ *BALANCE DUE: Rs.${remainingBal.toLocaleString()}*${lineBreak}`;
    message += `─────────────────────────${lineBreak}`;
    if (order.type === 'delivery') message += `🚚 *Delivery Address:* ${order.deliveryAddress || 'Not provided'}${lineBreak}`;
    message += `📍 ${storeSettings.address}${lineBreak}📞 ${storeSettings.phone}${lineBreak}`;
    message += `🌾 _${storeSettings.tagline}_`;
  }

  return message;
}
