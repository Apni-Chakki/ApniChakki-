/**
 * Computes financial breakdown for an order slip
 */
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

export default computeSlipFinancials;
