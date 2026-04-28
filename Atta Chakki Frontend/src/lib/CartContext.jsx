import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner'; 

const CartContext = createContext(undefined);

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
      currentItem => currentItem.service.id === item.service.id && !currentItem.isWeightPending
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
      if (isWeightPending) {
        const existingPending = prev.find(item => item.service.id === service.id && item.isWeightPending);
        if (existingPending) {
            toast.error('You already have a pickup request in your cart.');
            return prev;
          }
          return [...prev, { service, quantity: quantity, isWeightPending: true }];
      }

      const existingItem = prev.find(item => item.service.id === service.id && !item.isWeightPending);

      if (existingItem) {
        toast.success(`Updated quantity for ${service.name}`);
        return prev.map(item =>
          item.service.id === service.id && !item.isWeightPending
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      toast.success(`${service.name} added to cart!`);
      return [...prev, { service, quantity, isWeightPending: false }];
    });
  };

  const updateQuantity = (serviceId, quantity, isWeightPending = false) => {
    setCart(prev => {
      const itemInCart = prev.find(item => item.service.id === serviceId && item.isWeightPending === isWeightPending);
      if (!itemInCart) return prev;

      if (quantity <= 0) {
        return prev.filter(item => !(item.service.id === serviceId && item.isWeightPending === isWeightPending));
      }
      return prev.map(item =>
        item.service.id === serviceId && item.isWeightPending === isWeightPending ? { ...item, quantity } : item
      );
    });
  };

  const removeFromCart = (serviceId, isWeightPending = false) => {
    setCart(prev => prev.filter(item => !(item.service.id === serviceId && item.isWeightPending === isWeightPending)));
  };

  const clearCart = () => {
    setCart([]);
    sessionStorage.removeItem('cart');
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => {
      if (item.isWeightPending) {
        return total;
      }
      return total + item.service.price * item.quantity;
    }, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
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
        getTotalItems
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