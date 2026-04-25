import { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, MapPin, Truck, Phone, Navigation, Clock, RefreshCw, Eye, ChevronLeft, CheckCircle2, Route, Timer, Link2, Copy } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { API_BASE_URL, GOOGLE_MAPS_API_KEY, SOCKET_URL } from '../../config';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';

// ============================================================
// Google Maps Script Loader (reuses same pattern)
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
// Helper: Create car icon SVG with heading rotation
// ============================================================
function createCarIcon(heading = 0) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
      <defs>
        <filter id="carShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
        </filter>
      </defs>
      <g transform="rotate(${heading}, 24, 24)" filter="url(#carShadow)">
        <circle cx="24" cy="24" r="20" fill="#7c3aed"/>
        <path d="M24 8 L16 24 L24 20 L32 24 Z" fill="white" stroke="white" stroke-width="1" stroke-linejoin="round"/>
        <circle cx="24" cy="24" r="3" fill="white" opacity="0.5"/>
      </g>
      <circle cx="24" cy="24" r="22" fill="none" stroke="#7c3aed" stroke-width="2" opacity="0.3">
        <animate attributeName="r" from="18" to="23" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite"/>
      </circle>
    </svg>
  `;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function dedupeDriversByOrderId(driverList = []) {
  const latestByOrderId = new Map();

  driverList.forEach((driver) => {
    const orderId = String(driver.order_id);
    const existing = latestByOrderId.get(orderId);

    if (!existing) {
      latestByOrderId.set(orderId, driver);
      return;
    }

    const currentTime = new Date(driver.created_at || 0).getTime();
    const existingTime = new Date(existing.created_at || 0).getTime();

    if (currentTime >= existingTime) {
      latestByOrderId.set(orderId, driver);
    }
  });

  return Array.from(latestByOrderId.values());
}

// ============================================================
// Helper: Animate marker smoothly
// ============================================================
function animateMarker(marker, newPos, duration = 800) {
  const start = marker.getPosition();
  const startLat = start.lat(), startLng = start.lng();
  const endLat = newPos.lat, endLng = newPos.lng;
  const startTime = Date.now();

  function step() {
    const elapsed = Date.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    marker.setPosition({
      lat: startLat + (endLat - startLat) * eased,
      lng: startLng + (endLng - startLng) * eased
    });
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ============================================================
// LiveTrackingMap — Admin component for real-time driver tracking
// ============================================================
export function LiveTrackingMap() {
  const [drivers, setDrivers] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  const [driverETAs, setDriverETAs] = useState({}); // { orderId: { eta, distance } }
  const [socketConnected, setSocketConnected] = useState(false);
  const { t } = useTranslation();

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});        // { orderId: markerInstance }
  const polylinesRef = useRef({});      // { orderId: { bg, fg } }
  const destMarkersRef = useRef({});    // { orderId: markerInstance }
  const infoWindowRef = useRef(null);
  const previousDriversRef = useRef({}); // { orderId: driverInfo } — for completion detection
  const previousHeadingsRef = useRef({});
  const socketRef = useRef(null);

  // ─── Initialize Socket.io for real-time updates ───
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socket.on('connect', () => {
      console.log('🔌 Admin socket connected');
      socket.emit('admin:subscribe');
      setSocketConnected(true);
    });

    socket.on('tracking:driver_moved', (data) => {
      // Real-time driver position update
      setDrivers(prev => {
        const existing = prev.find(d => String(d.order_id) === String(data.order_id));
        if (existing) {
          return prev.map(d => 
            String(d.order_id) === String(data.order_id) 
              ? { ...d, latitude: data.latitude, longitude: data.longitude, heading: data.heading, speed: data.speed, created_at: new Date().toISOString() }
              : d
          );
        }
        return prev;
      });

      // Update marker position smoothly
      const orderId = String(data.order_id);
      if (markersRef.current[orderId] && mapRef.current) {
        animateMarker(markersRef.current[orderId], { lat: data.latitude, lng: data.longitude });
        
        // Rotate icon
        const heading = data.heading || 0;
        if (Math.abs(heading - (previousHeadingsRef.current[orderId] || 0)) > 5) {
          markersRef.current[orderId].setIcon({
            url: createCarIcon(heading),
            scaledSize: new window.google.maps.Size(48, 48),
            anchor: new window.google.maps.Point(24, 24),
          });
          previousHeadingsRef.current[orderId] = heading;
        }
      }

      setLastUpdated(new Date());
    });

    socket.on('tracking:delivery_completed', (data) => {
      const orderId = String(data.order_id);
      const driver = previousDriversRef.current[orderId];
      if (driver) {
        toast.success(
          `✅ Delivery Completed!\nOrder #${data.order_id} — ${data.driver_name}`,
          { duration: 8000 }
        );
        setCompletedDeliveries(prev => [
          { ...driver, completed_at: new Date().toLocaleTimeString() },
          ...prev.slice(0, 9)
        ]);
      }
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socketRef.current = socket;

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  // ─── Fetch all active driver locations (initial + fallback polling) ───
  const fetchDriverLocations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_driver_location.php`);
      const data = await response.json();
      
      if (data.success) {
        const currentDrivers = dedupeDriversByOrderId(data.drivers || []);
        const currentIds = new Set(currentDrivers.map(d => String(d.order_id)));

        // ─── Detect completed deliveries ───
        const prevDrivers = previousDriversRef.current;
        Object.keys(prevDrivers).forEach(orderId => {
          if (!currentIds.has(orderId)) {
            const completed = prevDrivers[orderId];
            if (!socketConnected) { // Only show if socket didn't already handle it
              toast.success(
                `✅ Delivery Completed!\nOrder #${completed.order_id} — ${completed.driver_name}\nCustomer: ${completed.customer_name || 'N/A'}`,
                { duration: 8000 }
              );
              setCompletedDeliveries(prev => [
                { ...completed, completed_at: new Date().toLocaleTimeString() },
                ...prev.slice(0, 9)
              ]);
            }
          }
        });

        // Update previous drivers ref
        const newPrevDrivers = {};
        currentDrivers.forEach(d => { newPrevDrivers[String(d.order_id)] = d; });
        previousDriversRef.current = newPrevDrivers;

        setDrivers(currentDrivers);
        setLastUpdated(new Date());

        // Update markers on the map
        if (mapRef.current && currentDrivers) {
          updateMapMarkers(currentDrivers);
        }

        // Fetch ETAs for all drivers
        currentDrivers.forEach(driver => {
          if (driver.shipping_address) {
            fetchDriverETA(driver);
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch driver locations:', error);
    } finally {
      setLoading(false);
    }
  }, [socketConnected]);

  // ─── Fetch ETA & Distance for a driver ───
  const fetchDriverETA = useCallback((driver) => {
    if (!window.google || !driver.shipping_address) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: driver.shipping_address }, (results, status) => {
      if (status !== 'OK' || !results[0]) return;

      const destPos = results[0].geometry.location;
      const orderId = String(driver.order_id);

      // Place destination marker if not exists
      if (!destMarkersRef.current[orderId] && mapRef.current) {
        const destIconSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 44" width="36" height="44">
            <path d="M18 2C10 2 4 8 4 16c0 10 14 24 14 24s14-14 14-24c0-8-6-14-14-14z" fill="#ef4444" stroke="#fff" stroke-width="2"/>
            <circle cx="18" cy="16" r="6" fill="white"/>
          </svg>
        `;
        const marker = new window.google.maps.Marker({
          position: { lat: destPos.lat(), lng: destPos.lng() },
          map: mapRef.current,
          title: `Destination: ${driver.shipping_address?.substring(0, 40)}`,
          icon: {
            url: 'data:image/svg+xml,' + encodeURIComponent(destIconSvg),
            scaledSize: new window.google.maps.Size(36, 44),
            anchor: new window.google.maps.Point(18, 44),
          },
          zIndex: 30
        });
        destMarkersRef.current[orderId] = marker;
      }

      // Distance Matrix API
      const service = new window.google.maps.DistanceMatrixService();
      service.getDistanceMatrix(
        {
          origins: [{ lat: parseFloat(driver.latitude), lng: parseFloat(driver.longitude) }],
          destinations: [{ lat: destPos.lat(), lng: destPos.lng() }],
          travelMode: window.google.maps.TravelMode.DRIVING,
          unitSystem: window.google.maps.UnitSystem.METRIC,
        },
        (response, matrixStatus) => {
          if (matrixStatus === 'OK' && response.rows[0]?.elements[0]?.status === 'OK') {
            const element = response.rows[0].elements[0];
            setDriverETAs(prev => ({
              ...prev,
              [orderId]: {
                eta: element.duration.text,
                etaValue: element.duration.value,
                distance: element.distance.text,
                distanceValue: element.distance.value
              }
            }));
          }
        }
      );

      // Draw Directions API route
      drawDirectionsRoute(orderId, 
        { lat: parseFloat(driver.latitude), lng: parseFloat(driver.longitude) },
        { lat: destPos.lat(), lng: destPos.lng() }
      );
    });
  }, []);

  // ─── Draw route using Directions API ───
  const drawDirectionsRoute = useCallback((orderId, origin, destination) => {
    if (!mapRef.current || !window.google) return;

    // Only draw for selected order or if we have few drivers
    const directionsService = new window.google.maps.DirectionsService();
    
    directionsService.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') {
          // Remove old polylines
          if (polylinesRef.current[orderId]) {
            polylinesRef.current[orderId].bg?.setMap(null);
            polylinesRef.current[orderId].fg?.setMap(null);
          }

          const path = result.routes[0].overview_path;

          // Background line
          const bgPolyline = new window.google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#4338ca',
            strokeOpacity: 0.25,
            strokeWeight: 8,
            map: mapRef.current,
          });

          // Foreground blue route line
          const fgPolyline = new window.google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#3b82f6',
            strokeOpacity: 0.85,
            strokeWeight: 4,
            map: mapRef.current,
          });

          polylinesRef.current[orderId] = { bg: bgPolyline, fg: fgPolyline };
        }
      }
    );
  }, []);

  // ─── Fetch detailed trail for a specific order ───
  const fetchOrderTrail = useCallback(async (orderId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_driver_location.php?order_id=${orderId}`);
      const data = await response.json();

      if (data.success) {
        setOrderDetail(data);
      }
    } catch (error) {
      console.error('Failed to fetch order trail:', error);
    }
  }, []);

  // ─── Poll every 8 seconds (main loop) ───
  useEffect(() => {
    fetchDriverLocations();
    const interval = setInterval(fetchDriverLocations, 8000);
    return () => clearInterval(interval);
  }, [fetchDriverLocations]);

  // When a specific order is selected, also poll its trail
  useEffect(() => {
    if (selectedOrder) {
      fetchOrderTrail(selectedOrder);
      const interval = setInterval(() => fetchOrderTrail(selectedOrder), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedOrder, fetchOrderTrail]);

  // ─── Initialize Google Map ───
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setMapReady(false);
      return;
    }

    loadGoogleMapsScript()
      .then(() => {
        if (!mapContainerRef.current) return;

        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: { lat: 31.5204, lng: 74.3587 }, // Lahore center
          zoom: 12,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          gestureHandling: 'greedy',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        mapRef.current = map;
        infoWindowRef.current = new window.google.maps.InfoWindow();
        setMapReady(true);
      })
      .catch((err) => {
        console.error('Google Maps load error:', err);
        toast.error('Failed to load Google Maps');
      });

    return () => {
      // Cleanup markers
      Object.values(markersRef.current).forEach(m => m.setMap(null));
      Object.values(destMarkersRef.current).forEach(m => m.setMap(null));
      Object.entries(polylinesRef.current).forEach(([, p]) => {
        p.bg?.setMap(null);
        p.fg?.setMap(null);
      });
    };
  }, []);

  // ─── Update markers on the map ───
  const updateMapMarkers = useCallback((driverList) => {
    if (!mapRef.current || !window.google) return;

    const activeOrderIds = new Set(driverList.map(d => String(d.order_id)));

    // Remove stale markers
    Object.keys(markersRef.current).forEach(orderId => {
      if (!activeOrderIds.has(orderId)) {
        markersRef.current[orderId].setMap(null);
        delete markersRef.current[orderId];
        // Clean up destination markers and polylines
        if (destMarkersRef.current[orderId]) {
          destMarkersRef.current[orderId].setMap(null);
          delete destMarkersRef.current[orderId];
        }
        if (polylinesRef.current[orderId]) {
          polylinesRef.current[orderId].bg?.setMap(null);
          polylinesRef.current[orderId].fg?.setMap(null);
          delete polylinesRef.current[orderId];
        }
      }
    });

    driverList.forEach(driver => {
      const pos = { lat: parseFloat(driver.latitude), lng: parseFloat(driver.longitude) };
      const orderId = String(driver.order_id);
      const heading = parseFloat(driver.heading || 0);

      if (markersRef.current[orderId]) {
        // Smoothly animate existing marker
        animateMarker(markersRef.current[orderId], pos);
        
        // Update rotation
        if (Math.abs(heading - (previousHeadingsRef.current[orderId] || 0)) > 5) {
          markersRef.current[orderId].setIcon({
            url: createCarIcon(heading),
            scaledSize: new window.google.maps.Size(48, 48),
            anchor: new window.google.maps.Point(24, 24),
          });
          previousHeadingsRef.current[orderId] = heading;
        }
      } else {
        // Create new marker with car icon
        const marker = new window.google.maps.Marker({
          position: pos,
          map: mapRef.current,
          title: `${driver.driver_name} — Order #${driver.order_id}`,
          icon: {
            url: createCarIcon(heading),
            scaledSize: new window.google.maps.Size(48, 48),
            anchor: new window.google.maps.Point(24, 24),
          },
          animation: window.google.maps.Animation.DROP,
          zIndex: 100,
        });

        marker.addListener('click', () => {
          const etaInfo = driverETAs[orderId];
          const content = `
            <div style="padding: 12px; min-width: 250px; font-family: 'Inter', system-ui, sans-serif;">
              <h3 style="margin: 0 0 10px; color: #7c3aed; font-size: 16px; font-weight: 700;">
                🚚 ${driver.driver_name}
              </h3>
              <p style="margin: 4px 0; font-size: 13px; color: #334155;">
                <strong>Order:</strong> #${driver.order_id}
              </p>
              <p style="margin: 4px 0; font-size: 13px; color: #334155;">
                <strong>Customer:</strong> ${driver.customer_name || 'N/A'}
              </p>
              <p style="margin: 4px 0; font-size: 13px; color: #334155;">
                <strong>Destination:</strong> ${driver.shipping_address?.substring(0, 60) || 'N/A'}...
              </p>
              ${etaInfo ? `
                <div style="margin: 10px 0; padding: 8px 12px; background: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;">
                  <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1e40af;">
                    📍 ${etaInfo.distance} — ${etaInfo.eta}
                  </p>
                </div>
              ` : ''}
              <p style="margin: 8px 0 0; font-size: 11px; color: #94a3b8;">
                📍 ${parseFloat(driver.latitude).toFixed(5)}, ${parseFloat(driver.longitude).toFixed(5)}
              </p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #94a3b8;">
                Last update: ${new Date(driver.created_at).toLocaleTimeString()}
              </p>
            </div>
          `;
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(mapRef.current, marker);
          setSelectedOrder(driver.order_id);
        });

        markersRef.current[orderId] = marker;
        previousHeadingsRef.current[orderId] = heading;
      }
    });

    // Auto-zoom to fit all markers
    if (driverList.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      driverList.forEach(d => {
        bounds.extend({ lat: parseFloat(d.latitude), lng: parseFloat(d.longitude) });
      });
      // Only auto-fit if no specific order is selected
      if (!selectedOrder) {
        mapRef.current.fitBounds(bounds, { padding: 60 });
        if (driverList.length === 1) {
          mapRef.current.setZoom(16);
        }
      }
    }
  }, [selectedOrder, driverETAs]);

  // ─── Copy tracking link ───
  const copyTrackingLink = async (orderId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/generate_tracking_link.php?order_id=${orderId}`);
      const data = await response.json();
      if (data.success && data.token) {
        const url = `${window.location.origin}/track/${data.token}`;
        await navigator.clipboard.writeText(url);
        toast.success('Tracking link copied to clipboard!');
      } else {
        toast.error('No tracking link available for this order');
      }
    } catch(e) {
      toast.error('Failed to copy tracking link');
    }
  };

  const timeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Radio className="h-6 w-6 text-red-500 animate-pulse" />
            {t('Live Delivery Tracking')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {drivers.length > 0
              ? `${drivers.length} ${t('active delivery')}${drivers.length > 1 ? 'ies' : 'y'} in progress`
              : t('No active deliveries right now')
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Socket status indicator */}
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
            socketConnected 
              ? 'bg-green-100 text-green-700' 
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            {socketConnected ? 'Real-time' : 'Polling'}
          </span>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {t('Updated')} {timeAgo(lastUpdated)}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchDriverLocations} className="gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
            {t('Refresh')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Map ─── */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            {/* Map Status Bar */}
            <div className="bg-gradient-to-r from-purple-600/10 to-purple-500/5 px-4 py-2.5 flex items-center justify-between border-b">
              <span className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {selectedOrder ? `Order #${selectedOrder} — Live Route` : t('All Active Drivers')}
              </span>
              {selectedOrder && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 gap-1"
                  onClick={() => {
                    setSelectedOrder(null);
                    setOrderDetail(null);
                    // Clear route polylines for selected order
                    Object.entries(polylinesRef.current).forEach(([, p]) => {
                      p.bg?.setMap(null);
                      p.fg?.setMap(null);
                    });
                    polylinesRef.current = {};
                    // Clear destination markers
                    Object.values(destMarkersRef.current).forEach(m => m.setMap(null));
                    destMarkersRef.current = {};
                    // Re-fit all markers
                    if (mapRef.current && drivers.length > 0) {
                      const bounds = new window.google.maps.LatLngBounds();
                      drivers.forEach(d => bounds.extend({ lat: parseFloat(d.latitude), lng: parseFloat(d.longitude) }));
                      mapRef.current.fitBounds(bounds, { padding: 60 });
                    }
                  }}
                >
                  <ChevronLeft className="h-3 w-3" />
                  {t('Show All')}
                </Button>
              )}
            </div>

            {GOOGLE_MAPS_API_KEY ? (
              <div
                ref={mapContainerRef}
                style={{ height: '500px', width: '100%' }}
                className="w-full"
              />
            ) : (
              <div className="h-[500px] flex items-center justify-center bg-muted/30">
                <div className="text-center space-y-2">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    {t('Google Maps API key required for live tracking map.')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('Set VITE_GOOGLE_MAPS_API_KEY in your .env.local file.')}
                  </p>
                </div>
              </div>
            )}

            {/* No drivers overlay */}
            {mapReady && drivers.length === 0 && !loading && (
              <div className="bg-amber-50 border-t border-amber-100 px-4 py-3 flex items-center gap-2">
                <Truck className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-800">
                  {t('No drivers currently on delivery. Markers will appear when a driver starts a delivery.')}
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* ─── Driver List Sidebar ─── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Truck className="h-4 w-4" />
            {t('Active Drivers')} ({drivers.length})
          </h3>

          {loading ? (
            <Card className="p-8 text-center">
              <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-3">{t('Loading...')}</p>
            </Card>
          ) : drivers.length === 0 ? (
            <Card className="p-8 text-center">
              <Truck className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">{t('No active deliveries')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('Drivers will show here when they click "Start Delivery"')}
              </p>
            </Card>
          ) : (
            drivers.map(driver => {
              const orderId = String(driver.order_id);
              const etaInfo = driverETAs[orderId];
              
              return (
                <Card
                  key={driver.order_id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedOrder == driver.order_id
                      ? 'ring-2 ring-purple-500 bg-purple-50/50'
                      : 'hover:bg-secondary/50'
                  }`}
                  onClick={() => setSelectedOrder(driver.order_id)}
                >
                  <div className="space-y-2">
                    {/* Driver header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-lg">
                          🚚
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{driver.driver_name}</p>
                          <p className="text-xs text-muted-foreground">Order #{driver.order_id}</p>
                        </div>
                      </div>
                      <Badge className="bg-red-500 text-white text-[10px] gap-1 animate-pulse">
                        <Radio className="h-2.5 w-2.5" />
                        LIVE
                      </Badge>
                    </div>

                    {/* ETA & Distance Banner */}
                    {etaInfo && (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex items-center gap-2">
                        <Timer className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-bold text-blue-800">
                          {etaInfo.distance} — {etaInfo.eta}
                        </span>
                      </div>
                    )}

                    {/* Customer info */}
                    <div className="bg-background rounded px-3 py-2 border text-xs space-y-1">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-red-400" />
                        <span className="truncate">{driver.shipping_address?.substring(0, 50) || 'N/A'}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-blue-400" />
                        {driver.customer_phone || 'N/A'}
                      </p>
                    </div>

                    {/* Last updated */}
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t('Last ping')}: {new Date(driver.created_at).toLocaleTimeString()}
                    </p>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-7 gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(driver.order_id);
                          // Draw route for this specific order
                          if (driver.shipping_address) {
                            fetchDriverETA(driver);
                          }
                        }}
                      >
                        <Route className="h-3 w-3" />
                        {t('Route')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-7 gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyTrackingLink(driver.order_id);
                        }}
                      >
                        <Link2 className="h-3 w-3" />
                        {t('Copy Link')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://www.google.com/maps?q=${driver.latitude},${driver.longitude}`, '_blank');
                        }}
                      >
                        <Navigation className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}

          {/* Selected Order Detail */}
          {selectedOrder && orderDetail && orderDetail.location && (
            <Card className="p-4 bg-purple-50/30 border-purple-200">
              <h4 className="text-sm font-semibold text-purple-800 mb-2">
                📋 {t('Delivery Details')} — #{selectedOrder}
              </h4>
              <div className="text-xs space-y-1.5 text-foreground">
                <p><strong>{t('Driver')}:</strong> {orderDetail.location.driver_name}</p>
                <p><strong>{t('Customer')}:</strong> {orderDetail.location.customer_name}</p>
                <p><strong>{t('Phone')}:</strong> {orderDetail.location.customer_phone}</p>
                <p><strong>{t('Destination')}:</strong> {orderDetail.location.shipping_address}</p>
                <p><strong>{t('Amount')}:</strong> Rs. {parseFloat(orderDetail.location.total_amount || 0).toLocaleString()}</p>
                
                {/* ETA Info */}
                {driverETAs[String(selectedOrder)] && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                    <p className="font-bold text-blue-800 text-sm">
                      📍 {driverETAs[String(selectedOrder)].distance} — {driverETAs[String(selectedOrder)].eta}
                    </p>
                    <p className="text-blue-600 text-xs mt-1">
                      Driver is {driverETAs[String(selectedOrder)].distance} away, arriving in {driverETAs[String(selectedOrder)].eta}
                    </p>
                  </div>
                )}
                
                <p className="text-purple-600 font-mono">
                  📍 {parseFloat(orderDetail.location.latitude).toFixed(6)}, {parseFloat(orderDetail.location.longitude).toFixed(6)}
                </p>
                {orderDetail.trail && (
                  <p className="text-muted-foreground">
                    🗺️ {orderDetail.trail.length} {t('GPS points recorded')}
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* ─── Recently Completed Deliveries ─── */}
          {completedDeliveries.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                {t('Recently Completed')}
              </h3>
              {completedDeliveries.map((d, i) => (
                <Card key={`completed-${d.order_id}-${i}`} className="p-3 mb-2 bg-green-50/50 border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-sm">✅</div>
                      <div>
                        <p className="text-xs font-semibold">{d.driver_name}</p>
                        <p className="text-[10px] text-muted-foreground">Order #{d.order_id} • {d.customer_name || 'N/A'}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-green-300 text-green-700 bg-green-50">
                      {d.completed_at}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LiveTrackingMap;
