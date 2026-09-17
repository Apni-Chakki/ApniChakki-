import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, MAPBOX_TOKEN, SOCKET_URL } from '../../../../config';
import { io } from 'socket.io-client';

/**
 * Custom hook that manages all tracking data:
 * - Token validation & order info fetch
 * - Socket.io real-time location updates
 * - API polling fallback for driver location
 * - Destination geocoding (Mapbox → Nominatim fallback)
 */
export function useTrackingData(token) {
  const [orderInfo, setOrderInfo] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDelivered, setIsDelivered] = useState(false);
  const [driverOffline, setDriverOffline] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);

  const socketRef = useRef(null);
  const socketEnabled = import.meta.env.VITE_ENABLE_SOCKET === 'true' && !!SOCKET_URL;

  // Validate token & fetch order info
  useEffect(() => {
    if (!token) {
      setError('No tracking token provided');
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/generate_tracking_link.php?token=${token}`);
        const data = await response.json();

        if (data.success) {
          setOrderInfo(data);

          if (data.current_location) {
            setDriverLocation({
              lat: parseFloat(data.current_location.latitude),
              lng: parseFloat(data.current_location.longitude),
              heading: parseFloat(data.current_location.heading || 0),
              speed: parseFloat(data.current_location.speed || 0)
            });
          }

          if (data.delivery_latitude && data.delivery_longitude) {
            setDestinationCoords({
              lat: parseFloat(data.delivery_latitude),
              lng: parseFloat(data.delivery_longitude)
            });
          }

          if (data.order_status === 'completed') {
            setIsDelivered(true);
          }
        } else {
          setError(data.message || 'Invalid tracking link');
        }
      } catch (err) {
        setError('Could not connect to server. Please check your internet connection.');
        console.error('Token validation error:', err);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  // Connect Socket.io
  useEffect(() => {
    if (!orderInfo || isDelivered || !socketEnabled) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 8000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected for tracking');
      socket.emit('tracking:subscribe', { order_id: orderInfo.order_id });
      setDriverOffline(false);
    });

    socket.on('connect_error', (error) => {
      console.warn('Tracking socket unavailable, using polling fallback:', error.message);
      socket.disconnect();
    });

    socket.on('tracking:location_update', (data) => {
      if (data.order_id == orderInfo.order_id) {
        setDriverLocation({
          lat: parseFloat(data.latitude),
          lng: parseFloat(data.longitude),
          heading: parseFloat(data.heading || 0),
          speed: parseFloat(data.speed || 0)
        });
        setLastUpdateTime(Date.now());
        setDriverOffline(false);
      }
    });

    socket.on('tracking:delivery_completed', (data) => {
      if (data.order_id == orderInfo.order_id) {
        setIsDelivered(true);
      }
    });

    socket.on('tracking:driver_offline', (data) => {
      if (data.order_id == orderInfo.order_id) {
        setDriverOffline(true);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    return () => {
      if (socket) {
        socket.emit('tracking:unsubscribe', { order_id: orderInfo.order_id });
        socket.disconnect();
      }
    };
  }, [orderInfo, isDelivered, socketEnabled]);

  // API polling fallback — agar socket na chale to api se location poochna
  useEffect(() => {
    if (!orderInfo || isDelivered) return;

    const pollLocation = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/get_driver_location.php?order_id=${orderInfo.order_id}`);
        const data = await res.json();

        if (data.success && data.location) {
          const loc = data.location;
          setDriverLocation(prev => {
            const socketStale = !lastUpdateTime || (Date.now() - lastUpdateTime > 15000);
            if (socketStale) {
              return {
                lat: parseFloat(loc.latitude),
                lng: parseFloat(loc.longitude),
                heading: parseFloat(loc.heading || 0),
                speed: parseFloat(loc.speed || 0)
              };
            }
            return prev;
          });
        }
      } catch (e) {
        // Silent fail for polling
      }
    };

    const interval = setInterval(pollLocation, 10000);
    return () => clearInterval(interval);
  }, [orderInfo, isDelivered, lastUpdateTime]);

  // Destination geocoding if coords not provided
  useEffect(() => {
    if (!orderInfo?.shipping_address || destinationCoords) return;

    const geocodeAddress = async () => {
      try {
        if (MAPBOX_TOKEN) {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(orderInfo.shipping_address)}.json?access_token=${MAPBOX_TOKEN}&country=PK&proximity=74.3587,31.5204&limit=1`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.features && data.features.length > 0) {
              const [lng, lat] = data.features[0].center;
              setDestinationCoords({ lat, lng });
              return;
            }
          }
        }

        // openstreetmap se address nikalna
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(orderInfo.shipping_address + ', Lahore')}&limit=1`,
          { headers: { 'User-Agent': 'ApniChakki-DeliveryApp/1.0' } }
        );
        if (nomRes.ok) {
          const data = await nomRes.json();
          if (data && data.length > 0) {
            setDestinationCoords({
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon)
            });
          }
        }
      } catch (e) {
        console.warn('Geocoding destination address failed:', e);
      }
    };

    geocodeAddress();
  }, [orderInfo?.shipping_address, destinationCoords]);

  return {
    orderInfo,
    driverLocation,
    eta,
    setEta,
    distance,
    setDistance,
    loading,
    error,
    isDelivered,
    driverOffline,
    lastUpdateTime,
    destinationCoords,
  };
}

export default useTrackingData;
