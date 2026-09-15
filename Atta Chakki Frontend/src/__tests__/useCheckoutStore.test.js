import { describe, it, expect, beforeEach } from 'vitest';
import { useCheckoutStore } from '../store/useCheckoutStore';

describe('useCheckoutStore Zustand store suite', () => {
  beforeEach(() => {
    useCheckoutStore.getState().resetCheckout();
  });

  it('initializes with default values', () => {
    const state = useCheckoutStore.getState();
    expect(state.deliveryAddress).toBe('');
    expect(state.deliveryMethod).toBe('delivery');
    expect(state.paymentMethod).toBe('cod');
    expect(state.appliedCoupon).toBeNull();
    expect(state.couponDiscount).toBe(0);
  });

  it('updates delivery address and landmark', () => {
    const { setDeliveryAddress, setLandmark } = useCheckoutStore.getState();
    setDeliveryAddress('Model Town Block C, Lahore');
    setLandmark('Near Central Park');

    const state = useCheckoutStore.getState();
    expect(state.deliveryAddress).toBe('Model Town Block C, Lahore');
    expect(state.landmark).toBe('Near Central Park');
  });

  it('handles coupon application and removal', () => {
    const { setAppliedCoupon, removeCoupon } = useCheckoutStore.getState();
    setAppliedCoupon({ code: 'WELCOME10', discount_value: 10 }, 150);

    let state = useCheckoutStore.getState();
    expect(state.appliedCoupon?.code).toBe('WELCOME10');
    expect(state.couponDiscount).toBe(150);

    removeCoupon();
    state = useCheckoutStore.getState();
    expect(state.appliedCoupon).toBeNull();
    expect(state.couponDiscount).toBe(0);
  });

  it('updates payment method', () => {
    const { setPaymentMethod } = useCheckoutStore.getState();
    setPaymentMethod('jazzcash');
    expect(useCheckoutStore.getState().paymentMethod).toBe('jazzcash');
  });
});
