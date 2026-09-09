import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio, MapPin, Truck, Phone, Navigation, Clock, RefreshCw, ChevronLeft,
  CheckCircle2, Route, Timer, Link2, AlertTriangle, Zap, Target, Bell,
  Play, Pause, RotateCcw, SkipForward, Shield, Plus, Trash2, ArrowRight,
  X, ChevronDown, ChevronUp, History, Layers
} from 'lucide-react';
import { Button } from '../../components/common/button';
import { Card } from '../../components/common/card';
import { Badge } from '../../components/common/badge';
import { toast } from 'sonner';
import { API_BASE_URL, GOOGLE_MAPS_API_KEY, SOCKET_URL } from '../../config';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';

// Google Maps Loader
let googleMapsLoadPromise = null;
function loadGoogleMapsScript() {
  if (googleMapsLoadPromise) return googleMapsLoadPromise;
  if (window.google?.maps?.Map) return Promise.resolve();
  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const cb = '__gmapsAdmin_' + Date.now();
    window[cb] = () => { delete window[cb]; resolve(); };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry,marker&loading=async&callback=${cb}`;
    s.async = true; s.defer = true;
    s.onerror = () => { delete window[cb]; reject(new Error('Maps load failed')); };
    document.head.appendChild(s);
  });
  return googleMapsLoadPromise;
}

// Colors
const ROUTE_COLORS = [
  { main: '#2563eb', glow: '#1e40af' },
  { main: '#16a34a', glow: '#14532d' },
  { main: '#9333ea', glow: '#6b21a8' },
  { main: '#ea580c', glow: '#9a3412' },
  { main: '#0891b2', glow: '#164e63' },
];
const colorCache = {};
let colorIdx = 0;
function getDriverColor(orderId) {
  if (!colorCache[orderId]) { colorCache[orderId] = ROUTE_COLORS[colorIdx % ROUTE_COLORS.length]; colorIdx++; }
  return colorCache[orderId];
}

// SVG Icons
function createCarIcon(heading = 0, speed = 0, color = '#7c3aed') {
  const moving = speed > 0.5;
  return 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56" width="56" height="56">
      <defs>
        <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.4"/></filter>
        <radialGradient id="g" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stop-color="${color}dd"/><stop offset="100%" stop-color="${color}"/>
        </radialGradient>
      </defs>
      <circle cx="28" cy="28" r="26" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.2">
        <animate attributeName="r" from="20" to="27" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.5" to="0" dur="1.8s" repeatCount="indefinite"/>
      </circle>
      <g transform="rotate(${heading},28,28)" filter="url(#s)">
        <ellipse cx="28" cy="30" rx="16" ry="5" fill="#000" opacity="0.15"/>
        <circle cx="28" cy="28" r="18" fill="url(#g)"/>
        <circle cx="28" cy="28" r="18" fill="none" stroke="white" stroke-width="2"/>
        <polygon points="28,10 21,26 28,22 35,26" fill="white" opacity="0.95"/>
        <circle cx="28" cy="28" r="3" fill="white" opacity="${moving ? 1 : 0.4}"/>
      </g>
    </svg>`);
}

function createDestIcon(color = '#ef4444', label = '') {
  return 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 58" width="44" height="58">
      <defs><filter id="ds"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/></filter></defs>
      <g filter="url(#ds)">
        <path d="M22 2C12 2 4 10 4 20c0 13 18 34 18 34s18-21 18-34c0-10-8-18-18-18z" fill="${color}"/>
        <circle cx="22" cy="20" r="9" fill="white"/>
        ${label ? `<text x="22" y="24" text-anchor="middle" font-size="10" font-weight="bold" fill="${color}">${label}</text>`
                : `<circle cx="22" cy="20" r="4" fill="${color}"/>`}
      </g>
    </svg>`);
}

// Helpers
function animateMarker(marker, pos, dur = 800) {
  if (!marker || !pos) return;
  const s = marker.position || (typeof marker.getPosition === 'function' ? marker.getPosition() : pos);
  const sLat = typeof s?.lat === 'function' ? s.lat() : (s?.lat ?? pos.lat);
  const sLng = typeof s?.lng === 'function' ? s.lng() : (s?.lng ?? pos.lng);
  const t0 = Date.now();
  const step = () => {
    const t = Math.min((Date.now() - t0) / dur, 1);
    const e = 1 - Math.pow(1 - t, 3);
    const nextLat = sLat + (pos.lat - sLat) * e;
    const nextLng = sLng + (pos.lng - sLng) * e;
    if (typeof marker.setPosition === 'function') {
      marker.setPosition({ lat: nextLat, lng: nextLng });
    } else {
      marker.position = { lat: nextLat, lng: nextLng };
    }
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function dedupeDrivers(list = []) {
  const m = new Map();
  list.forEach(d => {
    const id = String(d.order_id);
    const ex = m.get(id);
    if (!ex || new Date(d.created_at || 0) >= new Date(ex.created_at || 0)) m.set(id, d);
  });
  return Array.from(m.values());
}

function formatArrivalTime(etaSeconds) {
  if (!etaSeconds) return null;
  return new Date(Date.now() + etaSeconds * 1000).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatSpeed(s) { return s > 0.5 ? `${(s * 3.6).toFixed(0)} km/h` : null; }

function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((new Date() - d) / 1000);
  if (s < 10) return 'just now'; if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`; return `${Math.floor(s / 3600)}h ago`;
}

function fmtCountdown(s) {
  if (!s || s <= 0) return '0:00';
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Notification types
const NOTIF_TYPES = {
  STOPPED:   { icon: '🛑', color: 'bg-red-100 text-red-800',    label: 'Driver Stopped'    },
  OFF_ROUTE: { icon: '🗺️', color: 'bg-orange-100 text-orange-800', label: 'Off Route'      },
  LATE:      { icon: '⏰', color: 'bg-yellow-100 text-yellow-800', label: 'ETA Exceeded'   },
  SIGNAL:    { icon: '📵', color: 'bg-gray-100 text-gray-700',   label: 'Signal Lost'       },
  GEOFENCE:  { icon: '🛡️', color: 'bg-purple-100 text-purple-800', label: 'Geofence Alert' },
  ARRIVED:   { icon: '🎉', color: 'bg-green-100 text-green-800',  label: 'Near Destination' },
};

// 
//  MAIN COMPONENT
// 
export function LiveTrackingMap() {
  const [activeTab, setActiveTab] = useState('live');
  const { t } = useTranslation();

  // Live tab state
  const [drivers, setDrivers] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  const [driverETAs, setDriverETAs] = useState({});
  const [routeProgress, setRouteProgress] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [nearDestination, setNearDestination] = useState({});
  const [liveCountdown, setLiveCountdown] = useState({});

  // Smart Notifications
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifTimestampsRef = useRef({}); // prevent duplicate notifs
  const prevPositionsRef = useRef({});   // for stopped detection

  // Geofence state
  const [geofenceRadius, setGeofenceRadius] = useState(5000); // 5km default (city delivery range)
  const [geofenceEnabled, setGeofenceEnabled] = useState(true);
  const [shopCoords, setShopCoords] = useState(null);
  const [storeAddress, setStoreAddress] = useState('');
  const geofenceCircleRef = useRef(null);
  const geofenceMapRef = useRef(null);
  const geofenceMapContainerRef = useRef(null);

  // Replay state
  const [replayOrderId, setReplayOrderId] = useState('');
  const [replayTrail, setReplayTrail] = useState([]);
  const [replayIdx, setReplayIdx] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(2);
  const [replayLoading, setReplayLoading] = useState(false);
  const replayMapContainerRef = useRef(null);
  const replayMapRef = useRef(null);
  const replayMarkerRef = useRef(null);
  const replayRouteRef = useRef(null);
  const replayIntervalRef = useRef(null);
  const replayHeadingRef = useRef(0);

  // Route Planner state
  const [plannerOrders, setPlannerOrders] = useState([]);
  const [plannerSelected, setPlannerSelected] = useState([]);
  const [plannerResult, setPlannerResult] = useState(null);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerMapReady, setPlannerMapReady] = useState(false);
  // Route Optimization
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedResult, setOptimizedResult] = useState(null);
  const plannerMapContainerRef = useRef(null);
  const plannerMapRef = useRef(null);
  const plannerMarkersRef = useRef([]);
  const plannerRouteRef = useRef(null);

  // Main map refs
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const polylinesRef = useRef({});
  const destMarkersRef = useRef({});
  const routePathRef = useRef({});
  const destCoordsRef = useRef({});
  const routeDrawnRef = useRef(new Set());
  const routeLastDrawRef = useRef({});
  const infoWindowRef = useRef(null);
  const trailPolylineRef = useRef(null);
  const previousDriversRef = useRef({});
  const previousHeadingsRef = useRef({});
  const socketRef = useRef(null);
  const autoFollowRef = useRef(false);

  // 
  //  SMART NOTIFICATIONS
  // 
  const addNotification = useCallback((type, orderId, driverName, extra = '') => {
    const key = `${type}-${orderId}`;
    const now = Date.now();
    if (notifTimestampsRef.current[key] && now - notifTimestampsRef.current[key] < 5 * 60 * 1000) return;
    notifTimestampsRef.current[key] = now;
    const notif = { id: now, type, orderId, driverName, extra, time: new Date().toLocaleTimeString(), read: false };
    setNotifications(prev => [notif, ...prev.slice(0, 49)]);
    setUnreadCount(c => c + 1);
    toast(
      `${NOTIF_TYPES[type].icon} ${NOTIF_TYPES[type].label}: ${driverName} (Order #${orderId}) ${extra}`,
      { duration: 6000, style: { background: '#1e293b', color: 'white' } }
    );
  }, []);

  // Monitor drivers every 15s for smart alerts
  useEffect(() => {
    if (drivers.length === 0) return;
    const check = () => {
      const now = Date.now();
      drivers.forEach(driver => {
        const orderId = String(driver.order_id);
        const lastPing = new Date(driver.created_at || 0).getTime();
        const pos = { lat: parseFloat(driver.latitude), lng: parseFloat(driver.longitude) };

        // Signal lost (no ping > 3 min)
        if (now - lastPing > 3 * 60 * 1000) {
          addNotification('SIGNAL', orderId, driver.driver_name);
        }

        // Driver stopped (same position for 5+ min)
        const prev = prevPositionsRef.current[orderId];
        if (prev) {
          const dist = Math.hypot(pos.lat - prev.lat, pos.lng - prev.lng);
          if (dist < 0.0001 && now - prev.time > 5 * 60 * 1000) {
            addNotification('STOPPED', orderId, driver.driver_name, '(5+ min without movement)');
          }
        }
        prevPositionsRef.current[orderId] = { ...pos, time: now };

        // ETA overdue
        const countdown = liveCountdown[orderId];
        if (countdown !== undefined && countdown <= 0 && driverETAs[orderId]) {
          addNotification('LATE', orderId, driver.driver_name, '- ETA has passed');
        }

        // Near destination
        if (nearDestination[orderId]) {
          addNotification('ARRIVED', orderId, driver.driver_name, 'is < 300m away!');
        }

        // Geofence check
        if (geofenceEnabled && shopCoords && window.google) {
          const shopLatLng = new window.google.maps.LatLng(shopCoords.lat, shopCoords.lng);
          const driverLatLng = new window.google.maps.LatLng(pos.lat, pos.lng);
          const dist = window.google.maps.geometry.spherical.computeDistanceBetween(shopLatLng, driverLatLng);
          if (dist > geofenceRadius) {
            addNotification('GEOFENCE', orderId, driver.driver_name, `(${(dist / 1000).toFixed(1)}km from shop)`);
          }
        }
      });
    };
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [drivers, liveCountdown, driverETAs, nearDestination, geofenceEnabled, shopCoords, geofenceRadius, addNotification]);

  // Countdown ticker
  useEffect(() => {
    const tick = setInterval(() => setLiveCountdown(p => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Math.max(0, v - 1)]))), 1000);
    return () => clearInterval(tick);
  }, []);

  // Fetch store settings (for geofence center)
  useEffect(() => {
    fetch(`${API_BASE_URL}/admin/get_store_settings.php`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.settings?.address) {
          setStoreAddress(data.settings.address);
        }
      }).catch(() => {});
  }, []);

  // Geocode store address for geofence
  useEffect(() => {
    if (!storeAddress || !window.google?.maps?.Geocoder) return;
    new window.google.maps.Geocoder().geocode({ address: storeAddress }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        setShopCoords({ lat: loc.lat(), lng: loc.lng() });
      }
    });
  }, [storeAddress, mapReady]);

  // 
  //  SOCKET.IO
  // 
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 2000 });
    socket.on('connect', () => { socket.emit('admin:subscribe'); setSocketConnected(true); });
    socket.on('tracking:driver_moved', (data) => {
      const orderId = String(data.order_id);
      setDrivers(prev => {
        const exists = prev.find(d => String(d.order_id) === orderId);
        if (exists) return prev.map(d => String(d.order_id) === orderId ? { ...d, latitude: data.latitude, longitude: data.longitude, heading: data.heading, speed: data.speed, created_at: new Date().toISOString() } : d);
        return [...prev, { order_id: data.order_id, latitude: data.latitude, longitude: data.longitude, heading: data.heading, speed: data.speed, driver_name: data.driver_name, created_at: new Date().toISOString() }];
      });
      if (markersRef.current[orderId] && mapRef.current) {
        const pos = { lat: data.latitude, lng: data.longitude };
        animateMarker(markersRef.current[orderId], pos);
        const h = data.heading || 0;
        if (Math.abs(h - (previousHeadingsRef.current[orderId] || 0)) > 3) {
          const color = getDriverColor(orderId).main;
          const img = markersRef.current[orderId].content.querySelector('img');
          if (img) img.src = createCarIcon(h, data.speed || 0, color);
          previousHeadingsRef.current[orderId] = h;
        }
        const now = Date.now();
        if (now - (routeLastDrawRef.current[orderId] || 0) > 12000 && routePathRef.current[orderId]) {
          routeLastDrawRef.current[orderId] = now;
          updateRemainingRoute(orderId, pos);
        }
        if (autoFollowRef.current && String(selectedOrder) === orderId) mapRef.current.panTo(pos);
      }
      setLastUpdated(new Date());
    });
    socket.on('admin:active_drivers', (data) => {
      if (data?.drivers) setDrivers(prev => { const m = new Map(prev.map(d => [String(d.order_id), d])); data.drivers.forEach(d => m.set(String(d.order_id), { ...m.get(String(d.order_id)), ...d })); return Array.from(m.values()); });
    });
    socket.on('tracking:delivery_completed', (data) => {
      const orderId = String(data.order_id);
      const driver = previousDriversRef.current[orderId];
      if (driver) { toast.success(`✅ Delivered! Order #${data.order_id} — ${data.driver_name}`, { duration: 8000 }); setCompletedDeliveries(prev => [{ ...driver, completed_at: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]); }
    });
    socket.on('disconnect', () => setSocketConnected(false));
    socketRef.current = socket;
    return () => { if (socket) socket.disconnect(); };
  }, []);

  // 
  //  ROUTE LOGIC (updateRemainingRoute, drawDirectionsRoute)
  // 
  const updateRemainingRoute = useCallback((orderId, driverPos) => {
    if (!mapRef.current || !window.google) return;
    const fullPath = routePathRef.current[orderId];
    const lines = polylinesRef.current[orderId];
    if (!fullPath || !lines || fullPath.length === 0) return;
    const dLL = new window.google.maps.LatLng(driverPos.lat, driverPos.lng);
    let ci = 0, minD = Infinity;
    fullPath.forEach((pt, i) => { const d = window.google.maps.geometry.spherical.computeDistanceBetween(dLL, pt); if (d < minD) { minD = d; ci = i; } });
    if (minD > 80) {
      const dest = destCoordsRef.current[orderId];
      if (dest) {
        const now = Date.now();
        if (now - (routeLastDrawRef.current[orderId] || 0) > 45000) {
          routeDrawnRef.current.delete(orderId);
          drawDirectionsRoute(orderId, driverPos, dest);
        }
        return;
      }
    }
    lines.completed?.setPath(fullPath.slice(0, ci + 1));
    lines.remaining?.setPath(fullPath.slice(ci));
    lines.border?.setPath(fullPath.slice(ci));
    const pct = Math.round((ci / fullPath.length) * 100);
    setRouteProgress(prev => ({ ...prev, [orderId]: { pct } }));
    const distToDest = window.google.maps.geometry.spherical.computeDistanceBetween(dLL, fullPath[fullPath.length - 1]);
    setNearDestination(prev => ({ ...prev, [orderId]: distToDest < 300 }));
  }, []);

  const drawDirectionsRoute = useCallback(async (orderId, origin, destination) => {
    if (!mapRef.current || !window.google) return;
    const color = getDriverColor(orderId);

    const applyPolylines = (fullPath) => {
      polylinesRef.current[orderId]?.border?.setMap(null);
      polylinesRef.current[orderId]?.remaining?.setMap(null);
      polylinesRef.current[orderId]?.completed?.setMap(null);
      routePathRef.current[orderId] = fullPath;
      routeLastDrawRef.current[orderId] = Date.now();
      const border    = new window.google.maps.Polyline({ path: fullPath, geodesic: true, strokeColor: color.glow, strokeOpacity: 0.18, strokeWeight: 14, map: mapRef.current, zIndex: 1 });
      const remaining = new window.google.maps.Polyline({ path: fullPath, geodesic: true, strokeColor: color.main, strokeOpacity: 0.95, strokeWeight: 6, map: mapRef.current, zIndex: 2 });
      const completed = new window.google.maps.Polyline({ path: [], geodesic: true, strokeColor: '#94a3b8', strokeOpacity: 0.5, strokeWeight: 4, map: mapRef.current, zIndex: 1 });
      polylinesRef.current[orderId] = { border, remaining, completed };
      routeDrawnRef.current.add(orderId);
    };

    const fallbackStraightLine = () => {
      const oLat = typeof origin.lat === 'function' ? origin.lat() : origin.lat;
      const oLng = typeof origin.lng === 'function' ? origin.lng() : origin.lng;
      const dLat = typeof destination.lat === 'function' ? destination.lat() : destination.lat;
      const dLng = typeof destination.lng === 'function' ? destination.lng() : destination.lng;
      applyPolylines([{ lat: oLat, lng: oLng }, { lat: dLat, lng: dLng }]);
    };

    // Try to get route path from server API
    try {
      const oLat = typeof origin.lat === 'function' ? origin.lat() : origin.lat;
      const oLng = typeof origin.lng === 'function' ? origin.lng() : origin.lng;
      const dLat = typeof destination.lat === 'function' ? destination.lat() : destination.lat;
      const dLng = typeof destination.lng === 'function' ? destination.lng() : destination.lng;

      const body = JSON.stringify({
        origin:      { location: { latLng: { latitude: oLat, longitude: oLng } } },
        destination: { location: { latLng: { latitude: dLat, longitude: dLng } } },
        travelMode:  'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: false,
      });
      const res = await fetch(
        `https://routes.googleapis.com/directions/v2:computeRoutes?key=${GOOGLE_MAPS_API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-FieldMask': 'routes.polyline.encodedPolyline,routes.duration,routes.distanceMeters' }, body }
      );
      if (res.ok) {
        const data = await res.json();
        const encoded = data.routes?.[0]?.polyline?.encodedPolyline;
        if (encoded) {
          const path = window.google.maps.geometry.encoding.decodePath(encoded);
          applyPolylines(path);
          // Save distance and time values
          const durSec = data.routes[0].duration ? parseInt(data.routes[0].duration.replace('s',''),10) : null;
          const distM  = data.routes[0].distanceMeters || null;
          if (durSec || distM) {
            setDriverETAs(prev => ({
              ...prev,
              [orderId]: {
                ...(prev[orderId] || {}),
                ...(durSec ? { eta: `${Math.round(durSec/60)} mins`, etaValue: durSec, arrivalTime: formatArrivalTime(durSec) } : {}),
                ...(distM  ? { distance: `${(distM/1000).toFixed(1)} km` } : {}),
              }
            }));
            if (durSec) setLiveCountdown(prev => ({ ...prev, [orderId]: durSec }));
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Routes API failed, fallback to DirectionsService:', e);
    }

    // Use fallback if server API fails
    try {
      new window.google.maps.DirectionsService().route(
        { origin, destination, travelMode: window.google.maps.TravelMode.DRIVING, provideRouteAlternatives: false },
        (result, status) => {
          if (status === 'OK' && result?.routes?.[0]?.legs) {
            const fullPath = [];
            result.routes[0].legs.forEach(leg => leg.steps.forEach(step => step.path.forEach(pt => fullPath.push(pt))));
            applyPolylines(fullPath);
          } else {
            fallbackStraightLine();
          }
        }
      );
    } catch (err) {
      fallbackStraightLine();
    }
  }, []);

  // 
  //  DRIVER DATA FETCHING
  // 
  const fetchDriverETA = useCallback((driver) => {
    if (!window.google || !driver.shipping_address) return;
    const orderId = String(driver.order_id);
    const driverPos = { lat: parseFloat(driver.latitude), lng: parseFloat(driver.longitude) };
    if (routeDrawnRef.current.has(orderId)) {
      const now = Date.now();
      if (now - (routeLastDrawRef.current[orderId] || 0) > 15000 && routePathRef.current[orderId]) {
        routeLastDrawRef.current[orderId] = now;
        updateRemainingRoute(orderId, driverPos);
      }
      return;
    }
    const getDestCoords = () => new Promise((resolve) => {
      const gpsMatch = String(driver.shipping_address || '').match(/\[?GPS:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)\]?/i) || String(driver.shipping_address || '').match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/i);
      if (gpsMatch) {
        return resolve({ lat: parseFloat(gpsMatch[1]), lng: parseFloat(gpsMatch[2]) });
      }
      new window.google.maps.Geocoder().geocode({ address: driver.shipping_address }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng() });
        } else resolve(null);
      });
    });

    getDestCoords().then((dest) => {
      if (!dest) return;
      destCoordsRef.current[orderId] = dest;
      if (!destMarkersRef.current[orderId] && mapRef.current) {
        const color = getDriverColor(orderId).main;
        const destIconUrl = createDestIcon(color);
        let destMarker = null;
        if (window.google?.maps?.marker?.AdvancedMarkerElement) {
          try {
            const element = document.createElement('div');
            element.innerHTML = `<img src="${destIconUrl}" style="width: 40px; height: 52px; pointer-events: none;" />`;
            destMarker = new window.google.maps.marker.AdvancedMarkerElement({
              position: dest,
              map: mapRef.current,
              content: element,
              zIndex: 30,
            });
          } catch (e) {}
        }
        if (!destMarker && window.google?.maps?.Marker) {
          destMarker = new window.google.maps.Marker({
            position: dest,
            map: mapRef.current,
            icon: {
              url: destIconUrl,
              scaledSize: new window.google.maps.Size(40, 52),
              anchor: new window.google.maps.Point(20, 52)
            },
            zIndex: 30,
          });
        }
        if (destMarker) {
          destMarkersRef.current[orderId] = destMarker;
        }
      }
      // Routes API RouteMatrix (replaces deprecated DistanceMatrixService)
      fetch(
        `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix?key=${GOOGLE_MAPS_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status',
          },
          body: JSON.stringify({
            origins: [{ waypoint: { location: { latLng: { latitude: driverPos.lat, longitude: driverPos.lng } } } }],
            destinations: [{ waypoint: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } } }],
            travelMode: 'DRIVE',
          }),
        }
      ).then(r => r.json()).then(data => {
        const el = Array.isArray(data) ? data[0] : null;
        if (el && el.distanceMeters) {
          const durSec = el.duration ? parseInt(el.duration.replace('s', ''), 10) : 0;
          const distText = `${(el.distanceMeters / 1000).toFixed(1)} km`;
          const mins = Math.round(durSec / 60);
          setDriverETAs(prev => ({ ...prev, [orderId]: { eta: `${mins} mins`, etaValue: durSec, distance: distText, arrivalTime: formatArrivalTime(durSec) } }));
          setLiveCountdown(prev => ({ ...prev, [orderId]: durSec }));
        }
      }).catch(e => console.warn('RouteMatrix admin failed:', e));
      drawDirectionsRoute(orderId, driverPos, dest);
    });
  }, [updateRemainingRoute, drawDirectionsRoute]);


  const fetchDriverLocations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/get_driver_location.php`);
      const data = await res.json();
      if (!data.success) return;
      const current = dedupeDrivers(data.drivers || []);
      const currentIds = new Set(current.map(d => String(d.order_id)));
      const prev = previousDriversRef.current;
      Object.keys(prev).forEach(id => {
        if (!currentIds.has(id) && !socketConnected) {
          toast.success(`✅ Order #${prev[id].order_id} delivered by ${prev[id].driver_name}`, { duration: 8000 });
          setCompletedDeliveries(p => [{ ...prev[id], completed_at: new Date().toLocaleTimeString() }, ...p.slice(0, 9)]);
        }
      });
      previousDriversRef.current = Object.fromEntries(current.map(d => [String(d.order_id), d]));
      setDrivers(current);
      setLastUpdated(new Date());
      if (mapRef.current && current.length > 0) updateMapMarkers(current);
      current.forEach(d => { if (d.shipping_address) fetchDriverETA(d); });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [socketConnected, fetchDriverETA]);

  const updateMapMarkers = useCallback((driverList) => {
    if (!mapRef.current || !window.google) return;
    const activeIds = new Set(driverList.map(d => String(d.order_id)));
    Object.keys(markersRef.current).forEach(id => {
      if (!activeIds.has(id)) {
        if (markersRef.current[id]) markersRef.current[id].map = null;
        delete markersRef.current[id];
        delete routePathRef.current[id]; delete routeLastDrawRef.current[id];
        routeDrawnRef.current.delete(id);
        if (destMarkersRef.current[id]) destMarkersRef.current[id].map = null;
        delete destMarkersRef.current[id];
        polylinesRef.current[id]?.border?.setMap(null); polylinesRef.current[id]?.remaining?.setMap(null); polylinesRef.current[id]?.completed?.setMap(null); delete polylinesRef.current[id];
      }
    });
    driverList.forEach(driver => {
      const orderId = String(driver.order_id);
      const pos = { lat: parseFloat(driver.latitude), lng: parseFloat(driver.longitude) };
      const h = parseFloat(driver.heading || 0), spd = parseFloat(driver.speed || 0);
      const color = getDriverColor(orderId).main;
      if (markersRef.current[orderId]) {
        animateMarker(markersRef.current[orderId], pos);
        if (Math.abs(h - (previousHeadingsRef.current[orderId] || 0)) > 3) {
          const img = markersRef.current[orderId].content?.querySelector ? markersRef.current[orderId].content.querySelector('img') : null;
          if (img) img.src = createCarIcon(h, spd, color);
          previousHeadingsRef.current[orderId] = h;
        }
      } else {
        const carIconUrl = createCarIcon(h, spd, color);
        let marker = null;
        if (window.google?.maps?.marker?.AdvancedMarkerElement) {
          try {
            const element = document.createElement('div');
            element.innerHTML = `<img src="${carIconUrl}" style="width: 56px; height: 56px; pointer-events: none;" />`;
            marker = new window.google.maps.marker.AdvancedMarkerElement({
              position: pos,
              map: mapRef.current,
              title: `${driver.driver_name} — #${driver.order_id}`,
              content: element,
              zIndex: 100,
            });
          } catch (e) {
            console.warn('AdvancedMarkerElement error, fallback to Marker:', e);
          }
        }
        if (!marker && window.google?.maps?.Marker) {
          marker = new window.google.maps.Marker({
            position: pos,
            map: mapRef.current,
            title: `${driver.driver_name} — #${driver.order_id}`,
            icon: {
              url: carIconUrl,
              scaledSize: new window.google.maps.Size(56, 56),
              anchor: new window.google.maps.Point(28, 28)
            },
            zIndex: 100,
          });
        }
        if (marker) {
          const clickHandler = () => {
            setSelectedOrder(driver.order_id);
            autoFollowRef.current = true;
            const ei = driverETAs[orderId];
            infoWindowRef.current?.setContent(`<div style="padding:12px;min-width:220px;font-family:Inter,sans-serif"><p style="margin:0 0 6px;font-weight:800;color:${color}">🚚 ${driver.driver_name}</p><p style="font-size:12px;margin:3px 0">Order #${driver.order_id}</p>${ei ? `<div style="margin-top:8px;padding:8px;background:#eff6ff;border-radius:8px"><p style="margin:0;font-weight:700;color:#1e40af">📍 ${ei.distance} — ${ei.eta}</p>${ei.arrivalTime ? `<p style="margin:4px 0 0;font-size:11px;color:#3b82f6">Arrives ${ei.arrivalTime}</p>` : ''}</div>` : ''}</div>`);
            infoWindowRef.current?.open({ anchor: marker, map: mapRef.current });
          };
          marker.addListener('click', clickHandler);
          if (marker.addListener) marker.addListener('gmp-click', clickHandler);
          markersRef.current[orderId] = marker;
          previousHeadingsRef.current[orderId] = h;
        }
      }
    });
    if (!selectedOrder && driverList.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      driverList.forEach(d => bounds.extend({ lat: parseFloat(d.latitude), lng: parseFloat(d.longitude) }));
      mapRef.current.fitBounds(bounds, { padding: 80 });
      if (driverList.length === 1) mapRef.current.setZoom(16);
    }
  }, [selectedOrder, driverETAs]);

  const fetchOrderTrail = useCallback(async (orderId) => {
    try { const res = await fetch(`${API_BASE_URL}/get_driver_location.php?order_id=${orderId}`); const data = await res.json(); if (data.success) setOrderDetail(data); } catch {}
  }, []);

  useEffect(() => { fetchDriverLocations(); const i = setInterval(() => { if (!document.hidden) fetchDriverLocations(); }, 20000); return () => clearInterval(i); }, [fetchDriverLocations]);
  useEffect(() => { if (!selectedOrder) return; fetchOrderTrail(selectedOrder); const i = setInterval(() => { if (!document.hidden) fetchOrderTrail(selectedOrder); }, 15000); return () => clearInterval(i); }, [selectedOrder, fetchOrderTrail]);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;
    if (orderDetail?.trail?.length > 1) {
      trailPolylineRef.current?.setMap(null);
      const path = orderDetail.trail.map(p => ({ lat: parseFloat(p.latitude), lng: parseFloat(p.longitude) }));
      trailPolylineRef.current = new window.google.maps.Polyline({ path, geodesic: true, strokeColor: '#64748b', strokeOpacity: 0.6, strokeWeight: 5, map: mapRef.current, zIndex: 3 });
    } else if (!orderDetail) { trailPolylineRef.current?.setMap(null); trailPolylineRef.current = null; }
  }, [orderDetail]);

  // 
  //  INITIALIZE MAIN MAP
  // 
  const MAP_STYLES = [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e8e8e8' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f8f9fa' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9dff0' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  ];

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;
    loadGoogleMapsScript().then(() => {
      if (!mapContainerRef.current) return;
      const map = new window.google.maps.Map(mapContainerRef.current, { center: { lat: 31.5204, lng: 74.3587 }, zoom: 13, mapTypeControl: false, streetViewControl: false, fullscreenControl: true, zoomControl: true, gestureHandling: 'greedy', mapId: 'DEMO_MAP_ID' });
      mapRef.current = map;
      infoWindowRef.current = new window.google.maps.InfoWindow();
      setMapReady(true);
    }).catch(err => toast.error('Failed to load Google Maps'));
    return () => {
      Object.values(markersRef.current).forEach(m => { if (m) m.map = null; });
      Object.values(destMarkersRef.current).forEach(m => { if (m) m.map = null; });
      Object.values(polylinesRef.current).forEach(p => { p.border?.setMap(null); p.remaining?.setMap(null); p.completed?.setMap(null); });
      trailPolylineRef.current?.setMap(null);
    };
  }, []);

  // 
  //  GEOFENCE MAP
  // 
  useEffect(() => {
    if (activeTab !== 'geofence' || !GOOGLE_MAPS_API_KEY) return;
    loadGoogleMapsScript().then(() => {
      if (!geofenceMapContainerRef.current || geofenceMapRef.current) return;
      const center = shopCoords || { lat: 31.5204, lng: 74.3587 };
      const map = new window.google.maps.Map(geofenceMapContainerRef.current, { center, zoom: 12, mapTypeControl: false, streetViewControl: false, mapId: 'DEMO_MAP_ID' });
      geofenceMapRef.current = map;
      // Shop marker
      const shopEl = document.createElement('div');
      shopEl.innerHTML = `<img src="${createDestIcon('#7c3aed', '🏪')}" style="width: 44px; height: 58px; pointer-events: none;" />`;
      new window.google.maps.marker.AdvancedMarkerElement({
        position: center,
        map,
        title: 'Store Location',
        content: shopEl
      });
      // Geofence circle
      geofenceCircleRef.current = new window.google.maps.Circle({ center, radius: geofenceRadius, map, fillColor: '#7c3aed', fillOpacity: 0.08, strokeColor: '#7c3aed', strokeOpacity: 0.6, strokeWeight: 2 });
      // Active drivers on geofence map
      drivers.forEach(d => {
        const driverEl = document.createElement('div');
        driverEl.innerHTML = `<img src="${createCarIcon(0, 0, getDriverColor(String(d.order_id)).main)}" style="width: 44px; height: 44px; pointer-events: none;" />`;
        new window.google.maps.marker.AdvancedMarkerElement({
          position: { lat: parseFloat(d.latitude), lng: parseFloat(d.longitude) },
          map,
          title: d.driver_name,
          content: driverEl
        });
      });
    });
  }, [activeTab, shopCoords, geofenceRadius]);

  // Update geofence circle radius
  useEffect(() => {
    if (geofenceCircleRef.current) geofenceCircleRef.current.setRadius(geofenceRadius);
  }, [geofenceRadius]);

  // 
  //  DELIVERY REPLAY
  // 
  useEffect(() => {
    if (activeTab !== 'replay' || !GOOGLE_MAPS_API_KEY) return;
    loadGoogleMapsScript().then(() => {
      if (!replayMapContainerRef.current || replayMapRef.current) return;
      replayMapRef.current = new window.google.maps.Map(replayMapContainerRef.current, { center: { lat: 31.5204, lng: 74.3587 }, zoom: 14, mapTypeControl: false, streetViewControl: false, mapId: 'DEMO_MAP_ID' });
    });
  }, [activeTab]);

  const fetchReplay = async () => {
    if (!replayOrderId.trim()) return;
    setReplayLoading(true); setReplayPlaying(false); setReplayIdx(0); setReplayTrail([]);
    clearInterval(replayIntervalRef.current);
    if (replayMarkerRef.current) replayMarkerRef.current.map = null;
    replayMarkerRef.current = null;
    replayRouteRef.current?.setMap(null); replayRouteRef.current = null;
    try {
      const res = await fetch(`${API_BASE_URL}/get_driver_location.php?order_id=${replayOrderId}`);
      const data = await res.json();
      if (data.success && data.trail?.length > 1) {
        const trail = data.trail.map(p => ({ lat: parseFloat(p.latitude), lng: parseFloat(p.longitude), heading: parseFloat(p.heading || 0), created_at: p.created_at }));
        setReplayTrail(trail);
        if (replayMapRef.current) {
          const bounds = new window.google.maps.LatLngBounds();
          trail.forEach(p => bounds.extend(p));
          replayMapRef.current.fitBounds(bounds, { padding: 60 });
          // Draw full route outline
          replayRouteRef.current = new window.google.maps.Polyline({ path: trail, geodesic: true, strokeColor: '#94a3b8', strokeOpacity: 0.4, strokeWeight: 3, map: replayMapRef.current });
          // Destination marker
          const destEl = document.createElement('div');
          destEl.innerHTML = `<img src="${createDestIcon('#ef4444')}" style="width: 36px; height: 48px; pointer-events: none;" />`;
          new window.google.maps.marker.AdvancedMarkerElement({ position: trail[trail.length - 1], map: replayMapRef.current, content: destEl });
          // Driver start marker
          const driverEl = document.createElement('div');
          driverEl.innerHTML = `<img src="${createCarIcon(trail[0].heading || 0, 5, '#2563eb')}" style="width: 56px; height: 56px; pointer-events: none;" />`;
          replayMarkerRef.current = new window.google.maps.marker.AdvancedMarkerElement({ position: trail[0], map: replayMapRef.current, content: driverEl, zIndex: 100 });
        }
        toast.success(`${trail.length} GPS points loaded for Order #${replayOrderId}`);
      } else {
        toast.error('No GPS trail found for this order');
      }
    } catch { toast.error('Failed to fetch replay data'); }
    setReplayLoading(false);
  };

  const startReplay = () => {
    if (replayTrail.length === 0) return;
    setReplayPlaying(true);
    replayIntervalRef.current = setInterval(() => {
      setReplayIdx(prev => {
        const next = prev + 1;
        if (next >= replayTrail.length) { clearInterval(replayIntervalRef.current); setReplayPlaying(false); return prev; }
        const pt = replayTrail[next];
        if (replayMarkerRef.current) {
          animateMarker(replayMarkerRef.current, pt, 400 / replaySpeed);
          const img = replayMarkerRef.current.content.querySelector('img');
          if (img) img.src = createCarIcon(pt.heading || 0, 10, '#2563eb');
        }
        if (replayMapRef.current) replayMapRef.current.panTo(pt);
        return next;
      });
    }, 600 / replaySpeed);
  };

  const pauseReplay = () => { clearInterval(replayIntervalRef.current); setReplayPlaying(false); };
  const resetReplay = () => {
    clearInterval(replayIntervalRef.current);
    setReplayPlaying(false); setReplayIdx(0);
    if (replayTrail[0] && replayMarkerRef.current) { replayMarkerRef.current.position = replayTrail[0]; replayMapRef.current?.panTo(replayTrail[0]); }
  };

  // 
  //  ROUTE PLANNER (Multi-Stop)
  // 
  useEffect(() => {
    if (activeTab !== 'planner') return;
    // Fetch today's ready/out-for-delivery orders
    fetch(`${API_BASE_URL}/orders/admin_orders.php?status=active`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` } })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const filtered = (data.orders || []).filter(o => {
            if (!o.shipping_address) return false;
            const addr = String(o.shipping_address).toLowerCase().trim();
            if (addr === 'pickup from store' || addr.includes('pickup from store') || addr === 'store pickup' || addr === 'pickup') return false;
            if (String(o.order_type).toLowerCase().includes('pickup') || String(o.delivery_type).toLowerCase().includes('pickup')) return false;
            return ['ready', 'out-for-delivery', 'processing'].includes(o.status);
          });
          setPlannerOrders(filtered);
        }
      }).catch(() => {});

    loadGoogleMapsScript().then(() => {
      if (!plannerMapContainerRef.current || plannerMapRef.current) return;
      plannerMapRef.current = new window.google.maps.Map(plannerMapContainerRef.current, { center: { lat: 31.5204, lng: 74.3587 }, zoom: 13, mapTypeControl: false, streetViewControl: false, mapId: 'DEMO_MAP_ID' });
      setPlannerMapReady(true);
    });
  }, [activeTab]);

  const calculateOptimalRoute = async () => {
    if (plannerSelected.length < 2 || !plannerMapRef.current || !window.google) return;
    setPlannerLoading(true);
    // Clear old markers/routes
    plannerMarkersRef.current.forEach(m => { if (m) m.map = null; }); plannerMarkersRef.current = [];
    plannerRouteRef.current?.setMap(null);

    const geocodedStops = [];
    for (const order of plannerSelected) {
      const loc = await new Promise((resolve) => {
        if (order.latitude && order.longitude && parseFloat(order.latitude) !== 0 && !isNaN(order.latitude)) {
          return resolve({ lat: parseFloat(order.latitude), lng: parseFloat(order.longitude) });
        }
        const gpsMatch = String(order.shipping_address || '').match(/\[?GPS:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)\]?/i) || String(order.shipping_address || '').match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/i);
        if (gpsMatch) {
          return resolve({ lat: parseFloat(gpsMatch[1]), lng: parseFloat(gpsMatch[2]) });
        }
        const geocoder = new window.google.maps.Geocoder();
        let query = String(order.shipping_address || '').trim();
        if (!query.toLowerCase().includes('lahore')) query += ', Lahore';
        if (!query.toLowerCase().includes('pakistan')) query += ', Pakistan';

        geocoder.geocode({ address: query }, (results, status) => {
          if (status === 'OK' && results[0]) {
            resolve(results[0].geometry.location);
          } else {
            const parts = query.split(',');
            if (parts.length > 1) {
              geocoder.geocode({ address: parts.slice(1).join(',').trim() + ', Lahore, Pakistan' }, (r2, s2) => {
                if (s2 === 'OK' && r2[0]) resolve(r2[0].geometry.location);
                else resolve(null);
              });
            } else resolve(null);
          }
        });
      });

      if (!loc) {
        toast.error(`Could not geocode address: ${order.shipping_address}`);
        setPlannerLoading(false);
        return;
      }
      geocodedStops.push(loc);
    }

    const origin = geocodedStops[0];
    const destination = geocodedStops[geocodedStops.length - 1];
    const waypoints = geocodedStops.slice(1, -1).map(loc => ({ location: loc, stopover: true }));

    new window.google.maps.DirectionsService().route(
      { origin, destination, waypoints, travelMode: window.google.maps.TravelMode.DRIVING, optimizeWaypoints: true },
      (result, status) => {
        if (status !== 'OK') {
          toast.error(`Route calculation failed (${status}). Check if addresses are accessible by road.`);
          setPlannerLoading(false);
          return;
        }
        const path = [];
        result.routes[0].legs.forEach(leg => leg.steps.forEach(step => step.path.forEach(pt => path.push(pt))));
        plannerRouteRef.current = new window.google.maps.Polyline({ path, geodesic: true, strokeColor: '#2563eb', strokeOpacity: 0.9, strokeWeight: 5, map: plannerMapRef.current, icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3, strokeColor: '#ffffff', strokeWeight: 1 }, offset: '0', repeat: '18px' }] });
        let totalDist = 0, totalTime = 0;
        const orderOfDelivery = result.routes[0].waypoint_order;
        const reorderedStops = [plannerSelected[0], ...orderOfDelivery.map(i => plannerSelected[i + 1]), plannerSelected[plannerSelected.length - 1]];
        result.routes[0].legs.forEach((leg, i) => {
          totalDist += leg.distance.value; totalTime += leg.duration.value;
          const pos = leg.end_location;
          const labelText = String(i + 1);
          const stopEl = document.createElement('div');
          stopEl.innerHTML = `<img src="${createDestIcon('#2563eb', labelText)}" style="width: 36px; height: 48px; pointer-events: none;" />`;
          const marker = new window.google.maps.marker.AdvancedMarkerElement({
            position: { lat: pos.lat(), lng: pos.lng() },
            map: plannerMapRef.current,
            title: `Stop ${labelText}`,
            content: stopEl
          });
          plannerMarkersRef.current.push(marker);
        });
        const bounds = new window.google.maps.LatLngBounds();
        path.forEach(p => bounds.extend(p)); plannerMapRef.current.fitBounds(bounds, { padding: 60 });
        setPlannerResult({ totalDist: (totalDist / 1000).toFixed(1), totalTime: Math.round(totalTime / 60), stops: reorderedStops, legs: result.routes[0].legs });
        setPlannerLoading(false);
      }
    );
  };

  // 
  //  HELPERS
  // 
  const copyTrackingLink = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/generate_tracking_link.php?order_id=${orderId}`);
      const data = await res.json();
      if (data.success && data.token) {
        const link = `${window.location.origin}/track/${data.token}`;
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(link);
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = link;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
        toast.success(`Tracking link copied: /track/${data.token}`);
      } else {
        toast.error(data.message || 'No link available');
      }
    } catch (e) {
      toast.error('Failed to copy tracking link');
    }
  };

  const focusDriver = (driver) => {
    setSelectedOrder(driver.order_id);
    autoFollowRef.current = true;
    const pos = { lat: parseFloat(driver.latitude), lng: parseFloat(driver.longitude) };
    if (mapRef.current) {
      mapRef.current.panTo(pos);
      mapRef.current.setZoom(15);
    }
    if (driver.shipping_address) {
      fetchDriverETA(driver);
    }
    const dest = destCoordsRef.current[String(driver.order_id)];
    if (dest && mapRef.current && window.google) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(pos);
      bounds.extend(dest);
      mapRef.current.fitBounds(bounds, { padding: 80 });
    }
  };

  const clearSelection = () => {
    setSelectedOrder(null); setOrderDetail(null); autoFollowRef.current = false;
    infoWindowRef.current?.close();
    Object.values(polylinesRef.current).forEach(p => { p.border?.setMap(null); p.remaining?.setMap(null); p.completed?.setMap(null); });
    polylinesRef.current = {}; routePathRef.current = {}; routeLastDrawRef.current = {}; routeDrawnRef.current.clear();
    destMarkersRef.current = {}; trailPolylineRef.current?.setMap(null); trailPolylineRef.current = null;
    if (mapRef.current && drivers.length > 0) { const bounds = new window.google.maps.LatLngBounds(); drivers.forEach(d => bounds.extend({ lat: parseFloat(d.latitude), lng: parseFloat(d.longitude) })); mapRef.current.fitBounds(bounds, { padding: 80 }); }
  };

  const TABS = [
    { id: 'live', label: 'Live', icon: <Radio className="h-3.5 w-3.5" /> },
    { id: 'planner', label: 'Route Planner', icon: <Route className="h-3.5 w-3.5" /> },
    { id: 'replay', label: 'Replay', icon: <History className="h-3.5 w-3.5" /> },
    { id: 'geofence', label: 'Geofence', icon: <Shield className="h-3.5 w-3.5" /> },
  ];

  // 
  //  RENDER
  // 
  return (
    <div className="space-y-4">
      {/* Header + Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Radio className="h-5 w-5 text-red-500 animate-pulse" />
            Live Delivery Tracking
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{drivers.length} active • {completedDeliveries.length} completed today</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <div className="relative">
            <Button variant="outline" size="sm" className="relative gap-1.5" onClick={() => { setNotifOpen(o => !o); setUnreadCount(0); }}>
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>}
            </Button>
            {notifOpen && (
              <div className="absolute right-0 top-10 w-80 bg-white border rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <p className="text-sm font-bold">Notifications</p>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setNotifications([])}>Clear all</Button>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
                ) : notifications.map(n => (
                  <div key={n.id} className={`flex items-start gap-2 px-3 py-2 border-b hover:bg-muted/30 text-xs ${NOTIF_TYPES[n.type]?.color}`}>
                    <span className="text-base shrink-0">{NOTIF_TYPES[n.type]?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{NOTIF_TYPES[n.type]?.label}</p>
                      <p className="truncate">{n.driverName} • Order #{n.orderId} {n.extra}</p>
                      <p className="opacity-60">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${socketConnected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            {socketConnected ? 'Real-time' : 'Polling'}
          </span>
          <Button variant="outline" size="sm" onClick={fetchDriverLocations} className="gap-1">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          {/* Route Optimization Button */}
          {drivers.length > 1 && (
            <Button
              variant="outline" size="sm"
              className="gap-1 border-purple-300 text-purple-700 hover:bg-purple-50"
              disabled={optimizing}
              onClick={async () => {
                setOptimizing(true);
                setOptimizedResult(null);
                try {
                  // Geocode all driver destinations
                  const geocodeAddr = (addr) => new Promise(resolve => {
                    const gpsMatch = String(addr || '').match(/\[?GPS:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)\]?/i);
                    if (gpsMatch) return resolve({ lat: parseFloat(gpsMatch[1]), lng: parseFloat(gpsMatch[2]) });
                    if (!window.google?.maps?.Geocoder) return resolve(null);
                    new window.google.maps.Geocoder().geocode({ address: addr + ', Lahore, Pakistan' }, (r, s) => {
                      if (s === 'OK' && r[0]) { const l = r[0].geometry.location; resolve({ lat: l.lat(), lng: l.lng() }); }
                      else resolve(null);
                    });
                  });
                  const orders = [];
                  for (const d of drivers) {
                    if (!d.shipping_address) continue;
                    const coords = await geocodeAddr(d.shipping_address);
                    if (coords) orders.push({ id: d.order_id, lat: coords.lat, lng: coords.lng, address: d.shipping_address, driver: d.driver_name });
                  }
                  if (orders.length < 2) { toast.error('Need at least 2 orders with addresses to optimize'); setOptimizing(false); return; }
                  const depot = shopCoords || { lat: 31.4973551, lng: 74.2446932 };
                  const res = await fetch(`${API_BASE_URL}/orders/optimize_routes.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ depot, orders }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    setOptimizedResult(data);
                    toast.success(`✨ Optimized! ${data.totalOrders} orders • ${data.totalDistanceKm} km • ~${data.totalTimeMin} min`);
                  } else {
                    toast.error('Route Optimization failed: ' + (data.message || 'Unknown error'));
                  }
                } catch (e) {
                  toast.error('Optimization error: ' + e.message);
                } finally { setOptimizing(false); }
              }}
            >
              {optimizing ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Optimizing...</> : <><Zap className="h-3.5 w-3.5" /> Optimize Routes</>}
            </Button>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.id ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab.icon} {tab.label}
            {tab.id === 'live' && drivers.length > 0 && <span className="w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{drivers.length}</span>}
          </button>
        ))}
      </div>

      {/* TAB: LIVE */}
      {activeTab === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600/10 to-blue-500/5 px-4 py-2.5 flex items-center justify-between border-b">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-purple-600" />
                  {selectedOrder ? `Order #${selectedOrder} — Live Route` : 'All Active Drivers'}
                </span>
                <div className="flex gap-2">
                  {selectedOrder && autoFollowRef.current && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Target className="h-3 w-3" /> Following</span>}
                  {selectedOrder && <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={clearSelection}><ChevronLeft className="h-3 w-3" /> All</Button>}
                </div>
              </div>
              {GOOGLE_MAPS_API_KEY ? <div ref={mapContainerRef} className="w-full h-[420px] sm:h-[560px]" />
                : <div className="h-[420px] flex items-center justify-center bg-muted/30"><MapPin className="h-10 w-10 text-muted-foreground" /></div>}
              {mapReady && drivers.length === 0 && !loading && (
                <div className="bg-amber-50 border-t border-amber-100 px-4 py-2 flex items-center gap-2 text-sm text-amber-800">
                  <Truck className="h-4 w-4" /> No active deliveries. Markers appear when a driver starts delivery.
                </div>
              )}
              {selectedOrder && (
                <div className="border-t px-4 py-2 flex gap-4 flex-wrap bg-muted/20 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><div className="w-5 h-1.5 bg-blue-500 rounded-full" /> Remaining</span>
                  <span className="flex items-center gap-1"><div className="w-5 h-1.5 bg-slate-400 rounded-full" /> Completed</span>
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Truck className="h-4 w-4" /> Active Drivers ({drivers.length})</h3>
            {loading ? <Card className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /><p className="text-sm text-muted-foreground mt-2">Loading...</p></Card>
              : drivers.length === 0 ? <Card className="p-8 text-center"><Truck className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" /><p className="text-sm text-muted-foreground">No active deliveries</p></Card>
              : drivers.map(driver => {
                const orderId = String(driver.order_id);
                const etaInfo = driverETAs[orderId], progress = routeProgress[orderId];
                const isNear = nearDestination[orderId], countdown = liveCountdown[orderId];
                const color = getDriverColor(orderId).main;
                const speed = formatSpeed(parseFloat(driver.speed || 0));
                const isSelected = String(selectedOrder) === orderId;
                return (
                  <Card key={driver.order_id} className={`p-4 cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-purple-500 bg-purple-50/50' : 'hover:bg-secondary/50'}`} onClick={() => focusDriver(driver)}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: color }}>{driver.driver_name?.charAt(0)}</div>
                        <div><p className="font-semibold text-sm">{driver.driver_name}</p><p className="text-xs text-muted-foreground">Order #{driver.order_id}</p></div>
                      </div>
                      <div className="flex gap-1">
                        {isNear && <Badge className="bg-green-500 text-white text-[10px] animate-pulse"><Zap className="h-2.5 w-2.5 mr-0.5" />Near!</Badge>}
                        <Badge className="bg-red-500 text-white text-[10px] animate-pulse"><Radio className="h-2.5 w-2.5 mr-0.5" />LIVE</Badge>
                      </div>
                    </div>
                    {etaInfo && (
                      <div className="rounded-xl p-2.5 mb-2" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                        <div className="flex justify-between text-xs">
                          <div><p className="text-muted-foreground">ETA</p><p className="font-bold" style={{ color }}>{etaInfo.eta}</p></div>
                          <div className="text-right"><p className="text-muted-foreground">Distance</p><p className="font-bold">{etaInfo.distance}</p></div>
                          {countdown !== undefined && <div className="text-right"><p className="text-muted-foreground">Left</p><p className="font-mono font-bold text-orange-600">{fmtCountdown(countdown)}</p></div>}
                        </div>
                        {etaInfo.arrivalTime && <p className="text-xs mt-1 flex items-center gap-1" style={{ color }}><Clock className="h-3 w-3" /> Arrives at <strong>{etaInfo.arrivalTime}</strong></p>}
                      </div>
                    )}
                    {progress && (
                      <div className="mb-2">
                        <div className="flex justify-between text-xs mb-0.5"><span className="text-muted-foreground">Progress</span><span className="font-bold" style={{ color }}>{progress.pct}%</span></div>
                        <div className="h-1.5 bg-muted rounded-full"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress.pct}%`, background: color }} /></div>
                      </div>
                    )}
                    {speed && <p className="text-xs text-amber-600 flex items-center gap-1 mb-2"><Zap className="h-3 w-3" />{speed}</p>}
                    <div className="bg-background rounded-lg px-3 py-2 border text-xs space-y-0.5 mb-2">
                      <p className="flex items-center gap-1.5 truncate"><MapPin className="h-3 w-3 text-red-400 shrink-0" />{driver.shipping_address?.substring(0, 45) || 'N/A'}</p>
                      {driver.customer_phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-blue-400" />{driver.customer_phone}</p>}
                      <p className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-3 w-3" />Last: {new Date(driver.created_at).toLocaleTimeString()}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="flex-1 text-xs h-7 gap-1" onClick={e => { e.stopPropagation(); focusDriver(driver); }}><Route className="h-3 w-3" />Route</Button>
                      <Button variant="outline" size="sm" className="flex-1 text-xs h-7 gap-1" onClick={e => { e.stopPropagation(); copyTrackingLink(driver.order_id); }}><Link2 className="h-3 w-3" />Link</Button>
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={e => { e.stopPropagation(); window.open(`https://www.google.com/maps?q=${driver.latitude},${driver.longitude}`, '_blank'); }}><Navigation className="h-3 w-3" /></Button>
                      {driver.customer_phone && <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={e => { e.stopPropagation(); window.open(`tel:${driver.customer_phone}`); }}><Phone className="h-3 w-3" /></Button>}
                    </div>
                  </Card>
                );
              })
            }
            {completedDeliveries.length > 0 && (
              <div className="mt-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Recently Completed</h3>
                {completedDeliveries.map((d, i) => (
                  <Card key={`${d.order_id}-${i}`} className="p-3 mb-2 bg-green-50/50 border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs">✅</div><div><p className="text-xs font-semibold">{d.driver_name}</p><p className="text-[10px] text-muted-foreground">#{d.order_id} • {d.customer_name}</p></div></div>
                      <Badge variant="outline" className="text-[10px] border-green-300 text-green-700">{d.completed_at}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: ROUTE PLANNER */}
      {activeTab === 'planner' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="px-4 py-2.5 border-b flex items-center gap-2 bg-blue-50/50">
                <Route className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold">Multi-Stop Route Optimizer</span>
                {plannerResult && <Badge className="ml-auto bg-blue-600 text-white text-xs">{plannerResult.totalDist} km • {plannerResult.totalTime} min total</Badge>}
              </div>
              <div ref={plannerMapContainerRef} className="w-full h-[480px]" />
            </Card>
          </div>
          <div className="space-y-3">
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><Layers className="h-4 w-4" /> Select Stops (in order)</h3>
              <p className="text-[11px] text-muted-foreground mb-3">Only home delivery orders shown (Store pickups excluded)</p>
              {plannerOrders.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No home delivery orders ready for routing</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {plannerOrders.map(order => {
                    const sel = plannerSelected.find(s => s.id === order.id);
                    const idx = plannerSelected.findIndex(s => s.id === order.id);
                    return (
                      <div key={order.id} className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer hover:bg-muted/30 transition-all ${sel ? 'border-blue-400 bg-blue-50/60' : ''}`}
                        onClick={() => { if (sel) setPlannerSelected(p => p.filter(s => s.id !== order.id)); else setPlannerSelected(p => [...p, order]); }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold" style={{ background: sel ? '#2563eb' : '#e2e8f0', color: sel ? 'white' : '#64748b' }}>{sel ? idx + 1 : '+'}</div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">Order #{order.id} — {order.customer_name}</p>
                          <p className="text-muted-foreground truncate">{order.shipping_address?.substring(0, 50)}</p>
                        </div>
                        <Badge variant="outline" className="text-[9px] shrink-0">{order.status}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-3 space-y-2">
                {plannerSelected.length > 0 && (
                  <div className="bg-muted/30 rounded-lg p-2 text-xs">
                    <p className="font-semibold mb-1">{plannerSelected.length} stops selected:</p>
                    {plannerSelected.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-1 text-[11px] py-0.5">
                        <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">{i + 1}</span>
                        <span className="truncate">Order #{s.id} — {s.customer_name}</span>
                        <button onClick={() => setPlannerSelected(p => p.filter(x => x.id !== s.id))} className="ml-auto text-red-400 hover:text-red-600"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <Button className="w-full gap-2" disabled={plannerSelected.length < 2 || plannerLoading} onClick={calculateOptimalRoute}>
                  {plannerLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Calculating...</>
                    : <><Zap className="h-4 w-4" /> Optimize Route ({plannerSelected.length} stops)</>}
                </Button>
                {plannerSelected.length > 0 && <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setPlannerSelected([]); plannerMarkersRef.current.forEach(m => m.setMap(null)); plannerMarkersRef.current = []; plannerRouteRef.current?.setMap(null); setPlannerResult(null); }}>
                  <Trash2 className="h-3 w-3 mr-1" /> Clear All
                </Button>}
              </div>
            </Card>
            {plannerResult && (
              <Card className="p-4 bg-blue-50/50 border-blue-200">
                <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Optimized Route</h4>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-white rounded-lg p-2 text-center"><p className="text-xs text-muted-foreground">Total Distance</p><p className="font-bold text-blue-700">{plannerResult.totalDist} km</p></div>
                  <div className="bg-white rounded-lg p-2 text-center"><p className="text-xs text-muted-foreground">Total Time</p><p className="font-bold text-blue-700">{plannerResult.totalTime} min</p></div>
                </div>
                <div className="space-y-1">
                  {plannerResult.legs?.map((leg, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">{i + 1}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{leg.end_address?.substring(0, 35)}</span>
                      <span className="text-muted-foreground shrink-0">{leg.duration.text}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* TAB: REPLAY */}
      {activeTab === 'replay' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="px-4 py-2.5 border-b flex items-center gap-2 bg-purple-50/50">
                <History className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold">Delivery History Replay</span>
                {replayTrail.length > 0 && <Badge className="ml-auto bg-purple-600 text-white text-xs">{replayTrail.length} GPS points</Badge>}
              </div>
              <div ref={replayMapContainerRef} className="w-full h-[480px]" />
              {/* Playback progress */}
              {replayTrail.length > 0 && (
                <div className="border-t px-4 py-3 bg-muted/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Button variant={replayPlaying ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0" onClick={replayPlaying ? pauseReplay : startReplay}>
                      {replayPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={resetReplay}><RotateCcw className="h-4 w-4" /></Button>
                    <div className="flex-1 mx-2">
                      <div className="h-2 bg-muted rounded-full relative">
                        <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${replayTrail.length > 0 ? (replayIdx / (replayTrail.length - 1)) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{replayIdx + 1} / {replayTrail.length}</span>
                    <div className="flex items-center gap-1 border rounded-lg px-2 py-1">
                      <SkipForward className="h-3 w-3 text-muted-foreground" />
                      {[1, 2, 5, 10].map(s => (
                        <button key={s} className={`text-xs px-1.5 py-0.5 rounded transition-all ${replaySpeed === s ? 'bg-purple-500 text-white' : 'hover:bg-muted'}`} onClick={() => setReplaySpeed(s)}>{s}x</button>
                      ))}
                    </div>
                  </div>
                  {replayTrail[replayIdx] && (
                    <p className="text-[10px] text-muted-foreground">
                      📍 {replayTrail[replayIdx].lat.toFixed(5)}, {replayTrail[replayIdx].lng.toFixed(5)}
                      {replayTrail[replayIdx].created_at && ` • ${new Date(replayTrail[replayIdx].created_at).toLocaleTimeString()}`}
                    </p>
                  )}
                </div>
              )}
            </Card>
          </div>
          <div className="space-y-3">
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><History className="h-4 w-4" /> Load Delivery</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Order ID</label>
                  <div className="flex gap-2">
                    <input value={replayOrderId} onChange={e => setReplayOrderId(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchReplay()}
                      className="flex-1 h-9 px-3 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="e.g. 64" />
                    <Button size="sm" className="h-9 gap-1" onClick={fetchReplay} disabled={replayLoading}>
                      {replayLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-1 text-muted-foreground">
                  <p className="font-semibold text-foreground">How to use:</p>
                  <p>1. Enter an Order ID above</p>
                  <p>2. Press Play or Enter to load GPS trail</p>
                  <p>3. Use playback controls to replay</p>
                  <p>4. Change speed with 1x/2x/5x/10x</p>
                </div>
                {replayTrail.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-1 text-xs">
                    <p className="font-semibold text-purple-800">Trail Loaded ✓</p>
                    <p>Total points: <strong>{replayTrail.length}</strong></p>
                    {replayTrail[0]?.created_at && <p>Start: <strong>{new Date(replayTrail[0].created_at).toLocaleString()}</strong></p>}
                    {replayTrail[replayTrail.length - 1]?.created_at && <p>End: <strong>{new Date(replayTrail[replayTrail.length - 1].created_at).toLocaleString()}</strong></p>}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB: GEOFENCE */}
      {activeTab === 'geofence' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="px-4 py-2.5 border-b flex items-center gap-2 bg-purple-50/50">
                <Shield className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold">Geofence Manager</span>
                <Badge className={`ml-auto text-xs ${geofenceEnabled ? 'bg-green-500' : 'bg-gray-400'} text-white`}>{geofenceEnabled ? '🟢 Active' : '⚫ Disabled'}</Badge>
              </div>
              <div ref={geofenceMapContainerRef} className="w-full h-[480px]" />
              <div className="border-t px-4 py-2 bg-muted/20 flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-4 h-4 rounded-full border-2 border-purple-500 bg-purple-500/10" /> Geofence Zone
                <span className="ml-2">•</span>
                <div className="w-3 h-3 rounded-full bg-purple-500" /> Store Location
              </div>
            </Card>
          </div>
          <div className="space-y-3">
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Shield className="h-4 w-4" /> Geofence Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Enable Monitoring</span>
                  <button onClick={() => setGeofenceEnabled(e => !e)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${geofenceEnabled ? 'bg-purple-500' : 'bg-muted'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${geofenceEnabled ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
                <div>
                  <div className="flex justify-between mb-2"><label className="text-xs font-semibold text-muted-foreground">Alert Radius</label><span className="text-xs font-bold text-purple-700">{(geofenceRadius / 1000).toFixed(1)} km</span></div>
                  <input type="range" min={500} max={20000} step={500} value={geofenceRadius} onChange={e => setGeofenceRadius(Number(e.target.value))} className="w-full accent-purple-500" />
                  <div className="flex justify-between text-[10px] text-muted-foreground"><span>0.5 km</span><span>20 km</span></div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-xs">
                  <p className="font-semibold mb-1">Store Location</p>
                  <p className="text-muted-foreground">{storeAddress || 'Loading...'}</p>
                  {shopCoords && <p className="font-mono text-purple-700 mt-1">{shopCoords.lat.toFixed(5)}, {shopCoords.lng.toFixed(5)}</p>}
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-2">
                  <p className="font-semibold">Active Drivers Status</p>
                  {drivers.length === 0 ? <p className="text-muted-foreground">No active drivers</p>
                    : drivers.map(d => {
                      const pos = { lat: parseFloat(d.latitude), lng: parseFloat(d.longitude) };
                      const inZone = shopCoords && window.google ? (() => { try { return window.google.maps.geometry.spherical.computeDistanceBetween(new window.google.maps.LatLng(shopCoords.lat, shopCoords.lng), new window.google.maps.LatLng(pos.lat, pos.lng)) <= geofenceRadius; } catch { return true; } })() : true;
                      return (
                        <div key={d.order_id} className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${inZone ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="flex-1">{d.driver_name} (#{d.order_id})</span>
                          <span className={inZone ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{inZone ? 'In Zone' : '⚠️ Outside!'}</span>
                        </div>
                      );
                    })
                  }
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
                  <p className="font-semibold text-yellow-800 mb-1">ℹ️ How Geofencing Works</p>
                  <p className="text-yellow-700">When enabled, a notification appears if any driver goes outside the set radius from your store location. Checked every 15 seconds.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveTrackingMap;
