import { Trash2 } from 'lucide-react';
import { Button } from '../../common/button';

/**
 * Displays the list of items in the cart with per-item pricing and a remove button.
 * Extracted from Checkout.jsx (Phase 3.1b) — behavior preserved exactly.
 *
 * Handles three variants of each item:
 *  - Regular product (price × quantity, unit label)
 *  - Rental item (dates, per-day rate, refundable deposit)
 *  - Weight-pending / trip items (shows "TBD" instead of a price)
 *
 * @param {{ cart: any[], removeFromCart: Function, t: Function }} props
 */
export function CartItemsList({ cart, removeFromCart, t }) {
  return (
    <>
      {cart.map((item, index) => {
        const isRental =
          item.service?.is_rental === 1 ||
          item.service?.is_rental === '1' ||
          item.service?.is_rental === true ||
          item.service?.is_rental === 'true';

        return (
          <div
            key={`${item.service.id}-${item.isWeightPending ? 'pending' : 'regular'}-${index}`}
            className="flex items-center justify-between pb-4 border-b border-border last:border-0 last:pb-0"
          >
            <div className="flex-1">
              <h4 className="text-foreground">{item.service.name}</h4>
              {isRental ? (
                <div className="text-xs text-muted-foreground font-medium space-y-0.5 mt-1">
                  <p>🗓️ {t('Dates')}: {item.service.rental_start_date} ({item.service.rental_days} {t('days')})</p>
                  <p>💵 {t('Rental Rate')}: Rs. {Math.round(item.service.rental_price_per_day)}/{t('day')} × {item.quantity}</p>
                  <p>🔒 {t('Refundable Deposit')}: Rs. {Math.round(item.service.security_deposit)} × {item.quantity}</p>
                </div>
              ) : (
                <>
                  {(item.service.selected_customizations?.length > 0 || item.service.is_grinding_service) && !item.service.is_custom_mix && (
                    <p className="text-xs text-muted-foreground font-medium">
                      ({item.service.selected_customizations?.length > 0
                        ? item.service.selected_customizations.map((c) => t(c.option_name)).join(' + ')
                        : [item.service.is_cleaning && t('Cleaning'), item.service.is_grinding && t('Grinding')].filter(Boolean).join(' + ')
                      })
                    </p>
                  )}
                  {item.service.is_custom_mix && item.service.selected_mix_items?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.service.selected_mix_items.map((m, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200"
                        >
                          {m.item_name} ({m.ratio})
                        </span>
                      ))}
                    </div>
                  )}
                  {item.isWeightPending || item.service?.unit?.toLowerCase() === 'trip' ? (
                    <p className="text-sm text-primary font-medium">
                      {t('Weight to be confirmed (Price TBD)')}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Rs. {item.service.price} × {item.quantity} {item.service.unit}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-4">
              {item.isWeightPending || item.service?.unit?.toLowerCase() === 'trip' ? (
                <p className="text-foreground font-semibold">TBD</p>
              ) : (
                <p className="text-foreground">Rs. {item.service.price * item.quantity}</p>
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 ml-2 bg-red-500 hover:bg-red-600 border-red-600 shadow flex items-center justify-center px-0 py-0"
                onClick={() => {
                  if (isRental) {
                    removeFromCart(
                      item.service.id,
                      false,
                      false,
                      false,
                      null,
                      false,
                      null,
                      true,
                      item.service.rental_start_date,
                      item.service.rental_days
                    );
                  } else {
                    removeFromCart(
                      item.service.id,
                      item.isWeightPending,
                      item.service.is_cleaning,
                      item.service.is_grinding,
                      item.service.selected_customizations,
                      item.service.is_custom_mix,
                      item.service.selected_mix_items
                    );
                  }
                }}
                title={t('Remove Item')}
              >
                <Trash2 className="h-4 w-4 text-white" strokeWidth={3} />
              </Button>
            </div>
          </div>
        );
      })}
    </>
  );
}
