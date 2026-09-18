/**
 * Composes digital WhatsApp invoice text
 */
export function buildSlipWhatsAppMessage({
  order,
  storeSettings,
  financials,
  dateStr,
  timeStr,
  language = 'en'
}) {
  const lineBreak = "%0A";
  const isUrdu = language === 'ur';
  const {
    hasPendingItems,
    hasDiscount,
    originalSubtotal,
    itemDiscountsTotal,
    couponDiscount,
    remainingBalance
  } = financials;

  if (isUrdu) {
    let message = `*🧾 ${storeSettings.name} - ڈیجیٹل بل / انوائس*${lineBreak}`;
    message += `─────────────────────────${lineBreak}`;
    message += `📅 *تاریخ:* ${dateStr}   ⏰ *وقت:* ${timeStr}${lineBreak}`;
    message += `🔢 *آرڈر نمبر:* #${String(order.id).slice(-6)}${lineBreak}`;
    message += `👤 *گاہک کا نام:* ${order.customerName}${lineBreak}`;
    message += `─────────────────────────${lineBreak}`;
    message += `*🛒 آرڈر کی اشیاء:*${lineBreak}`;

    (order.items || []).forEach(item => {
      if (item.isWeightPending) {
        message += `▫️ *${item.service?.name || item.name}*${lineBreak}`;
        message += `    _دکان پر وزن کے بعد تصدیق ہوگی_${lineBreak}`;
      } else {
        const itemPrice = item.price_at_purchase || item.service?.price;
        const itemUnit = item.unit || item.service?.unit || 'کلو';
        const itemName = item.name || item.service?.name;
        message += `▫️ *${itemName}*${lineBreak}`;
        if (item.customizations?.length > 0) {
          message += `    _(${item.customizations.map(c => c.option_name).join(' + ')})_${lineBreak}`;
        } else if (item.is_cleaning || item.is_grinding) {
          message += `    _(${item.is_cleaning ? 'صفائی' : ''}${item.is_cleaning && item.is_grinding ? ' + ' : ''}${item.is_grinding ? 'پسائی' : ''})_${lineBreak}`;
        }
        message += `    ${item.quantity} ${itemUnit} × روپے ${itemPrice} = *روپے ${(item.quantity * itemPrice).toLocaleString()}*${lineBreak}`;
      }
    });

    message += `─────────────────────────${lineBreak}`;
    if (hasPendingItems) {
      message += `*⚠️ حتمی ٹوٹل وزن کے بعد تصدیق ہوگا*${lineBreak}`;
    } else {
      if (hasDiscount) {
        message += `*سب ٹوٹل:* روپے ${originalSubtotal.toLocaleString()}${lineBreak}`;
        if (itemDiscountsTotal > 0) {
          message += `🏷️ *ڈسکاؤنٹ:* -روپے ${itemDiscountsTotal.toLocaleString()}${lineBreak}`;
        }
        if (couponDiscount > 0) {
          message += `🏷️ *کوپن رعایت (${order.couponCode || 'پرومو'}):* -روپے ${couponDiscount.toLocaleString()}${lineBreak}`;
        }
      }
      message += `*💰 کل رقم (ٹوٹل): روپے ${order.total.toLocaleString()}*${lineBreak}`;
    }

    const advancePaid = parseFloat(order.advancePayment || order.amount_paid) || 0;
    if (advancePaid > 0) {
      message += `✅ *پیشگی ادا شدہ:* روپے ${advancePaid.toLocaleString()}${lineBreak}`;
    }
    if (remainingBalance > 0 && !hasPendingItems) {
      message += `❗ *واجب الادا بقایا رقم:* روپے ${remainingBalance.toLocaleString()}${lineBreak}`;
    }
    message += `─────────────────────────${lineBreak}`;
    if (order.type === 'delivery') {
      message += `🚚 *ترسیل کا پتہ:* ${order.deliveryAddress || 'فراہم نہیں کیا گیا'}${lineBreak}`;
    }
    message += `📍 ${storeSettings.address}${lineBreak}📞 ${storeSettings.phone}${lineBreak}`;
    message += `🌾 _${storeSettings.tagline}_`;

    return message;
  }

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

export default buildSlipWhatsAppMessage;
