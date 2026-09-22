import { LiveTrackingHeader } from '../../components/features/admin/liveTracking/LiveTrackingHeader';
import { LiveTrackingSidebar } from '../../components/features/admin/liveTracking/LiveTrackingSidebar';
import { RoutePlannerTab } from '../../components/features/admin/liveTracking/RoutePlannerTab';
import { RouteReplayTab } from '../../components/features/admin/liveTracking/RouteReplayTab';
import { GeofenceTab } from '../../components/features/admin/liveTracking/GeofenceTab';
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
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { API_BASE_URL, MAPBOX_TOKEN, SOCKET_URL } from '../../config';
import { useTranslation } from 'react-i18next';
import {
  ROUTE_COLORS,
  getDriverColor,
  createCarIcon,
  createDestIcon,
  computeDistanceBetween,
  createGeoJSONCircle,
  isValidMapboxToken,
  getMapStyle,
  dedupeDrivers,
  formatArrivalTime,
  formatSpeed,
  timeAgo,
  fmtCountdown,
  NOTIF_TYPES
} from '../../components/features/admin/liveTracking/liveTrackingUtils';
import { useLiveTrackingAlerts } from '../../components/features/admin/liveTracking/useLiveTrackingAlerts';
import { useLiveTrackingSocket } from '../../components/features/admin/liveTracking/useLiveTrackingSocket';

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
  const [nearDestination, setNearDestination] = useState({});
  // Geofence state
  const [geofenceRadius, setGeofenceRadius] = useState(5000);
  const [geofenceEnabled, setGeofenceEnabled] = useState(true);
  const [shopCoords, setShopCoords] = useState(null);
  const [storeAddress, setStoreAddress] = useState('');
  const geofenceMapRef = useRef(null);
  const geofenceMapContainerRef = useRef(null);
  const geofenceMarkersRef = useRef([]);

  // Smart Notifications & Alerts
  const {
    notifications,
    setNotifications,
    notifOpen,
    setNotifOpen,
    unreadCount,
    setUnreadCount,
    liveCountdown,
    setLiveCountdown,
    notifRef,
    addNotification,
  } = useLiveTrackingAlerts({
    drivers,
    driverETAs,
    nearDestination,
    geofenceEnabled,
    shopCoords,
    geofenceRadius,
  });

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
  const replayMarkersRef = useRef([]);
  const replayIntervalRef = useRef(null);

  // Route Planner state
  const [plannerOrders, setPlannerOrders] = useState([]);
  const [plannerSelected, setPlannerSelected] = useState([]);
  const [plannerResult, setPlannerResult] = useState(null);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerMapReady, setPlannerMapReady] = useState(false);
  const plannerMapContainerRef = useRef(null);
  const plannerMapRef = useRef(null);
  const plannerMarkersRef = useRef([]);

  // Main map refs
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const destMarkersRef = useRef({});
  const routePathRef = useRef({});
  const destCoordsRef = useRef({});
  const routeDrawnRef = useRef(new Set());
  const routeLastDrawRef = useRef({});
  const popupRef = useRef(null);
  const previousDriversRef = useRef({});
  const previousHeadingsRef = useRef({});
  const autoFollowRef = useRef(false);



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
    if (!storeAddress) return;
    const geocodeStore = async () => {
      try {
        if (MAPBOX_TOKEN) {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(storeAddress)}.json?access_token=${MAPBOX_TOKEN}&country=PK&proximity=74.3587,31.5204&limit=1`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.features && data.features.length > 0) {
              const [lng, lat] = data.features[0].center;
              setShopCoords({ lat, lng });
              return;
            }
          }
        }
        // Fallback default Lahore center
        setShopCoords({ lat: 31.5204, lng: 74.3587 });
      } catch (e) {
        setShopCoords({ lat: 31.5204, lng: 74.3587 });
      }
    };
    geocodeStore();
  }, [storeAddress]);

  // 
  //  ROUTE LOGIC (updateRemainingRoute, drawDirectionsRoute)
  // 
  const updateRemainingRoute = useCallback((orderId, driverPos) => {
    const fullPath = routePathRef.current[orderId];
    if (!fullPath || fullPath.length === 0) return;

    let ci = 0, minD = Infinity;
    fullPath.forEach((pt, i) => {
      const d = computeDistanceBetween(driverPos, { lat: pt[1], lng: pt[0] });
      if (d < minD) { minD = d; ci = i; }
    });

    if (minD > 100) {
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

    const pct = Math.round((ci / fullPath.length) * 100);
    setRouteProgress(prev => ({ ...prev, [orderId]: { pct } }));

    const lastPt = fullPath[fullPath.length - 1];
    const distToDest = computeDistanceBetween(driverPos, { lat: lastPt[1], lng: lastPt[0] });
    setNearDestination(prev => ({ ...prev, [orderId]: distToDest < 300 }));
  }, []);

  // 
  //  SOCKET.IO Hook
  // 
  const handleDriverMoved = useCallback((data) => {
    const orderId = String(data.order_id);
    setDrivers(prev => {
      const exists = prev.find(d => String(d.order_id) === orderId);
      if (exists) return prev.map(d => String(d.order_id) === orderId ? { ...d, latitude: data.latitude, longitude: data.longitude, heading: data.heading, speed: data.speed, created_at: new Date().toISOString() } : d);
      return [...prev, { order_id: data.order_id, latitude: data.latitude, longitude: data.longitude, heading: data.heading, speed: data.speed, driver_name: data.driver_name, created_at: new Date().toISOString() }];
    });
    if (markersRef.current[orderId] && mapRef.current) {
      const pos = { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) };
      markersRef.current[orderId].setLngLat([pos.lng, pos.lat]);
      const h = parseFloat(data.heading || 0);
      if (Math.abs(h - (previousHeadingsRef.current[orderId] || 0)) > 3) {
        const color = getDriverColor(orderId).main;
        const img = markersRef.current[orderId].getElement().querySelector('img');
        if (img) img.src = createCarIcon(h, parseFloat(data.speed || 0), color);
        previousHeadingsRef.current[orderId] = h;
      }
      const now = Date.now();
      if (now - (routeLastDrawRef.current[orderId] || 0) > 12000 && routePathRef.current[orderId]) {
        routeLastDrawRef.current[orderId] = now;
        updateRemainingRoute(orderId, pos);
      }
      if (autoFollowRef.current && String(selectedOrder) === orderId) {
        mapRef.current.panTo([pos.lng, pos.lat]);
      }
    }
    setLastUpdated(new Date());
  }, [selectedOrder, updateRemainingRoute]);

  const handleActiveDrivers = useCallback((data) => {
    if (data?.drivers) {
      setDrivers(prev => {
        const m = new Map(prev.map(d => [String(d.order_id), d]));
        data.drivers.forEach(d => m.set(String(d.order_id), { ...m.get(String(d.order_id)), ...d }));
        return Array.from(m.values());
      });
    }
  }, []);

  const handleDeliveryCompleted = useCallback((data) => {
    const orderId = String(data.order_id);
    const driver = previousDriversRef.current[orderId];
    if (driver) {
      toast.success(`✅ Delivered! Order #${data.order_id} — ${data.driver_name}`, { duration: 8000 });
      setCompletedDeliveries(prev => [{ ...driver, completed_at: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
    }
  }, []);

  const { socketRef, socketConnected } = useLiveTrackingSocket({
    onDriverMoved: handleDriverMoved,
    onActiveDrivers: handleActiveDrivers,
    onDeliveryCompleted: handleDeliveryCompleted,
  });

  const drawRouteOnMap = useCallback((orderId, routeGeoJson, color) => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      try {
        const sourceId = `route-source-${orderId}`;
        const glowId = `route-glow-${orderId}`;
        const lineId = `route-line-${orderId}`;

        const geoData = {
          type: 'Feature',
          properties: {},
          geometry: routeGeoJson
        };

        if (map.getSource(sourceId)) {
          map.getSource(sourceId).setData(geoData);
        } else {
          map.addSource(sourceId, { type: 'geojson', data: geoData });
          if (!map.getLayer(glowId)) {
            map.addLayer({
              id: glowId,
              type: 'line',
              source: sourceId,
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: { 'line-color': color.glow, 'line-width': 12, 'line-opacity': 0.25 }
            });
          }
          if (!map.getLayer(lineId)) {
            map.addLayer({
              id: lineId,
              type: 'line',
              source: sourceId,
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: { 'line-color': color.main, 'line-width': 5, 'line-opacity': 0.95 }
            });
          }
        }
      } catch (err) {
        console.warn('Map route layer error:', err);
      }
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once('load', apply);
    }
  }, []);

  const ensureDestMarker = useCallback((orderId, dest) => {
    const map = mapRef.current;
    if (!map || !dest) return;
    if (destMarkersRef.current[orderId]) {
      destMarkersRef.current[orderId].setLngLat([dest.lng, dest.lat]);
      return;
    }
    const color = getDriverColor(orderId).main;
    const el = document.createElement('div');
    el.innerHTML = `<img src="${createDestIcon(color)}" style="width: 36px; height: 48px; pointer-events: none;" />`;
    const destMarker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([dest.lng, dest.lat])
      .addTo(map);
    destMarkersRef.current[orderId] = destMarker;
  }, []);

  const drawDirectionsRoute = useCallback(async (orderId, origin, destination) => {
    const color = getDriverColor(orderId);
    let routeGeoJson = null;
    let durSec = null;
    let distM = null;

    // Try Mapbox Directions API
    if (MAPBOX_TOKEN) {
      try {
        const res = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            routeGeoJson = data.routes[0].geometry;
            durSec = Math.round(data.routes[0].duration || 0);
            distM = Math.round(data.routes[0].distance || 0);
          }
        }
      } catch (e) {
        console.warn('Mapbox directions error:', e);
      }
    }

    // OSRM fallback
    if (!routeGeoJson) {
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            routeGeoJson = data.routes[0].geometry;
            durSec = Math.round(data.routes[0].duration || 0);
            distM = Math.round(data.routes[0].distance || 0);
          }
        }
      } catch (e) {
        console.warn('OSRM error:', e);
      }
    }

    // Straight line fallback
    if (!routeGeoJson) {
      routeGeoJson = {
        type: 'LineString',
        coordinates: [
          [origin.lng, origin.lat],
          [destination.lng, destination.lat]
        ]
      };
      distM = computeDistanceBetween(origin, destination);
      durSec = Math.round((distM / 30) * 3.6); // approx 30 km/h
    }

    routePathRef.current[orderId] = routeGeoJson.coordinates;
    routeLastDrawRef.current[orderId] = Date.now();
    routeDrawnRef.current.add(orderId);

    if (durSec || distM) {
      setDriverETAs(prev => ({
        ...prev,
        [orderId]: {
          ...(prev[orderId] || {}),
          ...(durSec ? { eta: `${Math.round(durSec / 60)} mins`, etaValue: durSec, arrivalTime: formatArrivalTime(durSec) } : {}),
          ...(distM ? { distance: `${(distM / 1000).toFixed(1)} km` } : {}),
        }
      }));
      if (durSec) setLiveCountdown(prev => ({ ...prev, [orderId]: durSec }));
    }

    drawRouteOnMap(orderId, routeGeoJson, color);
    ensureDestMarker(orderId, destination);
  }, [drawRouteOnMap, ensureDestMarker]);

  // driver data
  const fetchDriverETA = useCallback((driver) => {
    if (!driver.shipping_address) return;
    const orderId = String(driver.order_id);
    const driverPos = { lat: parseFloat(driver.latitude), lng: parseFloat(driver.longitude) };

    if (routeDrawnRef.current.has(orderId)) {
      const now = Date.now();
      if (now - (routeLastDrawRef.current[orderId] || 0) > 15000 && routePathRef.current[orderId]) {
        routeLastDrawRef.current[orderId] = now;
        updateRemainingRoute(orderId, driverPos);
      }
      if (mapRef.current && routePathRef.current[orderId]) {
        const color = getDriverColor(orderId);
        drawRouteOnMap(orderId, { type: 'LineString', coordinates: routePathRef.current[orderId] }, color);
      }
      if (mapRef.current && destCoordsRef.current[orderId]) {
        ensureDestMarker(orderId, destCoordsRef.current[orderId]);
      }
      return;
    }

    const getDestCoords = async () => {
      const gpsMatch = String(driver.shipping_address || '').match(/\[?GPS:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)\]?/i) || String(driver.shipping_address || '').match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/i);
      if (gpsMatch) {
        return { lat: parseFloat(gpsMatch[1]), lng: parseFloat(gpsMatch[2]) };
      }
      if (MAPBOX_TOKEN) {
        try {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(driver.shipping_address)}.json?access_token=${MAPBOX_TOKEN}&country=PK&proximity=74.3587,31.5204&limit=1`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.features && data.features.length > 0) {
              const [lng, lat] = data.features[0].center;
              return { lat, lng };
            }
          }
        } catch (e) {}
      }
      return null;
    };

    getDestCoords().then((dest) => {
      if (!dest) return;
      destCoordsRef.current[orderId] = dest;
      ensureDestMarker(orderId, dest);
      drawDirectionsRoute(orderId, driverPos, dest);
    });
  }, [updateRemainingRoute, drawDirectionsRoute, drawRouteOnMap, ensureDestMarker]);

  const updateMapMarkers = useCallback((driverList) => {
    if (!mapRef.current) return;
    const activeIds = new Set(driverList.map(d => String(d.order_id)));

    Object.keys(markersRef.current).forEach(id => {
      if (!activeIds.has(id)) {
        if (markersRef.current[id]) markersRef.current[id].remove();
        delete markersRef.current[id];
        delete routePathRef.current[id];
        delete routeLastDrawRef.current[id];
        routeDrawnRef.current.delete(id);

        if (destMarkersRef.current[id]) destMarkersRef.current[id].remove();
        delete destMarkersRef.current[id];

        const map = mapRef.current;
        if (map) {
          if (map.getLayer(`route-glow-${id}`)) map.removeLayer(`route-glow-${id}`);
          if (map.getLayer(`route-line-${id}`)) map.removeLayer(`route-line-${id}`);
          if (map.getSource(`route-source-${id}`)) map.removeSource(`route-source-${id}`);
        }
      }
    });

    driverList.forEach(driver => {
      const orderId = String(driver.order_id);
      const pos = { lat: parseFloat(driver.latitude), lng: parseFloat(driver.longitude) };
      const h = parseFloat(driver.heading || 0), spd = parseFloat(driver.speed || 0);
      const color = getDriverColor(orderId).main;

      if (markersRef.current[orderId]) {
        markersRef.current[orderId].setLngLat([pos.lng, pos.lat]);
        if (Math.abs(h - (previousHeadingsRef.current[orderId] || 0)) > 3) {
          const img = markersRef.current[orderId].getElement().querySelector('img');
          if (img) img.src = createCarIcon(h, spd, color);
          previousHeadingsRef.current[orderId] = h;
        }
      } else {
        const el = document.createElement('div');
        el.className = 'cursor-pointer';
        el.innerHTML = `<img src="${createCarIcon(h, spd, color)}" style="width: 52px; height: 52px;" />`;

        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([pos.lng, pos.lat])
          .addTo(mapRef.current);

        el.addEventListener('click', () => {
          setSelectedOrder(driver.order_id);
          autoFollowRef.current = true;
          const ei = driverETAs[orderId];
          const popupContent = `
            <div style="padding:10px;min-width:200px;font-family:Inter,sans-serif">
              <p style="margin:0 0 4px;font-weight:800;color:${color}">🚚 ${driver.driver_name}</p>
              <p style="font-size:12px;margin:2px 0">Order #${driver.order_id}</p>
              ${ei ? `
                <div style="margin-top:6px;padding:6px;background:#eff6ff;border-radius:6px">
                  <p style="margin:0;font-weight:700;color:#1e40af;font-size:12px">📍 ${ei.distance || ''} — ${ei.eta || ''}</p>
                  ${ei.arrivalTime ? `<p style="margin:2px 0 0;font-size:11px;color:#3b82f6">Arrives ${ei.arrivalTime}</p>` : ''}
                </div>
              ` : ''}
            </div>
          `;

          if (popupRef.current) popupRef.current.remove();
          popupRef.current = new mapboxgl.Popup({ offset: 25 })
            .setLngLat([pos.lng, pos.lat])
            .setHTML(popupContent)
            .addTo(mapRef.current);
        });

        markersRef.current[orderId] = marker;
        previousHeadingsRef.current[orderId] = h;
      }
    });

    if (!selectedOrder && driverList.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      driverList.forEach(d => bounds.extend([parseFloat(d.longitude), parseFloat(d.latitude)]));
      mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 15 });
    }
  }, [selectedOrder, driverETAs]);

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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [socketConnected, fetchDriverETA, updateMapMarkers]);

  const fetchOrderTrail = useCallback(async (orderId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/get_driver_location.php?order_id=${orderId}`);
      const data = await res.json();
      if (data.success) setOrderDetail(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchDriverLocations();
    const i = setInterval(() => { if (!document.hidden) fetchDriverLocations(); }, 20000);
    return () => clearInterval(i);
  }, [fetchDriverLocations]);

  useEffect(() => {
    if (!selectedOrder) return;
    fetchOrderTrail(selectedOrder);
    const i = setInterval(() => { if (!document.hidden) fetchOrderTrail(selectedOrder); }, 15000);
    return () => clearInterval(i);
  }, [selectedOrder, fetchOrderTrail]);

  // Main Map Initialization
  useEffect(() => {
    if (activeTab !== 'live' || !mapContainerRef.current) return;

    if (MAPBOX_TOKEN) {
      mapboxgl.accessToken = MAPBOX_TOKEN;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: getMapStyle(),
      center: [74.3587, 31.5204],
      zoom: 13,
      attributionControl: false
    });

    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    map.on('load', () => {
      setMapReady(true);
      map.resize();
    });

    map.on('error', (e) => {
      console.warn('Mapbox GL error event:', e);
    });

    let resizeObserver = null;
    if (typeof window !== 'undefined' && window.ResizeObserver && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) mapRef.current.resize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    const resizeTimers = [50, 150, 300, 600, 1000, 1500].map(delay =>
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

      Object.values(markersRef.current).forEach(m => { if (m) m.remove(); });
      Object.values(destMarkersRef.current).forEach(m => { if (m) m.remove(); });
      markersRef.current = {};
      destMarkersRef.current = {};
      routeDrawnRef.current.clear();
      setMapReady(false);
      try {
        map.remove();
      } catch {}
      mapRef.current = null;
    };
  }, [activeTab]);

  // Sync markers and routes whenever map becomes ready or drivers update
  useEffect(() => {
    if (!mapReady || !mapRef.current || drivers.length === 0) return;
    updateMapMarkers(drivers);
    drivers.forEach(driver => {
      const orderId = String(driver.order_id);
      const dest = destCoordsRef.current[orderId];
      if (dest) {
        ensureDestMarker(orderId, dest);
        if (routePathRef.current[orderId]) {
          const color = getDriverColor(orderId);
          drawRouteOnMap(orderId, { type: 'LineString', coordinates: routePathRef.current[orderId] }, color);
        }
      }
      if (driver.shipping_address) {
        fetchDriverETA(driver);
      }
    });
  }, [mapReady, drivers, updateMapMarkers, ensureDestMarker, drawRouteOnMap, fetchDriverETA]);

  // Update selected driver trail layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (orderDetail?.trail?.length > 1) {
      const coords = orderDetail.trail.map(p => [parseFloat(p.longitude), parseFloat(p.latitude)]);
      const geojson = {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords }
      };

      if (map.getSource('trail-source')) {
        map.getSource('trail-source').setData(geojson);
      } else if (map.isStyleLoaded()) {
        map.addSource('trail-source', { type: 'geojson', data: geojson });
        map.addLayer({
          id: 'trail-line',
          type: 'line',
          source: 'trail-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#64748b', 'line-width': 4, 'line-opacity': 0.7 }
        });
      }
    } else {
      if (map.getLayer('trail-line')) map.removeLayer('trail-line');
      if (map.getSource('trail-source')) map.removeSource('trail-source');
    }
  }, [orderDetail, mapReady]);

  // geofence map
  useEffect(() => {
    if (activeTab !== 'geofence' || !geofenceMapContainerRef.current) return;

    if (MAPBOX_TOKEN) {
      mapboxgl.accessToken = MAPBOX_TOKEN;
    }

    const center = shopCoords ? [shopCoords.lng, shopCoords.lat] : [74.3587, 31.5204];

    const map = new mapboxgl.Map({
      container: geofenceMapContainerRef.current,
      style: getMapStyle(),
      center,
      zoom: 12,
      attributionControl: false
    });

    geofenceMapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    const renderGeofenceContent = () => {
      try {
        const c = shopCoords || { lat: 31.5204, lng: 74.3587 };

        // Clean previous markers
        geofenceMarkersRef.current.forEach(m => { try { m.remove(); } catch {} });
        geofenceMarkersRef.current = [];

        // Shop marker
        const shopEl = document.createElement('div');
        shopEl.innerHTML = `<img src="${createDestIcon('#7c3aed', '🏪')}" style="width: 40px; height: 52px;" />`;
        const shopMarker = new mapboxgl.Marker({ element: shopEl, anchor: 'bottom' })
          .setLngLat([c.lng, c.lat])
          .addTo(map);
        geofenceMarkersRef.current.push(shopMarker);

        // Geofence circle polygon layer
        const circleGeoJSON = createGeoJSONCircle(c, geofenceRadius);
        if (map.getSource('geofence-source')) {
          map.getSource('geofence-source').setData(circleGeoJSON);
        } else {
          map.addSource('geofence-source', { type: 'geojson', data: circleGeoJSON });
          map.addLayer({
            id: 'geofence-fill',
            type: 'fill',
            source: 'geofence-source',
            paint: { 'fill-color': '#7c3aed', 'fill-opacity': geofenceEnabled ? 0.15 : 0.03 }
          });
          map.addLayer({
            id: 'geofence-border',
            type: 'line',
            source: 'geofence-source',
            paint: { 'line-color': '#7c3aed', 'line-width': 2, 'line-opacity': geofenceEnabled ? 0.8 : 0.25 }
          });
        }

        // Active driver pins
        drivers.forEach(d => {
          const dPos = { lat: parseFloat(d.latitude), lng: parseFloat(d.longitude) };
          if (isNaN(dPos.lat) || isNaN(dPos.lng)) return;
          const distFromShop = computeDistanceBetween(c, dPos);
          const isOutside = distFromShop > geofenceRadius;
          const color = getDriverColor(String(d.order_id)).main;

          const dEl = document.createElement('div');
          dEl.className = 'cursor-pointer';
          dEl.innerHTML = `<div style="position:relative;">
            <img src="${createCarIcon(parseFloat(d.heading || 0), parseFloat(d.speed || 0), color)}" style="width: 42px; height: 42px;" />
            ${isOutside ? '<span style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:white;font-size:10px;font-weight:bold;border-radius:9999px;padding:1px 5px;box-shadow:0 1px 3px rgba(0,0,0,0.3);">!</span>' : ''}
          </div>`;

          const popup = new mapboxgl.Popup({ offset: 20 }).setHTML(`
            <div style="padding:6px;font-size:12px;font-family:Inter,sans-serif;">
              <strong>🚚 ${d.driver_name}</strong><br/>
              Order #${d.order_id}<br/>
              Distance: ${(distFromShop / 1000).toFixed(1)} km from shop<br/>
              ${isOutside ? '<span style="color:#ef4444;font-weight:bold;">⚠️ Outside Geofence Zone</span>' : '<span style="color:#16a34a;font-weight:bold;">✓ Inside Safe Zone</span>'}
            </div>
          `);

          const dMarker = new mapboxgl.Marker({ element: dEl, anchor: 'center' })
            .setLngLat([dPos.lng, dPos.lat])
            .setPopup(popup)
            .addTo(map);
          geofenceMarkersRef.current.push(dMarker);
        });
      } catch (err) {
        console.warn('Geofence render error:', err);
      }
    };

    if (map.isStyleLoaded()) {
      renderGeofenceContent();
    } else {
      map.on('load', renderGeofenceContent);
    }

    map.on('error', (e) => {
      console.warn('Geofence map error:', e);
    });

    let resizeObserver = null;
    if (typeof window !== 'undefined' && window.ResizeObserver && geofenceMapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (geofenceMapRef.current) geofenceMapRef.current.resize();
      });
      resizeObserver.observe(geofenceMapContainerRef.current);
    }

    const resizeTimers = [50, 150, 300, 600, 1000].map(delay =>
      setTimeout(() => {
        if (geofenceMapRef.current) geofenceMapRef.current.resize();
      }, delay)
    );

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      resizeTimers.forEach(clearTimeout);
      geofenceMarkersRef.current.forEach(m => { try { m.remove(); } catch {} });
      geofenceMarkersRef.current = [];
      try { map.remove(); } catch {}
      geofenceMapRef.current = null;
    };
  }, [activeTab, shopCoords, geofenceRadius, geofenceEnabled, drivers]);

  // Update geofence radius & status dynamically
  useEffect(() => {
    const map = geofenceMapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getSource('geofence-source')) return;

    const center = shopCoords || { lat: 31.5204, lng: 74.3587 };
    try {
      map.getSource('geofence-source').setData(createGeoJSONCircle(center, geofenceRadius));
      if (map.getLayer('geofence-fill')) {
        map.setPaintProperty('geofence-fill', 'fill-opacity', geofenceEnabled ? 0.15 : 0.03);
      }
      if (map.getLayer('geofence-border')) {
        map.setPaintProperty('geofence-border', 'line-opacity', geofenceEnabled ? 0.8 : 0.25);
      }
    } catch {}
  }, [geofenceRadius, geofenceEnabled, shopCoords]);

  // replay map
  useEffect(() => {
    if (activeTab !== 'replay' || !replayMapContainerRef.current) return;

    if (MAPBOX_TOKEN) {
      mapboxgl.accessToken = MAPBOX_TOKEN;
    }

    const map = new mapboxgl.Map({
      container: replayMapContainerRef.current,
      style: getMapStyle(),
      center: [74.3587, 31.5204],
      zoom: 13,
      attributionControl: false
    });

    replayMapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    map.on('load', () => {
      map.resize();
    });

    map.on('error', (e) => {
      console.warn('Replay map error:', e);
    });

    let resizeObserver = null;
    if (typeof window !== 'undefined' && window.ResizeObserver && replayMapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (replayMapRef.current) replayMapRef.current.resize();
      });
      resizeObserver.observe(replayMapContainerRef.current);
    }

    const resizeTimers = [50, 150, 300, 600, 1000].map(delay =>
      setTimeout(() => {
        if (replayMapRef.current) replayMapRef.current.resize();
      }, delay)
    );

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      resizeTimers.forEach(clearTimeout);
      clearInterval(replayIntervalRef.current);
      if (replayMarkerRef.current) {
        try { replayMarkerRef.current.remove(); } catch {}
        replayMarkerRef.current = null;
      }
      replayMarkersRef.current.forEach(m => { try { m.remove(); } catch {} });
      replayMarkersRef.current = [];
      try { map.remove(); } catch {}
      replayMapRef.current = null;
    };
  }, [activeTab]);

  const fetchReplay = async (passedId) => {
    const id = passedId !== undefined && typeof passedId !== 'object' ? String(passedId).trim() : replayOrderId.trim();
    if (!id) {
      toast.error('Please enter or select an Order ID');
      return;
    }
    setReplayOrderId(id);
    setReplayLoading(true); setReplayPlaying(false); setReplayIdx(0); setReplayTrail([]);
    clearInterval(replayIntervalRef.current);

    if (replayMarkerRef.current) {
      try { replayMarkerRef.current.remove(); } catch {}
      replayMarkerRef.current = null;
    }
    replayMarkersRef.current.forEach(m => { try { m.remove(); } catch {} });
    replayMarkersRef.current = [];

    try {
      const res = await fetch(`${API_BASE_URL}/get_driver_location.php?order_id=${id}`);
      const data = await res.json();
      const points = data.trail || [];

      let trail = points.map(p => ({
        lat: parseFloat(p.latitude),
        lng: parseFloat(p.longitude),
        heading: parseFloat(p.heading || 0),
        created_at: p.created_at
      })).filter(p => !isNaN(p.lat) && !isNaN(p.lng) && p.lat !== 0);

      // Single location fallback if trail has no intermediate logs
      if (trail.length === 0 && data.location?.latitude) {
        trail = [{
          lat: parseFloat(data.location.latitude),
          lng: parseFloat(data.location.longitude),
          heading: parseFloat(data.location.heading || 0),
          created_at: data.location.created_at
        }];
      }

      if (!data.success || trail.length === 0) {
        toast.error('No GPS coordinates found for Order #' + id);
        setReplayLoading(false);
        return;
      }

      setReplayTrail(trail);

      const map = replayMapRef.current;
      if (map) {
        const coords = trail.map(p => [p.lng, p.lat]);
        const bounds = new mapboxgl.LngLatBounds();
        coords.forEach(c => bounds.extend(c));

        // Check if shipping address GPS is available to include in bounds
        const addrGps = String(data.location?.shipping_address || '').match(/\[?GPS:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)\]?/i);
        if (addrGps) {
          bounds.extend([parseFloat(addrGps[2]), parseFloat(addrGps[1])]);
        }

        map.fitBounds(bounds, { padding: 80, maxZoom: 16 });

        const geojson = {
          type: 'Feature',
          properties: {},
          geometry: coords.length > 1 ? { type: 'LineString', coordinates: coords } : { type: 'Point', coordinates: coords[0] }
        };

        const applyReplayLayers = () => {
          try {
            if (map.getSource('replay-route-source')) {
              map.getSource('replay-route-source').setData(geojson);
            } else {
              map.addSource('replay-route-source', { type: 'geojson', data: geojson });
              map.addLayer({
                id: 'replay-route-glow',
                type: 'line',
                source: 'replay-route-source',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#7c3aed', 'line-width': 10, 'line-opacity': 0.25 }
              });
              map.addLayer({
                id: 'replay-route-line',
                type: 'line',
                source: 'replay-route-source',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#9333ea', 'line-width': 4, 'line-opacity': 0.85 }
              });
            }
          } catch (e) {
            console.warn('Replay layer error:', e);
          }
        };

        if (map.isStyleLoaded()) {
          applyReplayLayers();
        } else {
          map.once('load', applyReplayLayers);
        }

        // Start point marker
        const startEl = document.createElement('div');
        startEl.innerHTML = `<img src="${createDestIcon('#16a34a', 'A')}" style="width: 30px; height: 42px;" />`;
        const startMarker = new mapboxgl.Marker({ element: startEl, anchor: 'bottom' })
          .setLngLat([trail[0].lng, trail[0].lat])
          .addTo(map);
        replayMarkersRef.current.push(startMarker);

        // Destination flag marker if shipping address GPS is available
        if (addrGps) {
          const destLat = parseFloat(addrGps[1]), destLng = parseFloat(addrGps[2]);
          const destEl = document.createElement('div');
          destEl.innerHTML = `<img src="${createDestIcon('#ef4444', '🏁')}" style="width: 36px; height: 48px;" />`;
          const destMarker = new mapboxgl.Marker({ element: destEl, anchor: 'bottom' })
            .setLngLat([destLng, destLat])
            .addTo(map);
          replayMarkersRef.current.push(destMarker);
        } else if (trail.length > 1) {
          // Final delivery stop marker
          const endEl = document.createElement('div');
          endEl.innerHTML = `<img src="${createDestIcon('#ef4444', 'B')}" style="width: 30px; height: 42px;" />`;
          const endMarker = new mapboxgl.Marker({ element: endEl, anchor: 'bottom' })
            .setLngLat([trail[trail.length - 1].lng, trail[trail.length - 1].lat])
            .addTo(map);
          replayMarkersRef.current.push(endMarker);
        }

        // Animated driver marker
        const driverEl = document.createElement('div');
        driverEl.innerHTML = `<img src="${createCarIcon(trail[0].heading || 0, 5, '#9333ea')}" style="width: 50px; height: 50px;" />`;
        replayMarkerRef.current = new mapboxgl.Marker({ element: driverEl, anchor: 'center' })
          .setLngLat([trail[0].lng, trail[0].lat])
          .addTo(map);
      }

      toast.success(`Loaded ${trail.length} GPS points for Order #${id}`);
    } catch {
      toast.error('Failed to fetch replay data');
    } finally {
      setReplayLoading(false);
    }
  };

  const startReplay = () => {
    if (replayTrail.length === 0) return;
    setReplayPlaying(true);
    replayIntervalRef.current = setInterval(() => {
      setReplayIdx(prev => {
        const next = prev + 1;
        if (next >= replayTrail.length) {
          clearInterval(replayIntervalRef.current);
          setReplayPlaying(false);
          return prev;
        }
        const pt = replayTrail[next];
        if (replayMarkerRef.current) {
          replayMarkerRef.current.setLngLat([pt.lng, pt.lat]);
          const img = replayMarkerRef.current.getElement().querySelector('img');
          if (img) img.src = createCarIcon(pt.heading || 0, 10, '#9333ea');
        }
        if (replayMapRef.current) {
          replayMapRef.current.panTo([pt.lng, pt.lat]);
        }
        return next;
      });
    }, 600 / replaySpeed);
  };

  const pauseReplay = () => { clearInterval(replayIntervalRef.current); setReplayPlaying(false); };
  const resetReplay = () => {
    clearInterval(replayIntervalRef.current);
    setReplayPlaying(false); setReplayIdx(0);
    if (replayTrail[0] && replayMarkerRef.current) {
      replayMarkerRef.current.setLngLat([replayTrail[0].lng, replayTrail[0].lat]);
      replayMapRef.current?.panTo([replayTrail[0].lng, replayTrail[0].lat]);
    }
  };

  // 
  //  ROUTE PLANNER (Multi-Stop)
  // 
  useEffect(() => {
    if (activeTab !== 'planner') return;
    fetch(`${API_BASE_URL}/orders/admin_orders.php?status=active`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` } })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const filtered = (data.orders || []).filter(o => {
            if (!o.shipping_address) return false;
            const addr = String(o.shipping_address).toLowerCase().trim();
            if (
              addr.includes('pickup') ||
              addr.includes('store') ||
              addr.includes('shop') ||
              addr.includes('collect') ||
              addr.includes('self')
            ) {
              return false;
            }
            if (
              String(o.order_type || '').toLowerCase().includes('pickup') ||
              String(o.delivery_type || '').toLowerCase().includes('pickup') ||
              String(o.shipping_method || '').toLowerCase().includes('pickup')
            ) {
              return false;
            }
            return ['ready', 'out-for-delivery', 'processing', 'shipped'].includes(o.status);
          });
          setPlannerOrders(filtered);
        }
      }).catch(() => {});

    if (!plannerMapContainerRef.current) return;

    if (MAPBOX_TOKEN) {
      mapboxgl.accessToken = MAPBOX_TOKEN;
    }

    const map = new mapboxgl.Map({
      container: plannerMapContainerRef.current,
      style: getMapStyle(),
      center: [74.3587, 31.5204],
      zoom: 13,
      attributionControl: false
    });

    plannerMapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    map.on('load', () => {
      setPlannerMapReady(true);
      map.resize();
    });

    map.on('error', (e) => {
      console.warn('Planner map error:', e);
    });

    let resizeObserver = null;
    if (typeof window !== 'undefined' && window.ResizeObserver && plannerMapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (plannerMapRef.current) plannerMapRef.current.resize();
      });
      resizeObserver.observe(plannerMapContainerRef.current);
    }

    const resizeTimers = [50, 150, 300, 600, 1000].map(delay =>
      setTimeout(() => {
        if (plannerMapRef.current) plannerMapRef.current.resize();
      }, delay)
    );

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      resizeTimers.forEach(clearTimeout);
      plannerMarkersRef.current.forEach(m => { try { m.remove(); } catch {} });
      plannerMarkersRef.current = [];
      try { map.remove(); } catch {}
      plannerMapRef.current = null;
      setPlannerMapReady(false);
    };
  }, [activeTab]);

  const calculateOptimalRoute = async () => {
    if (plannerSelected.length < 2 || !plannerMapRef.current) return;
    setPlannerLoading(true);

    const map = plannerMapRef.current;
    plannerMarkersRef.current.forEach(m => { try { m.remove(); } catch {} });
    plannerMarkersRef.current = [];

    const geocodedStops = [];
    for (const order of plannerSelected) {
      let loc = null;
      if (order.delivery_latitude && order.delivery_longitude && parseFloat(order.delivery_latitude) !== 0) {
        loc = { lat: parseFloat(order.delivery_latitude), lng: parseFloat(order.delivery_longitude) };
      } else if (order.latitude && order.longitude && parseFloat(order.latitude) !== 0 && !isNaN(order.latitude)) {
        loc = { lat: parseFloat(order.latitude), lng: parseFloat(order.longitude) };
      } else {
        const gpsMatch = String(order.shipping_address || '').match(/\[?GPS:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)\]?/i) || String(order.shipping_address || '').match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/i);
        if (gpsMatch) {
          loc = { lat: parseFloat(gpsMatch[1]), lng: parseFloat(gpsMatch[2]) };
        } else if (MAPBOX_TOKEN) {
          try {
            const res = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(order.shipping_address)}.json?access_token=${MAPBOX_TOKEN}&country=PK&proximity=74.3587,31.5204&limit=1`
            );
            if (res.ok) {
              const data = await res.json();
              if (data.features && data.features.length > 0) {
                const [lng, lat] = data.features[0].center;
                loc = { lat, lng };
              }
            }
          } catch (e) {}
        }
      }

      if (!loc) {
        toast.error(`Could not locate address: ${order.shipping_address}`);
        setPlannerLoading(false);
        return;
      }
      geocodedStops.push(loc);
    }

    try {
      const coordStr = geocodedStops.map(p => `${p.lng},${p.lat}`).join(';');
      let routeData = null;

      if (MAPBOX_TOKEN) {
        try {
          const res = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${coordStr}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.routes && data.routes[0]) {
              routeData = data.routes[0];
            }
          }
        } catch (e) {
          console.warn('Mapbox directions error:', e);
        }
      }

      if (!routeData) {
        try {
          const osrmRes = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coordStr}?geometries=geojson&overview=full`
          );
          if (osrmRes.ok) {
            const data = await osrmRes.json();
            if (data.routes && data.routes[0]) {
              routeData = data.routes[0];
            }
          }
        } catch (e) {
          console.warn('OSRM directions error:', e);
        }
      }

      if (!routeData) {
        routeData = {
          geometry: {
            type: 'LineString',
            coordinates: geocodedStops.map(p => [p.lng, p.lat])
          },
          distance: 10000,
          duration: 1200,
          legs: []
        };
      }

      const geojson = {
        type: 'Feature',
        properties: {},
        geometry: routeData.geometry
      };

      const applyPlannerRoute = () => {
        try {
          if (map.getSource('planner-route-source')) {
            map.getSource('planner-route-source').setData(geojson);
          } else {
            map.addSource('planner-route-source', { type: 'geojson', data: geojson });
            map.addLayer({
              id: 'planner-route-glow',
              type: 'line',
              source: 'planner-route-source',
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: { 'line-color': '#1d4ed8', 'line-width': 12, 'line-opacity': 0.25 }
            });
            map.addLayer({
              id: 'planner-route-line',
              type: 'line',
              source: 'planner-route-source',
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: { 'line-color': '#2563eb', 'line-width': 5, 'line-opacity': 0.95 }
            });
          }
        } catch (e) {
          console.warn('Planner route draw error:', e);
        }
      };

      if (map.isStyleLoaded()) {
        applyPlannerRoute();
      } else {
        map.once('load', applyPlannerRoute);
      }

      // Add Numbered Stop Markers with rich Popups
      geocodedStops.forEach((stop, i) => {
        const order = plannerSelected[i];
        const stopEl = document.createElement('div');
        stopEl.className = 'cursor-pointer';
        stopEl.innerHTML = `<img src="${createDestIcon('#2563eb', String(i + 1))}" style="width: 36px; height: 48px;" />`;

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding:6px;font-size:12px;font-family:Inter,sans-serif;">
            <strong style="color:#2563eb;">Stop #${i + 1}</strong>: Order #${order.id}<br/>
            <strong>Customer:</strong> ${order.customer_name || 'N/A'}<br/>
            <strong>Address:</strong> ${order.shipping_address?.substring(0, 45) || 'N/A'}
          </div>
        `);

        const marker = new mapboxgl.Marker({ element: stopEl, anchor: 'bottom' })
          .setLngLat([stop.lng, stop.lat])
          .setPopup(popup)
          .addTo(map);
        plannerMarkersRef.current.push(marker);
      });

      // Fit bounds
      const bounds = new mapboxgl.LngLatBounds();
      geocodedStops.forEach(p => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 80, maxZoom: 16 });

      const totalDistKm = (routeData.distance / 1000).toFixed(1);
      const totalTimeMin = Math.round(routeData.duration / 60);

      const legs = (routeData.legs || []).map((leg, i) => ({
        duration: { text: `${Math.round(leg.duration / 60)} min` },
        end_address: plannerSelected[i + 1]?.shipping_address || `Stop ${i + 2}`
      }));

      setPlannerResult({
        totalDist: totalDistKm,
        totalTime: totalTimeMin,
        stops: plannerSelected,
        legs
      });

      toast.success(`Multi-stop route calculated: ${totalDistKm} km • ~${totalTimeMin} min`);
    } catch (err) {
      toast.error('Route calculation failed: ' + err.message);
    } finally {
      setPlannerLoading(false);
    }
  };

  // Helpers
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
    const orderId = String(driver.order_id);
    setSelectedOrder(driver.order_id);
    autoFollowRef.current = true;
    const pos = { lat: parseFloat(driver.latitude), lng: parseFloat(driver.longitude) };

    if (mapRef.current) {
      updateMapMarkers([driver]);
      const dest = destCoordsRef.current[orderId];
      if (dest) {
        ensureDestMarker(orderId, dest);
        if (routePathRef.current[orderId]) {
          const color = getDriverColor(orderId);
          drawRouteOnMap(orderId, { type: 'LineString', coordinates: routePathRef.current[orderId] }, color);
        }
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([pos.lng, pos.lat]);
        bounds.extend([dest.lng, dest.lat]);
        mapRef.current.fitBounds(bounds, { padding: 90, maxZoom: 16 });
      } else {
        mapRef.current.flyTo({ center: [pos.lng, pos.lat], zoom: 15 });
      }
    }

    if (driver.shipping_address) {
      fetchDriverETA(driver);
    }
  };

  const clearSelection = () => {
    setSelectedOrder(null);
    setOrderDetail(null);
    autoFollowRef.current = false;
    if (popupRef.current) popupRef.current.remove();

    const map = mapRef.current;
    if (map && drivers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      drivers.forEach(d => bounds.extend([parseFloat(d.longitude), parseFloat(d.latitude)]));
      map.fitBounds(bounds, { padding: 80 });
    }
  };

  const TABS = [
    { id: 'live', label: 'Live', icon: <Radio className="h-3.5 w-3.5" /> },
    { id: 'planner', label: 'Route Planner', icon: <Route className="h-3.5 w-3.5" /> },
    { id: 'replay', label: 'Replay', icon: <History className="h-3.5 w-3.5" /> },
    { id: 'geofence', label: 'Geofence', icon: <Shield className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-4 w-full min-w-0 overflow-x-hidden">
      <LiveTrackingHeader
        driversCount={drivers.length}
        completedCount={completedDeliveries.length}
        notifRef={notifRef}
        notifOpen={notifOpen}
        setNotifOpen={setNotifOpen}
        unreadCount={unreadCount}
        setUnreadCount={setUnreadCount}
        notifications={notifications}
        setNotifications={setNotifications}
        NOTIF_TYPES={NOTIF_TYPES}
        socketConnected={socketConnected}
        fetchDriverLocations={fetchDriverLocations}
        TABS={TABS}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* TAB: LIVE */}
      {activeTab === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full min-w-0">
          <div className="lg:col-span-2 min-w-0">
            <Card className="overflow-hidden gap-0">
              <div className="bg-gradient-to-r from-purple-600/10 to-blue-500/5 px-3 sm:px-4 py-2.5 flex items-center justify-between border-b gap-2 flex-wrap sm:flex-nowrap">
                <span className="text-xs sm:text-sm font-semibold flex items-center gap-2 truncate">
                  <MapPin className="h-4 w-4 text-purple-600 shrink-0" />
                  <span className="truncate">{selectedOrder ? `Order #${selectedOrder} — Live Route` : 'All Active Drivers'}</span>
                </span>
                <div className="flex gap-2 shrink-0">
                  {selectedOrder && autoFollowRef.current && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Target className="h-3 w-3" /> Following</span>}
                  {selectedOrder && <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={clearSelection}><ChevronLeft className="h-3 w-3" /> All</Button>}
                </div>
              </div>
              <div
                ref={mapContainerRef}
                className="relative z-0 overflow-hidden tracking-map-canvas"
              />
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

          <LiveTrackingSidebar
            drivers={drivers}
            loading={loading}
            completedDeliveries={completedDeliveries}
            driverETAs={driverETAs}
            routeProgress={routeProgress}
            nearDestination={nearDestination}
            liveCountdown={liveCountdown}
            selectedOrder={selectedOrder}
            getDriverColor={getDriverColor}
            formatSpeed={formatSpeed}
            fmtCountdown={fmtCountdown}
            focusDriver={focusDriver}
            copyTrackingLink={copyTrackingLink}
          />
        </div>
      )}

      {/* TAB: ROUTE PLANNER */}
      {activeTab === 'planner' && (
        <RoutePlannerTab
          plannerMapContainerRef={plannerMapContainerRef}
          plannerResult={plannerResult}
          plannerOrders={plannerOrders}
          plannerSelected={plannerSelected}
          setPlannerSelected={setPlannerSelected}
          plannerLoading={plannerLoading}
          calculateOptimalRoute={calculateOptimalRoute}
          onClearAll={() => {
            setPlannerSelected([]);
            plannerMarkersRef.current.forEach(m => m.remove());
            plannerMarkersRef.current = [];
            setPlannerResult(null);
          }}
        />
      )}

      {/* TAB: REPLAY */}
      {activeTab === 'replay' && (
        <RouteReplayTab
          replayMapContainerRef={replayMapContainerRef}
          replayTrail={replayTrail}
          replayPlaying={replayPlaying}
          startReplay={startReplay}
          pauseReplay={pauseReplay}
          resetReplay={resetReplay}
          replayIdx={replayIdx}
          replaySpeed={replaySpeed}
          setReplaySpeed={setReplaySpeed}
          replayOrderId={replayOrderId}
          setReplayOrderId={setReplayOrderId}
          fetchReplay={fetchReplay}
          replayLoading={replayLoading}
          drivers={drivers}
          completedDeliveries={completedDeliveries}
        />
      )}

      {/* TAB: GEOFENCE */}
      {activeTab === 'geofence' && (
        <GeofenceTab
          geofenceMapContainerRef={geofenceMapContainerRef}
          geofenceEnabled={geofenceEnabled}
          setGeofenceEnabled={setGeofenceEnabled}
          geofenceRadius={geofenceRadius}
          setGeofenceRadius={setGeofenceRadius}
          storeAddress={storeAddress}
          shopCoords={shopCoords}
          drivers={drivers}
          computeDistanceBetween={computeDistanceBetween}
        />
      )}
    </div>
  );
}

export default LiveTrackingMap;
