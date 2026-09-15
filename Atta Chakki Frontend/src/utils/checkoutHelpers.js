/**
 * Constants and pure helpers extracted from Checkout.jsx (Phase 3.1a).
 * Nothing here reads state or performs I/O — safe to import anywhere.
 */

/** Lahore city-center fallback used when GPS fails / user opens the map. */
export const FALLBACK_CENTER = { lat: 31.5204, lng: 74.3587 };

/** Hero-carousel background slides on the checkout screen. */
export const CAROUSEL_SLIDES = [
  'https://images.unsplash.com/photo-1731082300550-8093311708ef?w=1400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1565607052745-35f8c6ba59b1?w=1400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1623066798929-946425dbe1b0?w=1400&auto=format&fit=crop&q=80',
];

/** Sandbox test card numbers (payment gateway integration testing). */
export const SANDBOX_TEST_CARDS = {
  visa_success: '4242 4242 4242 4242',
  mastercard_success: '5555 5555 5555 4444',
  visa_decline: '4000 0000 0000 0002',
  insufficient_funds: '4000 0000 0000 9995',
};

/** Sandbox test phone numbers for JazzCash/EasyPaisa testing. */
export const SANDBOX_TEST_PHONES = {
  success: '03211234567',
  insufficient: '03000000000',
  invalid: '03111111111',
  timeout: '03999999999',
};

/** Physical shop location (used as origin for delivery-fee distance calculations). */
export const SHOP_LOCATION = { lat: 31.4973551, lng: 74.2446932 };

/** Multiplier applied to straight-line distance to approximate driving distance. */
export const ROAD_DISTANCE_FACTOR = 1.5;

/**
 * Great-circle distance in kilometres between two lat/lng points (Haversine).
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in km
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
