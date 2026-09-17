import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../common/button';
import { Trash2, Save } from 'lucide-react';

export function ManualOrderCart({
  cart,
  onRemoveFromCart,
  total,
  onSubmit,
  loading,
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Mobile: card list (< sm) */}
      <div className="sm:hidden space-y-2">
        {cart.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground border rounded-lg">
            {t('Cart is empty')}
          </div>
        ) : (
          cart.map((item, idx) => (
            <div key={idx} className="border rounded-lg p-3 bg-card">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm break-words">{item.name}</p>
                  {item.is_rental === 1 ? (
                    <div className="mt-1 space-y-0.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                        📦 {t('RENTAL')}
                      </span>
                      <p className="text-[10px] text-teal-700 font-medium mt-0.5">
                        🗓️ {item.rental_days} {t('days')} ({item.rental_start_date}) | {t('Rate')}: Rs.{item.rental_price_per_day}/day | {t('Deposit')}: Rs.{item.security_deposit}
                      </p>
                    </div>
                  ) : item.selected_customizations && item.selected_customizations.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      ({item.selected_customizations.map((c) => t(c.option_name)).join(' + ')})
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFromCart(idx)}
                  className="text-red-500 shrink-0 h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">{t('Price')}</p>
                  {item.is_rental === 1 ? (
                    <div>
                      <span className="font-semibold">Rs. {item.price.toLocaleString()}</span>
                      <span className="text-[9px] text-muted-foreground block">
                        (Rent: {item.rental_price_per_day * item.rental_days} + Dep: {item.security_deposit})
                      </span>
                    </div>
                  ) : item.original_price && item.original_price > item.price ? (
                    <div>
                      <span className="line-through text-muted-foreground block">
                        Rs. {item.original_price.toLocaleString()}
                      </span>
                      <span className="text-green-600 font-bold">
                        Rs. {item.price.toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <span className="font-semibold">Rs. {item.price.toLocaleString()}</span>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">{t('Qty')}</p>
                  <p className="font-semibold">{item.quantity}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('Total')}</p>
                  <p className="font-bold">
                    Rs. {(item.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
        {cart.length > 0 && (
          <div className="border-t-2 border-primary/20 pt-3 flex justify-between items-center px-1">
            <span className="font-bold text-sm">{t('Grand Total')}:</span>
            <span className="font-bold text-lg">Rs. {total.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Desktop: cart table (>= sm) */}
      <div className="hidden sm:block border rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted">
            <tr>
              <th className="p-3">{t('Product')}</th>
              <th className="p-3">{t('Price')}</th>
              <th className="p-3">{t('Quantity')}</th>
              <th className="p-3">{t('Total')}</th>
              <th className="p-3">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {cart.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-muted-foreground">
                  {t('Cart is empty')}
                </td>
              </tr>
            ) : (
              cart.map((item, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{item.name}</span>
                      {item.is_rental === 1 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                          📦 {t('RENTAL')}
                        </span>
                      )}
                    </div>
                    {item.is_rental === 1 ? (
                      <div className="text-[10px] text-teal-700 font-medium mt-0.5">
                        🗓️ {item.rental_days} {t('days')} (from {item.rental_start_date}) | {t('Rate')}: Rs.{item.rental_price_per_day}/day | {t('Deposit')}: Rs.{item.security_deposit}
                      </div>
                    ) : item.selected_customizations && item.selected_customizations.length > 0 && (
                      <div className="text-[10px] text-muted-foreground">
                        ({item.selected_customizations.map((c) => t(c.option_name)).join(' + ')})
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    {item.is_rental === 1 ? (
                      <div className="flex flex-col">
                        <span className="font-semibold">Rs. {item.price.toLocaleString()}</span>
                        <span className="text-[9px] text-muted-foreground">
                          (Rent: {item.rental_price_per_day * item.rental_days} + Dep: {item.security_deposit})
                        </span>
                      </div>
                    ) : item.original_price && item.original_price > item.price ? (
                      <div className="flex flex-col">
                        <span className="line-through text-xs text-muted-foreground">
                          Rs. {item.original_price.toLocaleString()}
                        </span>
                        <span className="text-green-600 font-bold">
                          Rs. {item.price.toLocaleString()}
                        </span>
                        <span className="text-[9px] text-green-700 bg-green-50 px-1 py-0.5 rounded border border-green-200 w-max font-bold mt-0.5">
                          🏷 DISC
                        </span>
                      </div>
                    ) : (
                      <span>Rs. {item.price.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="p-3">{item.quantity}</td>
                  <td className="p-3">Rs. {(item.price * item.quantity).toLocaleString()}</td>
                  <td className="p-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveFromCart(idx)}
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-muted font-bold">
            <tr>
              <td colSpan="3" className="p-3 text-right">
                {t('Grand Total')}:
              </td>
              <td className="p-3">Rs. {total.toLocaleString()}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 sm:mt-6 flex justify-end">
        <Button
          size="lg"
          onClick={onSubmit}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? t('Creating Order...') : t('Create Order')}
        </Button>
      </div>
    </div>
  );
}
