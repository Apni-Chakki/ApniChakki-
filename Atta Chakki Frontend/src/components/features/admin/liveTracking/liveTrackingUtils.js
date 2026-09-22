import { MAPBOX_TOKEN } from '../../../../config';

// Colors
export const ROUTE_COLORS = [
  { main: '#2563eb', glow: '#1e40af' },
  { main: '#16a34a', glow: '#14532d' },
  { main: '#9333ea', glow: '#6b21a8' },
  { main: '#ea580c', glow: '#9a3412' },
  { main: '#0891b2', glow: '#164e63' },
];

const colorCache = {};
let colorIdx = 0;

export function getDriverColor(orderId) {
  if (!colorCache[orderId]) {
    colorCache[orderId] = ROUTE_COLORS[colorIdx % ROUTE_COLORS.length];
    colorIdx++;
  }
  return colorCache[orderId];
}

// SVG Icons
export function createCarIcon(heading = 0, speed = 0, color = '#7c3aed') {
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

export function createDestIcon(color = '#ef4444', label = '') {
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

// Distance Helper (Haversine formula in meters)
export function computeDistanceBetween(p1, p2) {
  const R = 6371e3;
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const deltaLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const deltaLng = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GeoJSON Circle Helper for Geofence
export function createGeoJSONCircle(center, radiusInMeters, points = 64) {
  const km = radiusInMeters / 1000;
  const ret = [];
  const distanceX = km / (111.320 * Math.cos((center.lat * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ret.push([center.lng + x, center.lat + y]);
  }
  ret.push(ret[0]);

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ret]
    }
  };
}

export const isValidMapboxToken = Boolean(
  MAPBOX_TOKEN &&
  MAPBOX_TOKEN.startsWith('pk.') &&
  !MAPBOX_TOKEN.includes('demo_token') &&
  MAPBOX_TOKEN.length > 30
);

// Mapbox Style helper
export function getMapStyle() {
  if (isValidMapboxToken) {
    return 'mapbox://styles/mapbox/streets-v12';
  }
  return {
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
}

export function dedupeDrivers(list = []) {
  const m = new Map();
  list.forEach(d => {
    const id = String(d.order_id);
    const ex = m.get(id);
    if (!ex || new Date(d.created_at || 0) >= new Date(ex.created_at || 0)) m.set(id, d);
  });
  return Array.from(m.values());
}

export function formatArrivalTime(etaSeconds) {
  if (!etaSeconds) return null;
  return new Date(Date.now() + etaSeconds * 1000).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatSpeed(s) { return s > 0.5 ? `${(s * 3.6).toFixed(0)} km/h` : null; }

export function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((new Date() - d) / 1000);
  if (s < 10) return 'just now'; if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`; return `${Math.floor(s / 3600)}h ago`;
}

export function fmtCountdown(s) {
  if (!s || s <= 0) return '0:00';
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Notification types
export const NOTIF_TYPES = {
  STOPPED:   { icon: '🛑', color: 'bg-red-100 text-red-800',    label: 'Driver Stopped'    },
  OFF_ROUTE: { icon: '🗺️', color: 'bg-orange-100 text-orange-800', label: 'Off Route'      },
  LATE:      { icon: '⏰', color: 'bg-yellow-100 text-yellow-800', label: 'ETA Exceeded'   },
  SIGNAL:    { icon: '📵', color: 'bg-gray-100 text-gray-700',   label: 'Signal Lost'       },
  GEOFENCE:  { icon: '🛡️', color: 'bg-purple-100 text-purple-800', label: 'Geofence Alert' },
  ARRIVED:   { icon: '🎉', color: 'bg-green-100 text-green-800',  label: 'Near Destination' },
};
