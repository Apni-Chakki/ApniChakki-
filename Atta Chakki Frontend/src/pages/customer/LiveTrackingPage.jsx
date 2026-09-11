import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Phone, Navigation, Clock, Truck, Radio, Shield, Star, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { API_BASE_URL, MAPBOX_TOKEN, SOCKET_URL } from '../../config';
import '../../styles/LiveTrackingPage.css';

// Socket.io Client
import { io } from 'socket.io-client';

// Helper: Create rotated car SVG icon
function createCarIcon(heading = 0, color = '#2563eb') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
        </filter>
      </defs>
      <g transform="rotate(${heading}, 30, 30)" filter="url(#shadow)">
        <circle cx="30" cy="30" r="24" fill="${color}" opacity="0.15"/>
        <circle cx="30" cy="30" r="18" fill="${color}"/>
        <path d="M30 14 L22 30 L30 26 L38 30 Z" fill="white" stroke="white" stroke-width="1" stroke-linejoin="round"/>
        <circle cx="30" cy="30" r="4" fill="white" opacity="0.6"/>
      </g>
      <circle cx="30" cy="30" r="27" fill="none" stroke="${color}" stroke-width="2" opacity="0.3">
        <animate attributeName="r" from="20" to="28" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite"/>
      </circle>
    </svg>
  `;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

const DEST_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 60" width="48" height="60">
    <defs>
      <filter id="destShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.25"/>
      </filter>
    </defs>
    <g filter="url(#destShadow)">
      <path d="M24 4C14.06 4 6 12.06 6 22c0 14 18 32 18 32s18-18 18-32c0-9.94-8.06-18-18-18z" fill="#ef4444"/>
      <circle cx="24" cy="22" r="9" fill="white"/>
      <circle cx="24" cy="22" r="4" fill="#ef4444"/>
    </g>
  </svg>
`;

// customer live tracking page
export function LiveTrackingPage() {
  const { token } = useParams();

  // State
  const [orderInfo, setOrderInfo] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [eta, setEta] = useState(null);        // { text: '8 mins', value: 480 }
  const [distance, setDistance] = useState(null); // { text: '2.5 km', value: 2500 }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [isDelivered, setIsDelivered] = useState(false);
  const [driverOffline, setDriverOffline] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);

  // driver location ref
  const driverLocRef = useRef(null);
  useEffect(() => {
    driverLocRef.current = driverLocation;
  }, [driverLocation]);

  // Refs
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const socketRef = useRef(null);
  const etaIntervalRef = useRef(null);
  const previousHeadingRef = useRef(0);
  const routeDrawnRef = useRef(false);
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

  // Fallback polling (in case socket fails)
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

        // Nominatim fallback
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

  // Draw route and calculate ETA
  const drawRoute = useCallback(async () => {
    const loc = driverLocRef.current;
    if (!mapRef.current || !loc || !destinationCoords) return;

    try {
      let routeData = null;

      // 1. Try Mapbox Directions API
      if (MAPBOX_TOKEN) {
        try {
          const res = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${loc.lng},${loc.lat};${destinationCoords.lng},${destinationCoords.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.routes && data.routes[0]) {
              routeData = data.routes[0];
            }
          }
        } catch (e) {
          console.warn('Mapbox directions failed, falling back to OSRM:', e);
        }
      }

      // 2. Fallback to OSRM
      if (!routeData) {
        try {
          const osrmRes = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${loc.lng},${loc.lat};${destinationCoords.lng},${destinationCoords.lat}?geometries=geojson&overview=full`
          );
          if (osrmRes.ok) {
            const data = await osrmRes.json();
            if (data.routes && data.routes[0]) {
              routeData = data.routes[0];
            }
          }
        } catch (e) {
          console.warn('OSRM routing failed:', e);
        }
      }

      if (!routeData) {
        // Fallback straight line
        routeData = {
          distance: 1000,
          duration: 300,
          geometry: {
            type: 'LineString',
            coordinates: [
              [loc.lng, loc.lat],
              [destinationCoords.lng, destinationCoords.lat]
            ]
          }
        };
      }

      // Update ETA & Distance
      if (routeData.duration) {
        const mins = Math.round(routeData.duration / 60);
        setEta({ text: mins <= 1 ? '1 min' : `${mins} mins`, value: routeData.duration });
      }
      if (routeData.distance) {
        const km = (routeData.distance / 1000).toFixed(1);
        setDistance({ text: `${km} km`, value: routeData.distance });
      }

      const map = mapRef.current;
      if (!map) return;

      const geojson = {
        type: 'Feature',
        properties: {},
        geometry: routeData.geometry
      };

      if (map.getSource('route-line-source')) {
        map.getSource('route-line-source').setData(geojson);
      } else if (map.isStyleLoaded()) {
        map.addSource('route-line-source', {
          type: 'geojson',
          data: geojson
        });

        // Glow layer
        map.addLayer({
          id: 'route-glow-layer',
          type: 'line',
          source: 'route-line-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#1e40af',
            'line-width': 12,
            'line-opacity': 0.25
          }
        });

        // Main polyline
        map.addLayer({
          id: 'route-main-layer',
          type: 'line',
          source: 'route-line-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#2563eb',
            'line-width': 5,
            'line-opacity': 0.95
          }
        });
      }

      // Fit bounds
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([loc.lng, loc.lat]);
      bounds.extend([destinationCoords.lng, destinationCoords.lat]);
      map.fitBounds(bounds, { padding: 60, maxZoom: 16 });

    } catch (err) {
      console.warn('Error drawing route on map:', err);
    }
  }, [destinationCoords]);

  // Initialize Mapbox Map
  useEffect(() => {
    if (!mapContainerRef.current || !orderInfo) return;

    const isValidToken = Boolean(
      MAPBOX_TOKEN &&
      MAPBOX_TOKEN.startsWith('pk.') &&
      !MAPBOX_TOKEN.includes('demo_token') &&
      MAPBOX_TOKEN.length > 30
    );

    if (isValidToken) {
      mapboxgl.accessToken = MAPBOX_TOKEN;
    }

    const defaultCenter = driverLocation
      ? [driverLocation.lng, driverLocation.lat]
      : [74.3587, 31.5204]; // Lahore [lng, lat]

    const mapStyle = isValidToken
      ? 'mapbox://styles/mapbox/streets-v12'
      : {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [{
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19
          }]
        };

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: defaultCenter,
      zoom: 15,
      attributionControl: false
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    map.on('load', () => {
      mapRef.current = map;
      setMapReady(true);
      map.resize();
      if (destinationCoords && driverLocRef.current) {
        drawRoute();
      }
    });

    // Handle dynamic responsive resizing
    let resizeObserver = null;
    if (typeof window !== 'undefined' && window.ResizeObserver && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) mapRef.current.resize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    const resizeTimers = [100, 300, 600, 1000].map(delay =>
      setTimeout(() => {
        if (mapRef.current) mapRef.current.resize();
      }, delay)
    );

    const handleResize = () => {
      if (mapRef.current) mapRef.current.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      resizeTimers.forEach(clearTimeout);
      window.removeEventListener('resize', handleResize);

      if (driverMarkerRef.current) driverMarkerRef.current.remove();
      if (destMarkerRef.current) destMarkerRef.current.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [orderInfo]);

  // Update Driver Marker
  useEffect(() => {
    if (!mapRef.current || !driverLocation || !mapReady) return;

    const { lng, lat, heading = 0 } = driverLocation;

    if (!routeDrawnRef.current && destinationCoords) {
      routeDrawnRef.current = true;
      drawRoute();
    }

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLngLat([lng, lat]);

      if (Math.abs(heading - previousHeadingRef.current) > 5) {
        const img = driverMarkerRef.current.getElement().querySelector('img');
        if (img) {
          img.src = createCarIcon(heading);
        }
        previousHeadingRef.current = heading;
      }
    } else {
      const el = document.createElement('div');
      el.className = 'driver-marker-container';
      el.innerHTML = `<img src="${createCarIcon(heading)}" style="width: 56px; height: 56px; pointer-events: none;" />`;

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);

      driverMarkerRef.current = marker;
      previousHeadingRef.current = heading;
    }
  }, [driverLocation, mapReady, destinationCoords, drawRoute]);

  // Update Destination Marker
  useEffect(() => {
    if (!mapRef.current || !destinationCoords || !mapReady) return;

    if (!destMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'destination-marker-container';
      el.innerHTML = `<img src="data:image/svg+xml,${encodeURIComponent(DEST_ICON_SVG)}" style="width: 44px; height: 56px; pointer-events: none;" />`;

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([destinationCoords.lng, destinationCoords.lat])
        .addTo(mapRef.current);

      destMarkerRef.current = marker;
    } else {
      destMarkerRef.current.setLngLat([destinationCoords.lng, destinationCoords.lat]);
    }
  }, [destinationCoords, mapReady]);

  // Refresh route periodically
  useEffect(() => {
    if (!destinationCoords || !mapReady) return;

    const interval = setInterval(() => {
      if (driverLocRef.current) {
        drawRoute();
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [destinationCoords, mapReady, drawRoute]);

  // Time ago helper
  const timeAgo = (timestamp) => {
    if (!timestamp) return '';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  // Speed formatting
  const formatSpeed = (speedMs) => {
    if (!speedMs || speedMs < 0.5) return 'Stopped';
    const kmh = (speedMs * 3.6).toFixed(0);
    return `${kmh} km/h`;
  };

  // Loading State
  if (loading) {
    return (
      <div className="live-tracking-loading">
        <div className="loading-spinner">
          <Loader2 className="loading-icon" />
          <h2>Loading Tracking...</h2>
          <p>Connecting to delivery server</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="live-tracking-error">
        <div className="error-card">
          <AlertTriangle className="error-icon" />
          <h2>Tracking Unavailable</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Delivered State
  if (isDelivered) {
    return (
      <div className="live-tracking-delivered">
        <div className="delivered-card">
          <div className="delivered-checkmark">
            <CheckCircle2 className="delivered-icon" />
          </div>
          <h2>Order Delivered! 🎉</h2>
          <p>Your order #{orderInfo?.order_id} has been delivered successfully.</p>
          {orderInfo?.driver_name && (
            <p className="delivered-driver">Delivered by <strong>{orderInfo.driver_name}</strong></p>
          )}
          <p className="delivered-thanks">Thank you for choosing Suchi Chakki! ⭐</p>
        </div>
      </div>
    );
  }

  // Main Tracking UI
  return (
    <div className="live-tracking-page">
      {/* Map Container */}
      <div className="tracking-map-container">
        <div ref={mapContainerRef} className="tracking-map" />

        {/* Live badge overlay */}
        <div className="map-live-badge">
          <Radio className="live-dot" />
          <span>LIVE</span>
        </div>

        {/* Driver offline warning */}
        {driverOffline && (
          <div className="map-offline-badge">
            <AlertTriangle className="offline-icon" />
            <span>Driver signal lost</span>
          </div>
        )}
      </div>

      {/* Bottom Sheet (InDrive-style) */}
      <div className="tracking-bottom-sheet">
        {/* ETA Header */}
        <div className="eta-header">
          <div className="eta-pill">
            {eta ? (
              <>
                <Clock className="eta-clock-icon" />
                <span className="eta-time">{eta.text}</span>
              </>
            ) : (
              <>
                <Loader2 className="eta-clock-icon spinning" />
                <span className="eta-time">Calculating...</span>
              </>
            )}
          </div>
          {distance && (
            <span className="distance-text">{distance.text} away</span>
          )}
        </div>

        {/* ETA Card */}
        <div className="eta-card">
          <div className="eta-card-content">
            <div className="eta-main">
              <Navigation className="eta-nav-icon" />
              <div>
                <p className="eta-label">Estimated Arrival</p>
                <p className="eta-value">
                  {eta
                    ? `Driver is ${distance?.text || '...'} away — ${eta.text} to arrive`
                    : 'Calculating route...'
                  }
                </p>
              </div>
            </div>
            {driverLocation && (
              <div className="eta-speed">
                <Truck className="speed-icon" />
                <span>{formatSpeed(driverLocation.speed)}</span>
              </div>
            )}
          </div>
          {lastUpdateTime && (
            <p className="last-update">Last updated: {timeAgo(lastUpdateTime)}</p>
          )}
        </div>

        {/* Driver Info */}
        {orderInfo && (
          <div className="driver-card">
            <div className="driver-info">
              <div className="driver-avatar">
                <Truck className="avatar-icon" />
              </div>
              <div className="driver-details">
                <p className="driver-name">{orderInfo.driver_name || 'Your Driver'}</p>
                <p className="driver-subtitle">
                  <Shield className="verified-icon" />
                  Verified Driver • Order #{orderInfo.order_id}
                </p>
              </div>
              <div className="driver-rating">
                <Star className="star-icon" />
                <span>4.9</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="driver-actions">
              {orderInfo.driver_phone && (
                <a href={`tel:${orderInfo.driver_phone}`} className="action-btn call-btn">
                  <Phone className="action-icon" />
                  <span>Call Driver</span>
                </a>
              )}
              <a
                href={driverLocation
                  ? `https://www.google.com/maps?q=${driverLocation.lat},${driverLocation.lng}`
                  : '#'
                }
                target="_blank"
                rel="noopener noreferrer"
                className="action-btn maps-btn"
              >
                <Navigation className="action-icon" />
                <span>Open Maps</span>
              </a>
            </div>
          </div>
        )}

        {/* Delivery Details */}
        {orderInfo && (
          <div className="delivery-details-card">
            <div className="detail-row">
              <MapPin className="detail-icon destination-icon" />
              <div>
                <p className="detail-label">Delivering to</p>
                <p className="detail-value">{orderInfo.shipping_address || 'Address not available'}</p>
              </div>
            </div>
            <div className="detail-divider" />
            <div className="detail-row">
              <Package className="detail-icon package-icon" />
              <div>
                <p className="detail-label">Order Total</p>
                <p className="detail-value amount">Rs. {parseFloat(orderInfo.total_amount || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Branding Footer */}
        <div className="tracking-footer">
          <p>🌾 Powered by <strong>Suchi Chakki</strong></p>
        </div>
      </div>
    </div>
  );
}

// Package icon helper
function Package(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

export default LiveTrackingPage;
