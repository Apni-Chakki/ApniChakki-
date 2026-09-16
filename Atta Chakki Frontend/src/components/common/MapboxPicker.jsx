import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN } from '../../config';
import { Search, MapPin, Navigation, Loader2, Crosshair } from 'lucide-react';
import { lookupLahoreLocation, LAHORE_BOUNDS, isWithinLahoreBounds, findNearestLahoreArea } from '../../utils/lahoreLocations';

const DEFAULT_CENTER = { lat: 31.5204, lng: 74.3587 }; // Lahore, Pakistan

const isValidToken = Boolean(
  MAPBOX_TOKEN &&
  MAPBOX_TOKEN.startsWith('pk.') &&
  !MAPBOX_TOKEN.includes('demo_token') &&
  MAPBOX_TOKEN.length > 30
);
const EFFECTIVE_TOKEN = isValidToken ? MAPBOX_TOKEN : '';

export function MapboxPicker({
  position = DEFAULT_CENTER,
  onPositionChange,
  onAddressChange,
  height = '350px',
  showSearch = true,
  interactive = true,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // callback refs
  const onPositionChangeRef = useRef(onPositionChange);
  const onAddressChangeRef = useRef(onAddressChange);
  useEffect(() => { onPositionChangeRef.current = onPositionChange; }, [onPositionChange]);
  useEffect(() => { onAddressChangeRef.current = onAddressChange; }, [onAddressChange]);

  // lat lng se address nikal rahe
  const reverseGeocode = useCallback(async (lat, lng) => {
    // mapbox se address search
    if (EFFECTIVE_TOKEN && !EFFECTIVE_TOKEN.includes('demo_token')) {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${EFFECTIVE_TOKEN}&language=en&country=PK`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.features && data.features.length > 0) {
            const specificFeature = data.features.find(f => {
              const types = f.place_type || [];
              const isGeneric = types.includes('place') || types.includes('region') || types.includes('country');
              const nameLower = (f.place_name || '').toLowerCase().trim();
              const isGenericCity = nameLower === 'lahore' || nameLower === 'lahore, punjab, pakistan' || nameLower === 'lahore, pakistan';
              return !isGeneric && !isGenericCity;
            });
            if (specificFeature) {
              return specificFeature.place_name;
            }
          }
        }
      } catch (err) {
        console.warn('Mapbox reverse geocode failed, trying fallback:', err);
      }
    }

    // agar mapbox na chale to openstreetmap se try karna
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`;
      const res = await fetch(url, { headers: { 'User-Agent': 'SuchiChakki-DeliveryApp/1.0' } });
      if (res.ok) {
        const data = await res.json();
        if (data && (data.address || data.display_name)) {
          const addr = data.address || {};
          const parts = [
            addr.amenity || addr.building,
            addr.road || addr.pedestrian,
            addr.neighbourhood || addr.suburb || addr.quarter || addr.residential,
            addr.city_district || addr.town || addr.city
          ].filter(Boolean);

          if (parts.length > 0) {
            return parts.slice(0, 3).join(', ') + ', Lahore';
          }
          if (data.display_name) {
            const split = data.display_name.split(',').map(s => s.trim());
            return split.slice(0, 3).join(', ');
          }
        }
      }
    } catch (err) {
      console.warn('OSM reverse geocode error:', err);
    }

    // agar dono fail ho jayein to lahore ki list se match karna
    const nearest = findNearestLahoreArea(lat, lng);
    if (nearest && nearest.name) {
      return nearest.name + ', Lahore';
    }

    return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }, []);

  const reverseGeocodeRef = useRef(reverseGeocode);
  useEffect(() => { reverseGeocodeRef.current = reverseGeocode; }, [reverseGeocode]);

  // forward geocoding: text search se lat lng nikalna
  const forwardGeocode = useCallback(async (query) => {
    if (!query || !query.trim()) return [];

    const q = query.trim();

    // pehle lahore dictionary check karna
    const localMatch = lookupLahoreLocation(q);
    const results = [];
    if (localMatch) {
      results.push({
        lat: localMatch.lat,
        lng: localMatch.lng,
        address: `${localMatch.name}, Lahore`,
        place_name: `${localMatch.name}, Lahore`,
        text: localMatch.name
      });
    }

    // mapbox search
    if (EFFECTIVE_TOKEN && !EFFECTIVE_TOKEN.includes('demo_token')) {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${EFFECTIVE_TOKEN}&country=PK&bbox=${LAHORE_BOUNDS.minLng},${LAHORE_BOUNDS.minLat},${LAHORE_BOUNDS.maxLng},${LAHORE_BOUNDS.maxLat}&limit=5&language=en`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.features && data.features.length > 0) {
            const mapboxResults = data.features
              .filter(f => isWithinLahoreBounds(f.center[1], f.center[0]))
              .map(f => ({
                lat: f.center[1],
                lng: f.center[0],
                address: f.place_name,
                place_name: f.place_name,
                text: f.text
              }));
            if (mapboxResults.length > 0) {
              return mapboxResults;
            }
          }
        }
      } catch (err) {
        console.warn('Mapbox forward geocode failed, trying fallback:', err);
      }
    }

    // agar mapbox na mile to openstreetmap search
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=5&addressdetails=1&accept-language=en&viewbox=${LAHORE_BOUNDS.minLng},${LAHORE_BOUNDS.maxLat},${LAHORE_BOUNDS.maxLng},${LAHORE_BOUNDS.minLat}&bounded=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'SuchiChakki-DeliveryApp/1.0' } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const valid = data.filter(item => isWithinLahoreBounds(parseFloat(item.lat), parseFloat(item.lon)));
          if (valid.length > 0) {
            return valid.map(item => ({
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              address: item.display_name.split(',').slice(0, 3).join(', '),
              place_name: item.display_name.split(',').slice(0, 3).join(', '),
              text: item.display_name.split(',')[0]
            }));
          }
        }
      }
    } catch (err) {
      console.warn('OSM forward geocode error:', err);
    }

    return results;
  }, []);

  // mapbox map setup karna
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    let resizeObserver = null;
    let resizeTimers = [];
    let handleWinResize = null;

    try {
      const initialLat = Number.isFinite(position?.lat) ? position.lat : DEFAULT_CENTER.lat;
      const initialLng = Number.isFinite(position?.lng) ? position.lng : DEFAULT_CENTER.lng;

      mapboxgl.accessToken = EFFECTIVE_TOKEN;

      const mapStyle = (EFFECTIVE_TOKEN && !EFFECTIVE_TOKEN.includes('demo_token'))
        ? 'mapbox://styles/mapbox/streets-v12'
        : {
            version: 8,
            sources: {
              'osm-tiles': {
                type: 'raster',
                tiles: [
                  'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
                ],
                tileSize: 256,
                attribution: '© OpenStreetMap Contributors'
              }
            },
            layers: [
              {
                id: 'osm-tiles',
                type: 'raster',
                source: 'osm-tiles',
                minzoom: 0,
                maxzoom: 19
              }
            ]
          };

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: mapStyle,
        center: [initialLng, initialLat],
        zoom: 14,
        interactive: interactive,
        attributionControl: false,
      });

      // navigation buttons
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');

      // map load hone par screen fit karna
      map.on('load', () => {
        map.resize();
      });

      // container resize hone par map bhi adjust ho
      if (typeof window !== 'undefined' && window.ResizeObserver && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (mapRef.current) {
            mapRef.current.resize();
          }
        });
        resizeObserver.observe(mapContainerRef.current);
      }

      // page layout banne tak resize check
      resizeTimers = [50, 150, 300, 500, 800, 1200].map(delay =>
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.resize();
          }
        }, delay)
      );

      handleWinResize = () => {
        if (mapRef.current) mapRef.current.resize();
      };
      window.addEventListener('resize', handleWinResize);

      // Create Custom Draggable Marker
      const markerEl = document.createElement('div');
      markerEl.className = 'custom-map-pin';
      markerEl.innerHTML = `
        <div style="
          width: 38px;
          height: 38px;
          background: #16a34a;
          border: 3px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
        ">
          <div style="
            width: 12px;
            height: 12px;
            background: white;
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>
      `;

      const marker = new mapboxgl.Marker({
        element: markerEl,
        draggable: interactive,
        anchor: 'bottom'
      })
        .setLngLat([initialLng, initialLat])
        .addTo(map);

      // Handle Marker Drag
      const onMarkerDragEnd = async () => {
        const lngLat = marker.getLngLat();
        const newPos = { lat: lngLat.lat, lng: lngLat.lng };
        if (onPositionChangeRef.current) {
          onPositionChangeRef.current(newPos);
        }
        if (reverseGeocodeRef.current) {
          const addr = await reverseGeocodeRef.current(newPos.lat, newPos.lng);
          if (addr && onAddressChangeRef.current) {
            onAddressChangeRef.current(addr);
          }
        }
      };

      marker.on('dragend', onMarkerDragEnd);

      // Click anywhere on map to move marker
      if (interactive) {
        map.on('click', async (e) => {
          const { lng, lat } = e.lngLat;
          marker.setLngLat([lng, lat]);
          map.easeTo({ center: [lng, lat], duration: 400 });

          const newPos = { lat, lng };
          if (onPositionChangeRef.current) {
            onPositionChangeRef.current(newPos);
          }
          if (reverseGeocodeRef.current) {
            const addr = await reverseGeocodeRef.current(lat, lng);
            if (addr && onAddressChangeRef.current) {
              onAddressChangeRef.current(addr);
            }
          }
        });
      }

      mapRef.current = map;
      markerRef.current = marker;

    } catch (e) {
      console.warn('Mapbox map initialization error:', e);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (Array.isArray(resizeTimers)) {
        resizeTimers.forEach(clearTimeout);
      }
      if (handleWinResize) {
        window.removeEventListener('resize', handleWinResize);
      }

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Sync external position changes to map & marker (ONLY when lat/lng numbers differ)
  const posLat = position?.lat;
  const posLng = position?.lng;

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !posLat || !posLng) return;
    const currentLngLat = markerRef.current.getLngLat();
    const isDifferent =
      Math.abs(currentLngLat.lat - posLat) > 0.0001 ||
      Math.abs(currentLngLat.lng - posLng) > 0.0001;

    if (isDifferent) {
      markerRef.current.setLngLat([posLng, posLat]);
      mapRef.current.easeTo({ center: [posLng, posLat], duration: 500 });
    }
    mapRef.current.resize();
  }, [posLat, posLng]);

  // Handle Search Execution
  const executeSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await forwardGeocode(searchQuery);
    setSearchResults(results);
    setShowDropdown(results.length > 0);
    setIsSearching(false);

    if (results.length > 0) {
      selectSearchResult(results[0]);
    }
  };

  const selectSearchResult = (item) => {
    if (!mapRef.current || !markerRef.current) return;
    const { lat, lng, address } = item;

    markerRef.current.setLngLat([lng, lat]);
    mapRef.current.flyTo({ center: [lng, lat], zoom: 16, essential: true });

    if (onPositionChangeRef.current) {
      onPositionChangeRef.current({ lat, lng });
    }
    if (onAddressChangeRef.current) {
      onAddressChangeRef.current(address);
    }
    setSearchQuery(address);
    setShowDropdown(false);
  };

  // Locate Me: Device GPS with progressive refinement
  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);

    let bestFix = null;
    let watchId = null;
    let settled = false;

    const applyFix = async (lat, lng) => {
      setIsLocating(false);
      if (mapRef.current && markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
        mapRef.current.flyTo({ center: [lng, lat], zoom: 17, essential: true });
      }
      if (onPositionChangeRef.current) {
        onPositionChangeRef.current({ lat, lng });
      }
      const addr = await reverseGeocode(lat, lng);
      if (addr && onAddressChangeRef.current) {
        onAddressChangeRef.current(addr);
        setSearchQuery(addr);
      }
    };

    const finalize = async () => {
      if (settled) return;
      settled = true;
      if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
      if (bestFix) {
        await applyFix(bestFix.lat, bestFix.lng);
      } else {
        setIsLocating(false);
      }
    };

    watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        if (!bestFix || accuracy < bestFix.accuracy) {
          bestFix = { lat, lng, accuracy };
        }
        if (accuracy < 100) {
          await finalize();
        }
      },
      (err) => {
        if (!settled) {
          settled = true;
          if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
          console.warn('Geolocation error:', err);
          if (bestFix) {
            applyFix(bestFix.lat, bestFix.lng);
          } else if (err.code !== 1) {
            // Retry with low accuracy for PCs
            navigator.geolocation.getCurrentPosition(
              async (pos2) => {
                await applyFix(pos2.coords.latitude, pos2.coords.longitude);
              },
              () => { setIsLocating(false); },
              { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
            );
          } else {
            setIsLocating(false);
          }
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    // Finalize after 5 seconds with best available fix
    setTimeout(() => { finalize(); }, 5000);
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50 flex flex-col">
      {/* Search & Action Bar (Optional) */}
      {showSearch && (
        <div className="p-3 bg-white border-b border-gray-100 flex items-center gap-2 relative z-20">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
              placeholder="Search area, landmark or street in Lahore..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all text-gray-800"
            />
            <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            {isSearching && (
              <Loader2 className="h-4 w-4 text-green-600 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
            )}
          </div>

          <button
            type="button"
            onClick={executeSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors shrink-0"
          >
            Search
          </button>

          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            title="Locate my position"
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center gap-1"
          >
            {isLocating ? (
              <Loader2 size={18} className="animate-spin text-green-600" style={{ width: '18px', height: '18px' }} />
            ) : (
              <Crosshair size={18} color="#15803d" strokeWidth={2.5} style={{ width: '18px', height: '18px', stroke: '#15803d' }} />
            )}
          </button>

          {/* Autocomplete Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-56 overflow-y-auto z-50">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectSearchResult(item)}
                  className="w-full text-left px-3 py-2.5 text-xs hover:bg-green-50 border-b border-gray-50 last:border-none flex items-start gap-2 text-gray-700 transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">{item.text}</p>
                    <p className="text-[11px] text-gray-500 truncate">{item.address}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map Container */}
      <div
        ref={mapContainerRef}
        style={{ height, minHeight: '220px', width: '100%' }}
        className="relative z-10 w-full flex-1"
      />

      {/* Helper Footer */}
      <div className="px-3 py-2 bg-white/95 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Drag marker to adjust location
        </span>
        <span className="font-medium text-gray-400">Mapbox GL</span>
      </div>
    </div>
  );
}

export default MapboxPicker;
