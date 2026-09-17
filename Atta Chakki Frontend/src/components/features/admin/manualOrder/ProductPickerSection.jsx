import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../../../common/card';
import { Input } from '../../../common/input';
import { Label } from '../../../common/label';
import { Button } from '../../../common/button';
import { Checkbox } from '../../../common/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../common/select';
import { ShoppingCart, Plus, RotateCcw, Calendar, Hourglass, Package, ShieldCheck } from 'lucide-react';

export function ProductPickerSection({
  products,
  selectedProduct,
  setSelectedProduct,
  qty,
  setQty,
  rentalDays,
  setRentalDays,
  rentalStartDate,
  setRentalStartDate,
  currentProduct,
  currentCustomizations,
  selectedOptions,
  setSelectedOptions,
  computeProductPrice,
  onAddToCart,
}) {
  const { t } = useTranslation();

  const isRental = currentProduct?.is_rental == 1 || currentProduct?.is_rental === true || currentProduct?.is_rental === '1';
  const rentalPricePerDay = parseFloat(currentProduct?.rental_price_per_day) || 0;
  const securityDeposit = parseFloat(currentProduct?.security_deposit) || 0;
  const availableQty = parseFloat(currentProduct?.rental_available_qty || 0);

  const numDays = Math.max(1, parseInt(rentalDays) || 1);
  const numQty = Math.max(1, parseInt(qty) || 1);
  const rentalSubtotal = Math.round(rentalPricePerDay * numDays * numQty);
  const depositTotal = Math.round(securityDeposit * numQty);
  const rentalGrandTotal = rentalSubtotal + depositTotal;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" /> {t('Add Products')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <Label>{t('Select Product')}</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('Choose an item...')} />
              </SelectTrigger>
              <SelectContent>
                {products.length > 0 ? (
                  products.map((p) => {
                    const pIsRental = p.is_rental == 1 || p.is_rental === true || p.is_rental === '1';
                    return (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {pIsRental ? (
                          <span>
                            📦 <strong className="text-teal-700">[{t('RENTAL')}]</strong> {p.name} (Rs. {p.rental_price_per_day}/day + Rs. {p.security_deposit} Dep) — {t('Avail')}: {p.rental_available_qty}
                          </span>
                        ) : (
                          <span>
                            {p.name} (Rs. {p.price})
                            {p.unit?.toLowerCase() !== 'trip' &&
                              parseInt(p.is_grinding_service) !== 1 &&
                              (!p.customizations || p.customizations.length === 0) &&
                              ` - ${t('Stock')}: ${p.stock_quantity}`}
                          </span>
                        )}
                      </SelectItem>
                    );
                  })
                ) : (
                  <SelectItem value="none" disabled>
                    {t('Loading Products...')}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {!isRental && (
            <div className="w-full sm:w-24">
              <Label>{t('Quantity')}</Label>
              <Input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Dedicated Rental Configuration Panel when a rental product is selected */}
        {selectedProduct && isRental && (
          <div className="mb-4 sm:mb-6 p-4 rounded-xl border border-teal-200 bg-teal-50/40 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-teal-200/60 pb-2.5">
              <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
                <RotateCcw className="h-4 w-4 text-teal-700" />
                <span>{t('Rental Configuration')}</span>
                <span className="text-xs font-normal text-teal-700">({currentProduct.name})</span>
              </div>
              <span className="text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-bold border border-teal-300">
                {availableQty} {t('Available for rent')}
              </span>
            </div>

            {/* 3-column inputs: Start Date, Days, Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t('Start Date')}</span>
                </Label>
                <Input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={rentalStartDate}
                  onChange={(e) => setRentalStartDate(e.target.value)}
                  className="bg-white text-xs font-semibold"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Hourglass className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t('Rental Days')}</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={rentalDays}
                  onChange={(e) => setRentalDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-white text-xs font-bold text-center"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t('Quantity')}</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  max={availableQty > 0 ? availableQty : 99}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-white text-xs font-bold text-center"
                />
              </div>
            </div>

            {/* Rental Breakdown Card */}
            <div className="bg-white border border-teal-200/80 rounded-xl p-3.5 text-xs space-y-2.5 shadow-sm">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-semibold">{t('Daily Rental Rate')}</span>
                <span className="font-bold text-slate-800">
                  Rs. {Math.round(rentalPricePerDay)}{' '}
                  <span className="text-slate-400 font-normal">/{t('day')}</span>
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-semibold">
                  {t('Rental Subtotal')} ({numDays} {t('days')} × {numQty} {t('qty')})
                </span>
                <span className="font-bold text-slate-800">
                  Rs. {rentalSubtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-rose-500" />
                  <span>{t('Refundable Security Deposit')}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                    (Rs. {Math.round(securityDeposit)} × {numQty})
                  </span>
                </span>
                <span className="font-bold text-slate-800">
                  Rs. {depositTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center font-black text-sm text-teal-900 border-t border-teal-100 pt-2 mt-1">
                <span className="uppercase tracking-wider text-xs">
                  {t('Line Total (Rent + Deposit)')}
                </span>
                <span className="bg-teal-100 text-teal-900 px-3 py-1 rounded-lg border border-teal-300">
                  Rs. {rentalGrandTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Customizations for selected non-rental product */}
        {selectedProduct && !isRental && currentCustomizations.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 p-3 sm:p-4 bg-muted rounded-lg border border-border">
            {currentCustomizations.map((cust, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Checkbox
                  id={`admin-cust-${idx}`}
                  checked={!!selectedOptions[idx]}
                  onCheckedChange={(checked) =>
                    setSelectedOptions((prev) => ({ ...prev, [idx]: !!checked }))
                  }
                />
                <Label htmlFor={`admin-cust-${idx}`} className="text-sm font-medium cursor-pointer">
                  {t(cust.option_name)} (Rs. {cust.option_price}
                  {currentProduct?.customization_pricing_mode === 'average'
                    ? `/${currentProduct?.unit || 'kg'}`
                    : ''}
                  )
                </Label>
              </div>
            ))}
            {(() => {
              const { originalPrice, finalPrice } = computeProductPrice(
                currentProduct,
                selectedOptions
              );
              const isAvg = currentProduct?.customization_pricing_mode === 'average';
              return (
                <div className="text-xs sm:ml-auto flex items-center gap-2 flex-wrap">
                  {isAvg && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      {t('Mix Proportion Rate')}
                    </span>
                  )}
                  <span className="text-muted-foreground font-medium">
                    {t('Current Price')}:
                  </span>
                  {originalPrice > finalPrice ? (
                    <span>
                      <span className="line-through text-muted-foreground mr-1">
                        Rs. {originalPrice}
                      </span>
                      <span className="text-green-600 font-bold">Rs. {finalPrice}</span>
                    </span>
                  ) : (
                    <span className="font-bold text-slate-800">Rs. {finalPrice}</span>
                  )}
                  {currentProduct?.unit && (
                    <span className="text-muted-foreground">/{currentProduct.unit}</span>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        <div className="flex justify-end mb-4 sm:mb-6">
          <Button
            onClick={onAddToCart}
            disabled={!selectedProduct || selectedProduct === 'none'}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" /> {isRental ? t('Add Rental Item to Cart') : t('Add to Cart')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
