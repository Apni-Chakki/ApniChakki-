import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner'; 

const CartContext = createContext(undefined);

// Helper: create a stable key from selected customizations for comparison
function customizationKey(service) {
  const isRental = service.is_rental === 1 || service.is_rental === '1' || service.is_rental === true || service.is_rental === 'true';
  if (isRental) {
    return `rental|${service.rental_start_date}|${service.rental_days}`;
  }
  if (service.is_custom_mix && service.selected_mix_items) {
    return 'mix|' + service.selected_mix_items
      .map(m => `${m.item_name}:${m.ratio}`)
      .sort()
      .join('|');
  }
  if (!service.selected_customizations || service.selected_customizations.length === 0) {
    // Backward compat: fallback to old is_cleaning/is_grinding
    return `${service.is_cleaning || false}_${service.is_grinding || false}`;
  }
  return service.selected_customizations
    .map(c => c.option_name)
    .sort()
    .join('|');
}

function normalizeCart(items) {
  const normalized = [];

  for (const item of items || []) {
    if (!item?.service?.id) {
      continue;
    }

    if (item.isWeightPending) {
      const existingPending = normalized.find(
        currentItem => currentItem.service.id === item.service.id && currentItem.isWeightPending
      );

      if (!existingPending) {
        normalized.push(item);
      }
      continue;
    }

    const existingItem = normalized.find(
      currentItem => 
        currentItem.service.id === item.service.id && 
        !currentItem.isWeightPending &&
        customizationKey(currentItem.service) === customizationKey(item.service)
    );

    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      normalized.push(item);
    }
  }

  return normalized;
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('cart');
      return saved ? normalizeCart(JSON.parse(saved)) : [];
    }
    return [];
  });

  useEffect(() => {
    sessionStorage.setItem('cart', JSON.stringify(normalizeCart(cart)));
  }, [cart]);

  const addToCart = (service, quantity = 1, isWeightPending = false) => {
    setCart(prev => {
      const isRental = service.is_rental === 1 || service.is_rental === '1' || service.is_rental === true || service.is_rental === 'true';
      let calculatedPrice = parseFloat(service.price) || 0;
      if (isRental) {
        calculatedPrice = (parseFloat(service.rental_price_per_day) * parseInt(service.rental_days)) + parseFloat(service.security_deposit);
      }
      const roundedService = {
        ...service,
        price: Math.round(calculatedPrice)
      };

      if (isWeightPending) {
        const existingPending = prev.find(item => item.service.id === service.id && item.isWeightPending);
        if (existingPending) {
            toast.error('You already have a pickup request in your cart.');
            return prev;
          }
          return [...prev, { service: roundedService, quantity: quantity, isWeightPending: true }];
      }

      const key = customizationKey(roundedService);
      const existingItem = prev.find(item => 
        item.service.id === service.id && 
        !item.isWeightPending &&
        customizationKey(item.service) === key
      );

      if (existingItem) {
        toast.success(`Updated quantity for ${service.name}`);
        return prev.map(item =>
          item.service.id === service.id && 
          !item.isWeightPending &&
          customizationKey(item.service) === key
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      toast.success(`${service.name} added to cart!`);
      return [...prev, { service: roundedService, quantity, isWeightPending: false }];
    });
  };

  const updateQuantity = (serviceId, quantity, isWeightPending = false, isCleaning = false, isGrinding = false, selectedCustomizations = null, isCustomMix = false, selectedMixItems = null, isRental = false, rentalStartDate = null, rentalDays = null) => {
    setCart(prev => {
      const itemInCart = prev.find(item => {
        if (item.service.id !== serviceId || item.isWeightPending !== isWeightPending) return false;
        
        if (isRental) {
          return customizationKey(item.service) === customizationKey({ is_rental: true, rental_start_date: rentalStartDate, rental_days: rentalDays });
        }
        if (isCustomMix) {
           return customizationKey(item.service) === customizationKey({ is_custom_mix: true, selected_mix_items: selectedMixItems });
        }
        if (selectedCustomizations) {
          return customizationKey(item.service) === customizationKey({ selected_customizations: selectedCustomizations });
        }
        return customizationKey(item.service) === customizationKey({ is_cleaning: isCleaning, is_grinding: isGrinding });
      });
      if (!itemInCart) return prev;

      if (quantity <= 0) {
        return prev.filter(item => item !== itemInCart);
      }
      return prev.map(item => item === itemInCart ? { ...item, quantity } : item);
    });
  };

  const removeFromCart = (serviceId, isWeightPending = false, isCleaning = false, isGrinding = false, selectedCustomizations = null, isCustomMix = false, selectedMixItems = null, isRental = false, rentalStartDate = null, rentalDays = null) => {
    setCart(prev => prev.filter(item => {
      if (item.service.id !== serviceId || item.isWeightPending !== isWeightPending) return true;
      if (isRental) {
        return customizationKey(item.service) !== customizationKey({ is_rental: true, rental_start_date: rentalStartDate, rental_days: rentalDays });
      }
      if (isCustomMix) {
         return customizationKey(item.service) !== customizationKey({ is_custom_mix: true, selected_mix_items: selectedMixItems });
      }
      if (selectedCustomizations) {
        return customizationKey(item.service) !== customizationKey({ selected_customizations: selectedCustomizations });
      }
      return customizationKey(item.service) !== customizationKey({ is_cleaning: isCleaning, is_grinding: isGrinding });
    }));
  };

  const clearCart = () => {
    setCart([]);
    sessionStorage.removeItem('cart');
  };

  const getTotalPrice = () => {
    const rawTotal = cart.reduce((total, item) => {
      if (item.isWeightPending) {
        return total;
      }
      return total + (parseFloat(item.service.price) * item.quantity);
    }, 0);
    return Math.round(rawTotal);
  };

  const getTotalItems = () => {
    return cart.length;
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        getTotalPrice,
        getTotalItems,
        hasTBDItems: () => cart.some(item => item.isWeightPending)
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
