/**
 * Price breakdown block below the cart items list on the Checkout page.
 * Shows: subtotal, product discount, cart total, delivery fee, coupon discount,
 * VIP discount, grand total, and the "TBD" pending-weight notice.
 *
 * Extracted from Checkout.jsx (Phase 3.1d) — behavior preserved exactly.
 *
 * Pure display: takes all values as props, contains no state and no callbacks.
 */
export function PriceSummary({
  originalTotal,
  productDiscount,
  total,
  orderType,
  isOutOfLahore,
  distanceKm,
  user,
  deliveryFee,
  couponDiscount,
  vipDiscountAmount,
  grandTotal,
  isTbdOrder,
  hasPendingWeightItem,
  couponSlot,
  t,
}) {
  return (
    <>
      <div className="flex justify-between pt-4 border-t border-border">
        <span className="text-foreground">{t('Original Subtotal')}</span>
        <span className="text-foreground font-bold">
          {isTbdOrder ? 'TBD' : `Rs. ${originalTotal.toFixed(2)}`}
        </span>
      </div>

      {productDiscount > 0 && (
        <div className="flex justify-between pt-2 text-blue-600 dark:text-blue-400">
          <span className="text-sm font-medium">{t('Product Discount')}</span>
          <span className="text-sm font-medium">-Rs. {productDiscount.toFixed(2)}</span>
        </div>
      )}

      <div className="flex justify-between pt-2 border-t border-border">
        <span className="text-foreground">{t('Cart Subtotal')}</span>
        <span className="text-foreground font-bold">
          {isTbdOrder ? 'TBD' : `Rs. ${total.toFixed(2)}`}
        </span>
      </div>

      {orderType === 'delivery' && !isOutOfLahore && (
        <div className="flex justify-between pt-2">
          <span className="text-muted-foreground text-sm">
            {t('Delivery Fee')} ({distanceKm.toFixed(1)} km)
          </span>
          <span
            className={`text-sm ${
              user?.vip_free_shipping ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'
            }`}
          >
            {user?.vip_free_shipping ? t('Free (VIP Benefit)') : `Rs. ${deliveryFee}`}
          </span>
        </div>
      )}

      {couponSlot}

      {couponDiscount > 0 && (
        <div className="flex justify-between pt-2 text-emerald-600 dark:text-emerald-400">
          <span className="text-sm font-medium">{t('Coupon Discount')}</span>
          <span className="text-sm font-medium">-Rs. {couponDiscount.toFixed(2)}</span>
        </div>
      )}

      {vipDiscountAmount > 0 && (
        <div className="flex justify-between pt-2 text-purple-600 dark:text-purple-400">
          <span className="text-sm font-medium">{t('VIP 10% Discount')}</span>
          <span className="text-sm font-medium">-Rs. {vipDiscountAmount.toFixed(2)}</span>
        </div>
      )}

      <div className="flex justify-between pt-2 border-t border-border font-bold">
        <span className="text-foreground">{t('Grand Total')}</span>
        <span className="text-foreground">
          {isTbdOrder ? 'TBD' : `Rs. ${grandTotal.toFixed(2)}`}
        </span>
      </div>

      {hasPendingWeightItem && (
        <p className="text-sm text-primary text-right mt-2">
          {t('Total does not include items with pending weight.')}
        </p>
      )}
    </>
  );
}
