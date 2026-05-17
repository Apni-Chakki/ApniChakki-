import { useState } from 'react';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useCart } from '../../lib/CartContext';
import { toast } from 'sonner';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { useDynamicTranslation } from '../../lib/useDynamicTranslation';

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

  const [isCleaningSelected, setIsCleaningSelected] = useState(service.is_grinding_service ? true : false);
  const [isGrindingSelected, setIsGrindingSelected] = useState(service.is_grinding_service ? true : false);

  const currentPrice = service.is_grinding_service 
    ? (isCleaningSelected ? service.cleaning_price : 0) + (isGrindingSelected ? service.grinding_price : 0)
    : service.price;

  const stock = service.stock_quantity ? parseFloat(service.stock_quantity) : Infinity;
  const isOnlyPickup = service?.unit?.toLowerCase() === 'trip';
  const isPickupEligible = service.id == 1 || isOnlyPickup; 
  // Trip waly products out of stock nahi hoty kabhi bhi
  const isOutOfStock = isPickupEligible ? false : stock <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error(t("This item is out of stock."));
      return;
    }
    if (service.is_grinding_service && !isCleaningSelected && !isGrindingSelected) {
      toast.error(t("Please select at least one service (Cleaning or Grinding)"));
      return;
    }
    addToCart({
      ...service,
      price: currentPrice,
      is_cleaning: isCleaningSelected,
      is_grinding: isGrindingSelected
    }, quantity, false); 
    toast.success(t(`Added ${quantity} ${service.unit || 'units'} of ${service.name} to cart`));
    setQuantity(1);
    setIsAddedToCart(true);
    setIsPickupRequested(false); // cart me add hone pe pickup request band kar rahe han hum log
  };

  const handleAddPickupRequest = () => {
    if (service.is_grinding_service && !isCleaningSelected && !isGrindingSelected) {
      toast.error(t("Please select at least one service (Cleaning or Grinding)"));
      return;
    }
    addToCart({
      ...service,
      price: currentPrice,
      is_cleaning: isCleaningSelected,
      is_grinding: isGrindingSelected
    }, quantity, true); 
    toast.success(t('Pickup request added to cart.'));
    setIsPickupRequested(true);
    setIsAddedToCart(false); // pickup add hone pe cart wala button disable kar rahe han hum log
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
              Rs. {currentPrice} / {t(service.unit || 'unit')}
            <p className="text-primary">
              Rs. {service.price} / {tDynamic(service.unit || 'unit')}
            </p>
            {!!service.is_grinding_service && (
               <div className="mt-3 p-4 bg-orange-50/40 border border-orange-100 rounded-xl space-y-3 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-2 border-b border-orange-100/50 pb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                    <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest">{t("Service Customization")}</p>
                  </div>
                  <div className="space-y-2.5">
                    <div className={`flex items-center justify-between p-2 rounded-lg transition-colors ${isCleaningSelected ? 'bg-orange-100/50' : 'bg-transparent'}`}>
                       <div className="flex items-center space-x-3">
                          <Checkbox 
                            id={`cleaning-${service.id}`} 
                            checked={isCleaningSelected}
                            onCheckedChange={(checked) => setIsCleaningSelected(!!checked)}
                            className="border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                          />
                          <Label htmlFor={`cleaning-${service.id}`} className="text-xs font-bold text-orange-900 cursor-pointer select-none">{t("Cleaning")}</Label>
                       </div>
                       <span className="text-[10px] font-bold text-orange-700 bg-white px-2 py-0.5 rounded-full border border-orange-100">Rs. {service.cleaning_price}</span>
                    </div>
                    <div className={`flex items-center justify-between p-2 rounded-lg transition-colors ${isGrindingSelected ? 'bg-orange-100/50' : 'bg-transparent'}`}>
                       <div className="flex items-center space-x-3">
                          <Checkbox 
                            id={`grinding-${service.id}`} 
                            checked={isGrindingSelected}
                            onCheckedChange={(checked) => setIsGrindingSelected(!!checked)}
                            className="border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                          />
                          <Label htmlFor={`grinding-${service.id}`} className="text-xs font-bold text-orange-900 cursor-pointer select-none">{t("Grinding")}</Label>
                       </div>
                       <span className="text-[10px] font-bold text-orange-700 bg-white px-2 py-0.5 rounded-full border border-orange-100">Rs. {service.grinding_price}</span>
                    </div>
                  </div>
                  {!isCleaningSelected && !isGrindingSelected && (
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
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={handleAddPickupRequest}
                disabled={isAddedToCart}
              >
                {isPickupRequested ? t('Pickup Request Added ✓') : t('Add Pickup Request')}
              </Button>
            </div>
          ) : isPickupEligible ? (
            <div className="flex flex-col gap-2">
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={handleAddPickupRequest}
                disabled={isAddedToCart}
              >
                {isPickupRequested ? t('Pickup Request Added ✓') : t('Add Pickup Request')}
              </Button>
              <p className="text-xs text-muted-foreground text-center">-- {t('OR')} --</p>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center border border-border rounded-md">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-gray-200 hover:bg-gray-300 text-black border-gray-400 flex items-center justify-center px-0 py-0"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={isOutOfStock || isPickupRequested}
                  >
                    <Minus className="h-4 w-4" strokeWidth={3} />
                  </Button>
                  <span className="w-10 sm:w-12 text-center text-sm sm:text-base font-bold">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-gray-200 hover:bg-gray-300 text-black border-gray-400 flex items-center justify-center px-0 py-0"
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={isOutOfStock || isPickupRequested}
                  >
                    <Plus className="h-4 w-4" strokeWidth={3} />
                  </Button>
                </div>
                
                <Button
                  className="flex-1 bg-success hover:bg-success/90 text-success-foreground text-sm sm:text-base"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || isPickupRequested}
                >
                  {isOutOfStock ? t("Out of Stock") : isAddedToCart ? t("Added ✓") : t("Add to Cart")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center border border-border rounded-md">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-gray-200 hover:bg-gray-300 text-black border-gray-400 flex items-center justify-center px-0 py-0"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={isOutOfStock}
                >
                  <Minus className="h-4 w-4" strokeWidth={3} />
                </Button>
                <span className="w-10 sm:w-12 text-center text-sm sm:text-base font-bold">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-gray-200 hover:bg-gray-300 text-black border-gray-400 flex items-center justify-center px-0 py-0"
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={isOutOfStock}
                >
                  <Plus className="h-4 w-4" strokeWidth={3} />
                </Button>
              </div>
              
              <Button
                className="flex-1 bg-success hover:bg-success/90 text-success-foreground text-sm sm:text-base"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                {isOutOfStock ? t("Out of Stock") : isAddedToCart ? t("Added ✓") : t("Add to Cart")}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}