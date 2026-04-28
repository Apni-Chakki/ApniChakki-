import { useState } from 'react';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useCart } from '../../lib/CartContext';
import { toast } from 'sonner';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function ServiceCard({ service }) {
  const [quantity, setQuantity] = useState(1);
  const [isPickupRequested, setIsPickupRequested] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const { addToCart } = useCart();
  const { t } = useTranslation();

  const stock = service.stock_quantity ? parseFloat(service.stock_quantity) : Infinity;
  const isPickupEligible = service.id == 1 || service?.unit?.toLowerCase() === 'trip'; 
  // Trip products are services, never out of stock
  const isOutOfStock = isPickupEligible ? false : stock <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error(t("This item is out of stock."));
      return;
    }
    addToCart(service, quantity, false); 
    toast.success(t(`Added ${quantity} ${service.unit || 'units'} of ${service.name} to cart`));
    setQuantity(1);
    setIsAddedToCart(true);
    setIsPickupRequested(false); // Disable pickup request when adding to cart
  };

  const handleAddPickupRequest = () => {
    addToCart(service, quantity, true); 
    toast.success(t('Pickup request added to cart.'));
    setIsPickupRequested(true);
    setIsAddedToCart(false); // Disable add to cart when pickup request is made
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
            <h3 className="text-foreground mb-1">{t(service.name)}</h3>
            {service.description && (
              <p className="text-muted-foreground text-sm mb-2">{t(service.description)}</p>
            )}
            <p className="text-primary">
              Rs. {service.price} / {t(service.unit || 'unit')}
            </p>
            {stock < 10 && stock > 0 && (
                 <p className="text-xs text-red-500 mt-1">{t('Only')} {stock} {t('left')}!</p>
            )}
          </div>
          
          {isPickupEligible ? (
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
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={isOutOfStock || isPickupRequested}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-10 sm:w-12 text-center text-sm sm:text-base">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={isOutOfStock || isPickupRequested}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <Button
                  className="flex-1 bg-success hover:bg-success/90 text-success-foreground text-sm sm:text-base"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || isPickupRequested}
                >
                  {isOutOfStock ? t("Out of Stock") : isAddedToCart ? t("Added to Cart ✓") : t("Add to Cart")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center border border-border rounded-md">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={isOutOfStock}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-10 sm:w-12 text-center text-sm sm:text-base">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={isOutOfStock}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <Button
                className="flex-1 bg-success hover:bg-success/90 text-success-foreground text-sm sm:text-base"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                {isOutOfStock ? t("Out of Stock") : t("Add to Cart")}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}