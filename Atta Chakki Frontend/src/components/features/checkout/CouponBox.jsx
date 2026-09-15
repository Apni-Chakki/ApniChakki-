import { Check, Loader2, X } from 'lucide-react';
import { Input } from '../../common/input';
import { Button } from '../../common/button';
import { Label } from '../../common/label';

/**
 * Coupon-code input UI. Handles both the un-applied state (input + Apply button)
 * and the applied state (green pill + remove button). Errors shown below.
 *
 * Extracted from Checkout.jsx (Phase 3.1c) — behavior preserved exactly.
 *
 * Parent still owns:
 *  - couponCode (controlled input value)
 *  - validation (validateCoupon does the API call + sets appliedCoupon)
 *  - removeCoupon (clears appliedCoupon)
 *
 * Wrapped in the parent's `hasActiveCoupons` check — this component is unconditional.
 */
export function CouponBox({
  couponCode,
  setCouponCode,
  appliedCoupon,
  validatingCoupon,
  couponError,
  validateCoupon,
  removeCoupon,
  t,
}) {
  return (
    <div className="pt-4 border-t border-border">
      <Label className="text-foreground">{t('Coupon Code')}</Label>
      {appliedCoupon ? (
        <div className="mt-2 flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                {appliedCoupon.code}
              </span>
              <span className="text-sm text-emerald-600 dark:text-emerald-400 ml-2">
                {appliedCoupon.discount_type === 'percentage'
                  ? `${appliedCoupon.discount_value}% OFF`
                  : `Rs. ${appliedCoupon.discount_value} OFF`}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
            onClick={removeCoupon}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <Input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder={t('Enter coupon code')}
            className="flex-1"
            disabled={validatingCoupon}
          />
          <Button
            onClick={validateCoupon}
            disabled={validatingCoupon || !couponCode.trim()}
            className="whitespace-nowrap"
          >
            {validatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Apply')}
          </Button>
        </div>
      )}
      {couponError && <p className="mt-1 text-sm text-destructive">{couponError}</p>}
    </div>
  );
}
