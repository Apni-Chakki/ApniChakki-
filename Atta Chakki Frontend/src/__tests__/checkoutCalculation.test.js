import { describe, it, expect } from 'vitest';
import { calculateDistance, SHOP_LOCATION, ROAD_DISTANCE_FACTOR } from '../utils/checkoutHelpers';
import { isWithinLahoreBounds, LAHORE_BOUNDS } from '../utils/lahoreLocations';

describe('Checkout Calculations & Distance Utilities', () => {
  describe('calculateDistance (Haversine formula)', () => {
    it('returns 0 when coordinates are identical', () => {
      const dist = calculateDistance(31.5204, 74.3587, 31.5204, 74.3587);
      expect(dist).toBeCloseTo(0, 4);
    });

    it('calculates correct straight-line distance from shop to Gulberg', () => {
      // Shop location: 31.4973551, 74.2446932
      // Gulberg: 31.5120, 74.3430
      const dist = calculateDistance(
        SHOP_LOCATION.lat,
        SHOP_LOCATION.lng,
        31.5120,
        74.3430
      );
      // Distance is ~9.5 km
      expect(dist).toBeGreaterThan(8);
      expect(dist).toBeLessThan(12);
    });

    it('approximates road distance using road distance factor', () => {
      const straightLineDist = calculateDistance(
        SHOP_LOCATION.lat,
        SHOP_LOCATION.lng,
        31.5120,
        74.3430
      );
      const roadDist = straightLineDist * ROAD_DISTANCE_FACTOR;
      expect(roadDist).toBeGreaterThan(straightLineDist);
      expect(roadDist).toBeCloseTo(straightLineDist * 1.5, 4);
    });
  });

  describe('isWithinLahoreBounds', () => {
    it('returns true for known Lahore coordinates', () => {
      // Johar Town
      expect(isWithinLahoreBounds(31.4632, 74.2939)).toBe(true);
      // Gulberg
      expect(isWithinLahoreBounds(31.5120, 74.3430)).toBe(true);
      // Model Town
      expect(isWithinLahoreBounds(31.4836, 74.3260)).toBe(true);
      // Boundary edges
      expect(isWithinLahoreBounds(LAHORE_BOUNDS.minLat, LAHORE_BOUNDS.minLng)).toBe(true);
      expect(isWithinLahoreBounds(LAHORE_BOUNDS.maxLat, LAHORE_BOUNDS.maxLng)).toBe(true);
    });

    it('returns false for locations clearly outside Lahore', () => {
      // Islamabad
      expect(isWithinLahoreBounds(33.6844, 73.0479)).toBe(false);
      // Karachi
      expect(isWithinLahoreBounds(24.8607, 67.0011)).toBe(false);
      // Faisalabad
      expect(isWithinLahoreBounds(31.4504, 73.1350)).toBe(false);
    });

    it('handles string coordinates and invalid input defensively', () => {
      expect(isWithinLahoreBounds('31.5204', '74.3587')).toBe(true);
      expect(isWithinLahoreBounds(NaN, 74.3587)).toBe(false);
      expect(isWithinLahoreBounds('invalid', 'coords')).toBe(false);
      expect(isWithinLahoreBounds(null, undefined)).toBe(false);
    });
  });

  describe('Delivery Fee Calculation Business Logic', () => {
    const config = {
      base_fare: 150,
      base_distance_km: 5,
      per_km_rate: 25,
    };

    const computeDeliveryFee = ({ distanceKm, isVipFreeShipping, orderType }) => {
      if (orderType === 'pickup') return 0;
      if (isVipFreeShipping) return 0;

      if (distanceKm <= config.base_distance_km) {
        return config.base_fare;
      }
      const extraKm = distanceKm - config.base_distance_km;
      return Math.round(config.base_fare + extraKm * config.per_km_rate);
    };

    it('gives 0 delivery fee for store pickup', () => {
      const fee = computeDeliveryFee({ distanceKm: 15, isVipFreeShipping: false, orderType: 'pickup' });
      expect(fee).toBe(0);
    });

    it('gives 0 delivery fee for VIP customer with free shipping', () => {
      const fee = computeDeliveryFee({ distanceKm: 18, isVipFreeShipping: true, orderType: 'delivery' });
      expect(fee).toBe(0);
    });

    it('charges base fare when distance is within base distance', () => {
      const fee = computeDeliveryFee({ distanceKm: 3.5, isVipFreeShipping: false, orderType: 'delivery' });
      expect(fee).toBe(150);
    });

    it('charges base fare + per km rate for distances beyond base distance', () => {
      // 9 km: base (5km) = 150, 4 extra km * 25 = 100, total = 250
      const fee = computeDeliveryFee({ distanceKm: 9, isVipFreeShipping: false, orderType: 'delivery' });
      expect(fee).toBe(250);
    });
  });

  describe('Order Total & Discount Calculation Business Logic', () => {
    const computeTotals = ({ items, deliveryFee, appliedCoupon, user }) => {
      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const couponDiscount = appliedCoupon ? appliedCoupon.discount_amount : 0;
      const vipDiscountAmount = user?.vip_discount ? (total - couponDiscount) * 0.10 : 0;
      const grandTotal = Math.max(0, Math.round(total + deliveryFee - couponDiscount - vipDiscountAmount));

      return { total, couponDiscount, vipDiscountAmount, grandTotal };
    };

    it('correctly calculates basic grand total with delivery fee', () => {
      const items = [{ price: 500, quantity: 2 }]; // 1000
      const result = computeTotals({
        items,
        deliveryFee: 150,
        appliedCoupon: null,
        user: null
      });

      expect(result.total).toBe(1000);
      expect(result.grandTotal).toBe(1150);
    });

    it('applies coupon discount and calculates 10% VIP discount on remainder', () => {
      const items = [{ price: 1000, quantity: 1 }]; // 1000
      const coupon = { code: 'SAVE200', discount_amount: 200 };
      // remainder after coupon = 800, VIP 10% = 80
      // grandTotal = 1000 + 150 - 200 - 80 = 870
      const result = computeTotals({
        items,
        deliveryFee: 150,
        appliedCoupon: coupon,
        user: { vip_discount: true }
      });

      expect(result.couponDiscount).toBe(200);
      expect(result.vipDiscountAmount).toBe(80);
      expect(result.grandTotal).toBe(870);
    });

    it('ensures grandTotal is clamped to 0 if discounts exceed total', () => {
      const items = [{ price: 100, quantity: 1 }];
      const coupon = { code: 'MEGA999', discount_amount: 500 };
      const result = computeTotals({
        items,
        deliveryFee: 0,
        appliedCoupon: coupon,
        user: null
      });

      expect(result.grandTotal).toBe(0);
    });

    it('correctly identifies coupon eligible subtotal (excluding items with product discounts)', () => {
      const cart = [
        {
          quantity: 2,
          service: { price: 200, discount_type: 'percent', discount_value: 10 } // has discount
        },
        {
          quantity: 3,
          service: { price: 150, discount_type: 'none', discount_value: 0 } // no discount -> eligible (450)
        },
        {
          quantity: 1,
          service: { price: 500 } // no discount -> eligible (500)
        }
      ];

      const couponEligibleSubtotal = cart.reduce((sum, item) => {
        const hasProductDiscount = item.service?.discount_type && item.service.discount_type !== 'none' && item.service.discount_value > 0;
        if (hasProductDiscount) return sum;
        const basePrice = item.service?.price || 0;
        return sum + (basePrice * item.quantity);
      }, 0);

      expect(couponEligibleSubtotal).toBe(950);
    });
  });
});
