import { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN } from '../../../../config';
import { createCarIcon, DEST_ICON_SVG } from './trackingMapIcons';

// all mapbox map logic: init, driver/destination markers, route drawing (mapbox -> osrm -> straight line), 25s refresh, resize
export function useTrackingMap({
  orderInfo,
  driverLocation,
  destinationCoords,
  setEta,
  setDistance,
}) {
  const [mapReady, setMapReady] = useState(false);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const driverLocRef = useRef(null);
  const previousHeadingRef = useRef(0);
  const routeDrawnRef = useRef(false);

  // Keep driverLocRef in sync
  useEffect(() => {
    driverLocRef.current = driverLocation;
  }, [driverLocation]);

  // Route drawing — rasta draw karna aur time nikalna
  const drawRoute = useCallback(async () => {
    const loc = driverLocRef.current;
    if (!mapRef.current || !loc || !destinationCoords) return;

    try {
      let routeData = null;

      // mapbox se rasta lena
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

      // agar mapbox na chale to osrm se try karna
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
        // seedhi line draw karna agar rasta na mile
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
  }, [destinationCoords, setEta, setDistance]);

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

    const defaultCenter = driverLocRef.current
      ? [driverLocRef.current.lng, driverLocRef.current.lat]
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return { mapContainerRef, mapReady };
}

export default useTrackingMap;
