import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Phone, Navigation, Clock, Truck, Radio, Shield, Star, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL, GOOGLE_MAPS_API_KEY, SOCKET_URL } from '../../config';
import '../../styles/LiveTrackingPage.css';

// ============================================================
// Socket.io Client
// ============================================================
import { io } from 'socket.io-client';

// ============================================================
// Google Maps Script Loader
// ============================================================
let googleMapsLoadPromise = null;

function loadGoogleMapsScript() {
  if (googleMapsLoadPromise) return googleMapsLoadPromise;
  if (window.google && window.google.maps && window.google.maps.Map) return Promise.resolve();

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const cbName = '__gmapsReady_' + Date.now();
    window[cbName] = () => {
      delete window[cbName];
      resolve();
    };

    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      existing.remove();
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&loading=async&callback=${cbName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      delete window[cbName];
      reject(new Error('Failed to load Google Maps'));
    };
    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
}

// ============================================================
// Helper: Animate marker smoothly between two points
// ============================================================
function animateMarkerTo(marker, newPosition, duration = 1000) {
  const startPos = marker.getPosition();
  const startLat = startPos.lat();
  const startLng = startPos.lng();
  const endLat = newPosition.lat;
  const endLng = newPosition.lng;
  const startTime = Date.now();

  function step() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    
    const lat = startLat + (endLat - startLat) * eased;
    const lng = startLng + (endLng - startLng) * eased;
    
    marker.setPosition({ lat, lng });
    
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  
  requestAnimationFrame(step);
}

// ============================================================
// Helper: Create rotated car SVG icon
// ============================================================
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

// ============================================================
// LiveTrackingPage — InDrive-style customer tracking page
// ============================================================
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

  // Refs
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const socketRef = useRef(null);
  const etaIntervalRef = useRef(null);
  const previousHeadingRef = useRef(0);
  const socketEnabled = import.meta.env.VITE_ENABLE_SOCKET === 'true' && !!SOCKET_URL;

  // ─── 1. Validate token & fetch order info ───
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

  // ─── 2. Connect Socket.io ───
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
          lat: data.latitude,
          lng: data.longitude,
          heading: data.heading || 0,
          speed: data.speed || 0
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
  }, [orderInfo, isDelivered]);

  // ─── 3. Fallback polling (in case socket fails) ───
  useEffect(() => {
    if (!orderInfo || isDelivered) return;

    const pollLocation = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/get_driver_location.php?order_id=${orderInfo.order_id}`);
        const data = await res.json();
        
        if (data.success && data.location) {
          const loc = data.location;
          setDriverLocation(prev => {
            // Only update if socket hasn't updated recently
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
      } catch(e) {
        // Silent fail for polling
      }
    };

    const interval = setInterval(pollLocation, 10000); // poll every 10s as fallback
    return () => clearInterval(interval);
  }, [orderInfo, isDelivered, lastUpdateTime]);

  // ─── 4. Initialize Google Map ───
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !orderInfo) return;

    loadGoogleMapsScript()
      .then(() => {
        if (!mapContainerRef.current) return;

        // Geocode the destination address
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: orderInfo.shipping_address }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const destPos = results[0].geometry.location;
            setDestinationCoords({ lat: destPos.lat(), lng: destPos.lng() });
          }
        });

        const defaultCenter = driverLocation 
          ? { lat: driverLocation.lat, lng: driverLocation.lng }
          : { lat: 31.5204, lng: 74.3587 }; // Lahore

        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          gestureHandling: 'greedy',
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c8e6f5' }] },
            { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f0f4f0' }] },
            { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#ffd54f' }] },
            { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
          ],
        });

        mapRef.current = map;
        setMapReady(true);
      })
      .catch((err) => {
        console.error('Google Maps load error:', err);
      });

    return () => {
      if (driverMarkerRef.current) driverMarkerRef.current.setMap(null);
      if (destMarkerRef.current) destMarkerRef.current.setMap(null);
      if (routePolylineRef.current) routePolylineRef.current.setMap(null);
      if (directionsRendererRef.current) directionsRendererRef.current.setMap(null);
    };
  }, [orderInfo]);

  // ─── 5. Update driver marker on map when location changes ───
  useEffect(() => {
    if (!mapRef.current || !driverLocation || !window.google) return;

    const pos = { lat: driverLocation.lat, lng: driverLocation.lng };
    const heading = driverLocation.heading || 0;

    if (driverMarkerRef.current) {
      // Smooth animation to new position
      animateMarkerTo(driverMarkerRef.current, pos, 800);
      
      // Update icon rotation
      if (Math.abs(heading - previousHeadingRef.current) > 5) {
        driverMarkerRef.current.setIcon({
          url: createCarIcon(heading),
          scaledSize: new window.google.maps.Size(60, 60),
          anchor: new window.google.maps.Point(30, 30),
        });
        previousHeadingRef.current = heading;
      }
    } else {
      // Create new marker
      const marker = new window.google.maps.Marker({
        position: pos,
        map: mapRef.current,
        title: orderInfo?.driver_name || 'Driver',
        icon: {
          url: createCarIcon(heading),
          scaledSize: new window.google.maps.Size(60, 60),
          anchor: new window.google.maps.Point(30, 30),
        },
        zIndex: 100,
      });
      driverMarkerRef.current = marker;
      previousHeadingRef.current = heading;
    }
  }, [driverLocation, mapReady]);

  // ─── 6. Place destination marker ───
  useEffect(() => {
    if (!mapRef.current || !destinationCoords || !window.google) return;

    if (!destMarkerRef.current) {
      const destIcon = `
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

      const marker = new window.google.maps.Marker({
        position: destinationCoords,
        map: mapRef.current,
        title: 'Delivery Destination',
        icon: {
          url: 'data:image/svg+xml,' + encodeURIComponent(destIcon),
          scaledSize: new window.google.maps.Size(48, 60),
          anchor: new window.google.maps.Point(24, 60),
        },
        zIndex: 50,
      });
      destMarkerRef.current = marker;
    }
  }, [destinationCoords, mapReady]);

  // ─── 7. Draw route polyline using Directions API ───
  const drawRoute = useCallback(() => {
    if (!mapRef.current || !driverLocation || !destinationCoords || !window.google) return;

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: { lat: driverLocation.lat, lng: driverLocation.lng },
        destination: destinationCoords,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') {
          // Remove old polyline
          if (routePolylineRef.current) {
            routePolylineRef.current.setMap(null);
          }

          // Draw the route as a styled polyline
          const path = result.routes[0].overview_path;
          
          // Background line (wider, darker)
          const bgPolyline = new window.google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#1e40af',
            strokeOpacity: 0.3,
            strokeWeight: 8,
            map: mapRef.current,
          });

          // Foreground line (thinner, brighter blue)
          const fgPolyline = new window.google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#3b82f6',
            strokeOpacity: 0.9,
            strokeWeight: 5,
            map: mapRef.current,
          });

          // Store refs for cleanup
          routePolylineRef.current = {
            setMap: (map) => {
              bgPolyline.setMap(map);
              fgPolyline.setMap(map);
            }
          };

          // Fit bounds to show both markers
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend({ lat: driverLocation.lat, lng: driverLocation.lng });
          bounds.extend(destinationCoords);
          mapRef.current.fitBounds(bounds, { padding: 80 });
        }
      }
    );
  }, [driverLocation, destinationCoords]);

  // Redraw route every 30 seconds or when destination/driver first appear
  useEffect(() => {
    if (!driverLocation || !destinationCoords || !mapReady) return;

    drawRoute();
    const interval = setInterval(drawRoute, 30000);
    return () => clearInterval(interval);
  }, [destinationCoords, mapReady]); // Only re-setup on destination/map ready

  // ─── 8. Fetch ETA & Distance using Distance Matrix API ───
  const fetchEtaDistance = useCallback(() => {
    if (!driverLocation || !destinationCoords || !window.google) return;

    const service = new window.google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins: [{ lat: driverLocation.lat, lng: driverLocation.lng }],
        destinations: [destinationCoords],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (status === 'OK' && response.rows[0]?.elements[0]?.status === 'OK') {
          const element = response.rows[0].elements[0];
          setEta({
            text: element.duration.text,
            value: element.duration.value
          });
          setDistance({
            text: element.distance.text,
            value: element.distance.value
          });
        }
      }
    );
  }, [driverLocation, destinationCoords]);

  // Update ETA every 15 seconds
  useEffect(() => {
    if (!driverLocation || !destinationCoords || !mapReady) return;

    fetchEtaDistance();
    etaIntervalRef.current = setInterval(fetchEtaDistance, 15000);
    return () => {
      if (etaIntervalRef.current) clearInterval(etaIntervalRef.current);
    };
  }, [driverLocation, destinationCoords, mapReady, fetchEtaDistance]);

  // ─── 9. Snap to Road (optional — when accuracy is low) ───
  const snapToRoad = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(`${API_BASE_URL}/snap_to_road.php?path=${lat},${lng}`);
      const data = await res.json();
      if (data.success && data.snappedPoints?.length > 0) {
        return {
          lat: data.snappedPoints[0].latitude,
          lng: data.snappedPoints[0].longitude
        };
      }
    } catch(e) {
      console.warn('Snap to road failed:', e);
    }
    return { lat, lng }; // Return original if snap fails
  }, []);

  // ─── Time ago helper ───
  const timeAgo = (timestamp) => {
    if (!timestamp) return '';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  // ─── Speed formatting ───
  const formatSpeed = (speedMs) => {
    if (!speedMs || speedMs < 0.5) return 'Stopped';
    const kmh = (speedMs * 3.6).toFixed(0);
    return `${kmh} km/h`;
  };

  // ─── Loading State ───
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

  // ─── Error State ───
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

  // ─── Delivered State ───
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
          <p className="delivered-thanks">Thank you for choosing Apni Chakki! ⭐</p>
        </div>
      </div>
    );
  }

  // ─── Main Tracking UI ───
  return (
    <div className="live-tracking-page">
      {/* ─── Map Container ─── */}
      <div className="tracking-map-container">
        {GOOGLE_MAPS_API_KEY ? (
          <div ref={mapContainerRef} className="tracking-map" />
        ) : (
          <div className="tracking-map-placeholder">
            <MapPin className="placeholder-icon" />
            <p>Map requires Google API key</p>
          </div>
        )}

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

      {/* ─── Bottom Sheet (InDrive-style) ─── */}
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
          <p>🌾 Powered by <strong>Apni Chakki</strong></p>
        </div>
      </div>
    </div>
  );
}

// Need Package icon import
function Package(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m7.5 4.27 9 5.15"/>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/>
      <path d="M12 22V12"/>
    </svg>
  );
}

export default LiveTrackingPage;
