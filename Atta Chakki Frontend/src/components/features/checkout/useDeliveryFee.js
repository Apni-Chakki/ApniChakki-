import { useState, useEffect } from 'react';
import { API_BASE_URL, MAPBOX_TOKEN } from '../../../config';
import {
  SHOP_LOCATION,
  ROAD_DISTANCE_FACTOR,
  calculateDistance,
} from '../../../utils/checkoutHelpers';

/**
 * Hook to manage delivery fee calculation and distance estimation.
 * Handles dynamic rates from backend API and Mapbox/Haversine routing.
 */
export function useDeliveryFee({ orderType, gpsCoords, isOutOfLahore, user }) {
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [deliveryConfig, setDeliveryConfig] = useState({
    base_fare: 50,
    base_distance: 10,
    per_km_rate: 10,
  });

  // Fetch dynamic delivery rates
  useEffect(() => {
    let isMounted = true;
    const fetchDeliverySettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/get_delivery_settings.php`);
        const data = await res.json();
        if (isMounted && data.success && data.settings) {
          setDeliveryConfig(data.settings);
        }
      } catch (err) {
        console.warn('Failed to load dynamic rates. Using default rates.');
      }
    };
    fetchDeliverySettings();
    return () => {
      isMounted = false;
    };
  }, []);

  // Calculate delivery fee and distance rules
  useEffect(() => {
    let isMounted = true;
    const calcDeliveryFee = async () => {
      if (orderType !== 'delivery') {
        if (isMounted) {
          setDeliveryFee(0);
          setDistanceKm(0);
        }
        return;
      }

      if (gpsCoords && !isOutOfLahore) {
        const straightDist = calculateDistance(
          SHOP_LOCATION.lat,
          SHOP_LOCATION.lng,
          gpsCoords.lat,
          gpsCoords.lng
        );
        const estimatedRoadDist = straightDist * ROAD_DISTANCE_FACTOR;

        const updateFee = (distVal) => {
          if (!isMounted) return;
          setDistanceKm(distVal);
          if (user?.vip_free_shipping) {
            setDeliveryFee(0);
            return;
          }
          let fee = deliveryConfig.base_fare;
          if (distVal > deliveryConfig.base_distance) {
            fee =
              deliveryConfig.base_fare +
              Math.ceil(distVal - deliveryConfig.base_distance) * deliveryConfig.per_km_rate;
          }
          setDeliveryFee(fee);
        };

        if (MAPBOX_TOKEN) {
          try {
            const res = await fetch(
              `https://api.mapbox.com/directions/v5/mapbox/driving/${SHOP_LOCATION.lng},${SHOP_LOCATION.lat};${gpsCoords.lng},${gpsCoords.lat}?overview=false&access_token=${MAPBOX_TOKEN}`
            );
            if (res.ok) {
              const data = await res.json();
              if (data.routes && data.routes[0] && data.routes[0].distance) {
                updateFee(data.routes[0].distance / 1000);
              } else {
                updateFee(estimatedRoadDist);
              }
            } else {
              updateFee(estimatedRoadDist);
            }
          } catch (e) {
            updateFee(estimatedRoadDist);
          }
        } else {
          updateFee(estimatedRoadDist);
        }
      } else {
        if (isMounted) {
          setDeliveryFee(0);
          setDistanceKm(0);
        }
      }
    };

    calcDeliveryFee();

    return () => {
      isMounted = false;
    };
  }, [gpsCoords, orderType, isOutOfLahore, user, deliveryConfig]);

  return {
    deliveryFee,
    distanceKm,
    deliveryConfig,
  };
}
