import { Calendar, ChevronRight } from 'lucide-react';
import { Button } from '../../common/button';
import { QuantitySelector } from './QuantitySelector';

export function ServiceCardActions({
  service,
  isRental,
  onOpenRentalModal,
  isCustomMix,
  onOpenMixModal,
  hasCustomizations,
  selectedOptions,
  onOpenCustomizationsModal,
  showPickupButton,
  isPickupRequested,
  onAddPickupRequest,
  isDualUnit,
  isOnlyPickup,
  quantity,
  setQuantity,
  hasQuickOptions,
  quickOptions,
  displayUnit,
  isOutOfStock,
  isQuantityExceeded,
  stock,
  handleQuickAdd,
  handleAddToCart,
  isAddedToCart,
  currentPrice,
  t,
}) {
  const isMaxReached = !isOnlyPickup && !isRental && stock !== Infinity && quantity >= stock;

  return (
    <div className="flex flex-col gap-2 mt-auto">
      {isRental ? (
        <Button
          className="w-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-bold shadow-md transition-all active:scale-[0.98] rounded-xl py-2.5"
          onClick={onOpenRentalModal}
        >
          <Calendar className="h-4 w-4 mr-2" />
          {t('Rent This Item')}
        </Button>
      ) : isCustomMix ? (
        <>
          <Button
            variant="outline"
            className="w-full border-primary/30 text-primary hover:bg-primary/10 font-bold text-xs h-9 rounded-xl flex items-center justify-between px-3 shadow-xs"
            onClick={onOpenMixModal}
          >
            <span className="truncate">{t('Customize Mix & Proportions')}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-primary/70 ml-1" />
          </Button>
          <QuantitySelector
            hasQuickOptions={hasQuickOptions}
            quickOptions={quickOptions}
            unitLabel={isDualUnit ? 'kg' : displayUnit}
            quantity={quantity}
            setQuantity={setQuantity}
            isOutOfStock={isOutOfStock}
            isExceeded={isQuantityExceeded}
            isMaxReached={isMaxReached}
            isOnlyPickup={isOnlyPickup}
            isRental={isRental}
            stock={stock}
            handleQuickAdd={handleQuickAdd}
            handleAddToCart={handleAddToCart}
            isAddedToCart={isAddedToCart}
            isCustomMix={isCustomMix}
            currentPrice={currentPrice}
            t={t}
          />
        </>
      ) : hasCustomizations ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={onOpenCustomizationsModal}
            className="w-full text-left p-2.5 rounded-xl border border-amber-300/80 bg-amber-50/40 hover:bg-amber-50/80 transition-all flex items-center justify-between group shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-700 shrink-0"></span>
              <div>
                <div className="text-[11px] font-bold tracking-wider text-amber-900 uppercase">
                  {service.customization_pricing_mode === 'average'
                    ? t('SELECT ITEMS')
                    : t('SERVICE CUSTOMIZATION')}
                </div>
                <div className="text-[10px] text-amber-700/80 font-medium">
                  {Object.values(selectedOptions).filter(Boolean).length} {t('selected')} • {t('Tap to edit')}
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-700/70 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>

          {showPickupButton && (
            <Button
              className="w-full text-sm font-bold btn-brand-primary text-white rounded-xl py-2.5 h-10 transition-all shadow-xs"
              onClick={onAddPickupRequest}
            >
              {isPickupRequested ? t('Pickup Requested ✓') : t('Add Pickup Request')}
            </Button>
          )}

          {showPickupButton && isDualUnit && !isOnlyPickup && (
            <div className="text-center text-[11px] text-muted-foreground font-medium py-0.5 tracking-wider">
              -- OR --
            </div>
          )}

          {!isOnlyPickup && (
            <QuantitySelector
              hasQuickOptions={hasQuickOptions}
              quickOptions={quickOptions}
              unitLabel={isDualUnit ? 'kg' : displayUnit}
              quantity={quantity}
              setQuantity={setQuantity}
              isOutOfStock={isOutOfStock}
              isExceeded={isQuantityExceeded}
              isMaxReached={isMaxReached}
              isOnlyPickup={isOnlyPickup}
              isRental={isRental}
              stock={stock}
              handleQuickAdd={handleQuickAdd}
              handleAddToCart={handleAddToCart}
              isAddedToCart={isAddedToCart}
              isCustomMix={isCustomMix}
              currentPrice={currentPrice}
              t={t}
            />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {showPickupButton && (
            <Button
              className="w-full text-sm font-bold btn-brand-primary text-white rounded-xl py-2.5 h-10 transition-all shadow-xs"
              onClick={onAddPickupRequest}
            >
              {isPickupRequested ? t('Pickup Requested ✓') : t('Add Pickup Request')}
            </Button>
          )}

          {showPickupButton && isDualUnit && !isOnlyPickup && (
            <div className="text-center text-[11px] text-muted-foreground font-medium py-0.5 tracking-wider">
              -- OR --
            </div>
          )}

          {!isOnlyPickup && (
            <QuantitySelector
              hasQuickOptions={hasQuickOptions}
              quickOptions={quickOptions}
              unitLabel={isDualUnit ? 'kg' : displayUnit}
              quantity={quantity}
              setQuantity={setQuantity}
              isOutOfStock={isOutOfStock}
              isExceeded={isQuantityExceeded}
              isMaxReached={isMaxReached}
              isOnlyPickup={isOnlyPickup}
              isRental={isRental}
              stock={stock}
              handleQuickAdd={handleQuickAdd}
              handleAddToCart={handleAddToCart}
              isAddedToCart={isAddedToCart}
              isCustomMix={isCustomMix}
              currentPrice={currentPrice}
              t={t}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default ServiceCardActions;
