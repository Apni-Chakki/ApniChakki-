import { create } from 'zustand';

const initialCheckoutState = {
  deliveryAddress: '',
  landmark: '',
  coordinates: null, // { lat: number, lng: number }
  deliveryMethod: 'delivery', // 'delivery' | 'pickup'
  paymentMethod: 'cod', // 'cod' | 'jazzcash' | 'card' | 'bank'
  notes: '',
  appliedCoupon: null,
  couponDiscount: 0,
  isSubmitting: false,
  validationErrors: {},
};

export const useCheckoutStore = create((set, _get) => ({
  ...initialCheckoutState,

  setDeliveryAddress: (deliveryAddress) => set({ deliveryAddress }),
  setLandmark: (landmark) => set({ landmark }),
  setCoordinates: (coordinates) => set({ coordinates }),
  setDeliveryMethod: (deliveryMethod) => set({ deliveryMethod }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setNotes: (notes) => set({ notes }),

  setAppliedCoupon: (coupon, couponDiscount = 0) =>
    set({
      appliedCoupon: coupon,
      couponDiscount: Math.max(0, Number(couponDiscount) || 0),
    }),

  removeCoupon: () => set({ appliedCoupon: null, couponDiscount: 0 }),
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
  setValidationErrors: (validationErrors) => set({ validationErrors }),

  clearFieldError: (field) =>
    set((state) => {
      const nextErrors = { ...state.validationErrors };
      delete nextErrors[field];
      return { validationErrors: nextErrors };
    }),

  resetCheckout: () => set({ ...initialCheckoutState }),
}));

