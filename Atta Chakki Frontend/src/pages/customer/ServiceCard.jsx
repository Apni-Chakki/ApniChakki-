import { useState } from 'react';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '../../components/common/button';
import { Card } from '../../components/common/card';
import { useCart } from '../../store/CartContext';
import { toast } from 'sonner';
import { ImageWithFallback } from '../../components/common/ImageWithFallback';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '../../components/common/checkbox';
import { Label } from '../../components/common/label';
import { useDynamicTranslation } from '../../hooks/useDynamicTranslation';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function ServiceCard({ service }) {
  const [quantity, setQuantity] = useState(1);
  const [isPickupRequested, setIsPickupRequested] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const { addToCart } = useCart();
  const { t, tDynamic } = useDynamicTranslation();

  // Dynamic customizations from API
  const customizations = service.customizations || [];
  const hasCustomizations = customizations.length > 0 || service.is_grinding_service == 1;

  // Fallback to old cleaning/grinding if no dynamic customizations exist
  const effectiveCustomizations = customizations.length > 0
    ? customizations
    : (service.is_grinding_service == 1
      ? [
          { id: 'legacy-clean', option_name: 'Cleaning', option_price: service.cleaning_price || 0 },
          { id: 'legacy-grind', option_name: 'Grinding', option_price: service.grinding_price || 0 }
        ]
      : []);

  // Track which customizations are selected (all selected by default)
  const [selectedOptions, setSelectedOptions] = useState(() =>
    effectiveCustomizations.reduce((acc, c, i) => ({ ...acc, [i]: true }), {})
  );

  const toggleOption = (index) => {
    setSelectedOptions(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Calculate current price based on selected customizations
  const currentPrice = hasCustomizations
    ? effectiveCustomizations.reduce((sum, c, i) => sum + (selectedOptions[i] ? parseFloat(c.option_price) || 0 : 0), 0)
    : service.price;

  const stock = service.stock_quantity ? parseFloat(service.stock_quantity) : Infinity;
  const isOnlyPickup = service?.unit?.toLowerCase() === 'trip';
  const isPickupEligible = service.id == 1 || isOnlyPickup; 
  // Trip waly products out of stock nahi hoty kabhi bhi
  const isOutOfStock = isPickupEligible ? false : stock <= 0;

  const getSelectedCustomizations = () => {
    return effectiveCustomizations
      .filter((_, i) => selectedOptions[i])
      .map(c => ({ option_name: c.option_name, option_price: parseFloat(c.option_price) || 0 }));
  };

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error(t("This item is out of stock."));
      return;
    }
    const selected = getSelectedCustomizations();
    if (hasCustomizations && selected.length === 0) {
      toast.error(t("Please select at least one service option"));
      return;
    }

    // Backward compat: derive is_cleaning / is_grinding from selected options
    const isCleaning = selected.some(s => s.option_name.toLowerCase().includes('clean'));
    const isGrinding = selected.some(s => s.option_name.toLowerCase().includes('grind'));

    addToCart({
      ...service,
      price: currentPrice,
      is_cleaning: isCleaning,
      is_grinding: isGrinding,
      selected_customizations: selected
    }, quantity, false); 
    toast.success(t(`Added ${quantity} ${service.unit || 'units'} of ${service.name} to cart`));
    setQuantity(1);
    setIsAddedToCart(true);
    setIsPickupRequested(false);
  };

  const handleAddPickupRequest = () => {
    const selected = getSelectedCustomizations();
    if (hasCustomizations && selected.length === 0) {
      toast.error(t("Please select at least one service option"));
      return;
    }

    const isCleaning = selected.some(s => s.option_name.toLowerCase().includes('clean'));
    const isGrinding = selected.some(s => s.option_name.toLowerCase().includes('grind'));

    addToCart({
      ...service,
      price: currentPrice,
      is_cleaning: isCleaning,
      is_grinding: isGrinding,
      selected_customizations: selected
    }, quantity, true); 
    toast.success(t('Pickup request added to cart.'));
    setIsPickupRequested(true);
    setIsAddedToCart(false);
  };

  return (
    <motion.div
      variants={cardVariants} 
      whileHover={{ y: -5 }} 
      className="h-full"
    >
      <Card className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow h-full">
        {service.image_url || service.imageUrl ? (
          <div className="relative w-full h-48 sm:h-52 md:h-56 overflow-hidden bg-muted">
            <ImageWithFallback
              src={service.image_url || service.imageUrl}
              alt={service.name}
              className="w-full h-full object-cover"
            />
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white font-bold">{t('Out of Stock')}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="relative w-full h-48 sm:h-52 md:h-56 overflow-hidden bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16" />
              </svg>
              <p className="text-xs">{t('No image')} </p>
            </div>
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white font-bold">{t('Out of Stock')}</span>
              </div>
            )}
          </div>
        )}
        
        <div className="p-4 flex flex-col gap-3 flex-1">
          <div className="flex-1">
            <h3 className="text-foreground mb-1">{tDynamic(service.name)}</h3>
            {service.description && (
              <p className="text-muted-foreground text-sm mb-2">{tDynamic(service.description)}</p>
            )}
            <p className="text-primary font-bold text-lg">
              Rs. {currentPrice} / {tDynamic(service.unit || 'unit')}
            </p>

            {/* Dynamic Customization Options */}
            {hasCustomizations && effectiveCustomizations.length > 0 && (
               <div className="mt-3 p-4 bg-orange-50/40 border border-orange-100 rounded-xl space-y-3 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-2 border-b border-orange-100/50 pb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                    <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest">{t("Service Customization")}</p>
                  </div>
                  <div className="space-y-2.5">
                    {effectiveCustomizations.map((cust, idx) => (
                      <div key={cust.id || idx} className={`flex items-center justify-between p-2 rounded-lg transition-colors ${selectedOptions[idx] ? 'bg-orange-100/50' : 'bg-transparent'}`}>
                         <div className="flex items-center space-x-3">
                            <Checkbox 
                              id={`cust-${service.id}-${idx}`} 
                              checked={!!selectedOptions[idx]}
                              onCheckedChange={() => toggleOption(idx)}
                              className="checkbox-orange border-orange-500 bg-white"
                            />
                            <Label htmlFor={`cust-${service.id}-${idx}`} className="text-xs font-bold text-orange-900 cursor-pointer select-none">{t(cust.option_name)}</Label>
                         </div>
                         <span className="text-[10px] font-bold text-orange-700 bg-white px-2 py-0.5 rounded-full border border-orange-100">Rs. {cust.option_price}</span>
                      </div>
                    ))}
                  </div>
                  {Object.values(selectedOptions).every(v => !v) && (
                    <p className="text-[9px] text-red-500 font-bold animate-bounce text-center italic mt-1">
                      ⚠ {t("Please select at least one service")}
                    </p>
                  )}
               </div>
            )}
            {stock < 10 && stock > 0 && !isOnlyPickup && (
                 <p className="text-xs text-red-500 mt-1">{t('Only')} {stock} {t('left')}!</p>
            )}
          </div>
          
          {isOnlyPickup ? (
            <div className="flex flex-col gap-2">
              <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleAddPickupRequest} disabled={isAddedToCart}>
                {isPickupRequested ? t('Pickup Request Added ✓') : t('Add Pickup Request')}
              </Button>
            </div>
          ) : isPickupEligible ? (
            <div className="flex flex-col gap-2">
              <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleAddPickupRequest} disabled={isAddedToCart}>
                {isPickupRequested ? t('Pickup Request Added ✓') : t('Add Pickup Request')}
              </Button>
              <p className="text-xs text-muted-foreground text-center">-- {t('OR')} --</p>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center border border-border rounded-md">
                  <Button variant="outline" size="icon" className="h-8 w-8 bg-gray-200 hover:bg-gray-300 text-black border-gray-400 flex items-center justify-center px-0 py-0" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={isOutOfStock || isPickupRequested}>
                    <Minus className="h-4 w-4" strokeWidth={3} />
                  </Button>
                  <span className="w-10 sm:w-12 text-center text-sm sm:text-base font-bold">{quantity}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8 bg-gray-200 hover:bg-gray-300 text-black border-gray-400 flex items-center justify-center px-0 py-0" onClick={() => setQuantity(quantity + 1)} disabled={isOutOfStock || isPickupRequested}>
                    <Plus className="h-4 w-4" strokeWidth={3} />
                  </Button>
                </div>
                <Button className="flex-1 bg-success hover:bg-success/90 text-success-foreground text-sm sm:text-base" onClick={handleAddToCart} disabled={isOutOfStock || isPickupRequested}>
                  {isOutOfStock ? t("Out of Stock") : isAddedToCart ? t("Added ✓") : t("Add to Cart")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center border border-border rounded-md">
                <Button variant="outline" size="icon" className="h-8 w-8 bg-gray-200 hover:bg-gray-300 text-black border-gray-400 flex items-center justify-center px-0 py-0" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={isOutOfStock}>
                  <Minus className="h-4 w-4" strokeWidth={3} />
                </Button>
                <span className="w-10 sm:w-12 text-center text-sm sm:text-base font-bold">{quantity}</span>
                <Button variant="outline" size="icon" className="h-8 w-8 bg-gray-200 hover:bg-gray-300 text-black border-gray-400 flex items-center justify-center px-0 py-0" onClick={() => setQuantity(quantity + 1)} disabled={isOutOfStock}>
                  <Plus className="h-4 w-4" strokeWidth={3} />
                </Button>
              </div>
              <Button className="flex-1 bg-success hover:bg-success/90 text-success-foreground text-sm sm:text-base" onClick={handleAddToCart} disabled={isOutOfStock}>
                {isOutOfStock ? t("Out of Stock") : isAddedToCart ? t("Added ✓") : t("Add to Cart")}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
