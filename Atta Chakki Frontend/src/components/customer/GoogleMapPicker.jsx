import { useEffect, useRef, useState, useCallback } from 'react';
import { GOOGLE_MAPS_API_KEY } from '../../config';

// ============================================================
// Google Maps Script Loader — Loads the API script dynamically
// ============================================================
let googleMapsLoadPromise = null;

function loadGoogleMapsScript() {
  if (googleMapsLoadPromise) return googleMapsLoadPromise;
  if (window.google && window.google.maps && window.google.maps.Map) return Promise.resolve();

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    // Use callback parameter — Google calls this when the API is FULLY ready
    const cbName = '__gmapsReady_' + Date.now();
    window[cbName] = () => {
      delete window[cbName];
      resolve();
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker&loading=async&callback=${cbName}`;
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
// GoogleMapPicker Component
// A draggable marker on Google Maps with Places Autocomplete
// ============================================================
export function GoogleMapPicker({ position, onPositionChange, onAddressChange, height = '350px' }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Stable callback refs
  const onPositionChangeRef = useRef(onPositionChange);
  const onAddressChangeRef = useRef(onAddressChange);
  useEffect(() => { onPositionChangeRef.current = onPositionChange; }, [onPositionChange]);
  useEffect(() => { onAddressChangeRef.current = onAddressChange; }, [onAddressChange]);

  // Reverse geocode — Nominatim (FREE) primary, Google client-side fallback
  const reverseGeocode = useCallback(async (lat, lng) => {
    // ── 1. Try Nominatim (FREE — no billing needed) ──
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'ApniChakki-DeliveryApp/1.0' }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name) {
          const addr = data.address;
          if (addr) {
            const parts = [
              addr.house_number, addr.road,
              addr.neighbourhood || addr.suburb,
              addr.city || addr.town || addr.village,
              addr.state, addr.country
            ].filter(Boolean);
            if (parts.length >= 3) return parts.join(', ');
          }
          return data.display_name;
        }
      }
    } catch (e) {
      console.warn('Nominatim reverse geocode failed:', e);
    }

    // ── 2. Fallback to Google client-side Geocoder ──
    if (!window.google) return null;
    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      if (response.results && response.results.length > 0) {
        const bestResult = response.results.find(r => 
          !r.types.includes('plus_code') && r.formatted_address
        ) || response.results[0];
        return bestResult.formatted_address;
      }
    } catch (e) {
      console.warn('Google reverse geocode fallback failed:', e);
    }
    return null;
  }, []);

  const forwardGeocode = useCallback(async (query) => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return null;

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(normalizedQuery)}&limit=1&addressdetails=1&accept-language=en`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'ApniChakki-DeliveryApp/1.0' }
      });

      if (response.ok) {
        const results = await response.json();
        if (Array.isArray(results) && results.length > 0) {
          const firstResult = results[0];
          const lat = parseFloat(firstResult.lat);
          const lng = parseFloat(firstResult.lon);

          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            return {
              lat,
              lng,
              address: firstResult.display_name || normalizedQuery,
            };
          }
        }
      }
    } catch (error) {
      console.warn('Nominatim forward geocode failed:', error);
    }

    if (!window.google?.maps?.Geocoder) return null;

    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ address: normalizedQuery });
      if (response.results && response.results.length > 0) {
        const bestResult = response.results[0];
        const location = bestResult.geometry?.location;
        if (location) {
          return {
            lat: location.lat(),
            lng: location.lng(),
            address: bestResult.formatted_address || normalizedQuery,
          };
        }
      }
    } catch (error) {
      console.warn('Google forward geocode failed:', error);
    }

    return null;
  }, []);

  const handleSearch = useCallback(async () => {
    const result = await forwardGeocode(searchQuery);
    if (!result || !mapRef.current || !markerRef.current) return;

    const newPos = { lat: result.lat, lng: result.lng };
    mapRef.current.setCenter(newPos);
    mapRef.current.setZoom(18);
    markerRef.current.position = newPos;

    if (onPositionChangeRef.current) {
      onPositionChangeRef.current(newPos);
    }
    if (onAddressChangeRef.current) {
      onAddressChangeRef.current(result.address);
    }
  }, [forwardGeocode, searchQuery]);

  // Initialize the map
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setMapError('Google Maps API key not configured');
      return;
    }

    let isMounted = true;

    loadGoogleMapsScript()
      .then(() => {
        if (!isMounted || !mapContainerRef.current) return;

        const center = position
          ? { lat: position.lat, lng: position.lng }
          : { lat: 31.5204, lng: 74.3587 }; // Lahore fallback

        // Create the map
        const map = new window.google.maps.Map(mapContainerRef.current, {
          center,
          zoom: 17,
          mapId: 'DEMO_MAP_ID',
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: window.google.maps.ControlPosition.TOP_RIGHT,
            mapTypeIds: ['roadmap', 'satellite', 'hybrid'],
          },
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          gestureHandling: 'greedy',
        });

        mapRef.current = map;

        const { AdvancedMarkerElement, PinElement } = window.google.maps.marker;
        const pinElement = new PinElement({
          background: '#dc2626',
          borderColor: '#991b1b',
          glyphColor: '#ffffff',
        });

        // Create draggable marker
        const marker = new AdvancedMarkerElement({
          position: center,
          map,
          gmpDraggable: true,
          title: 'Drag to your exact location',
          content: pinElement,
        });

        markerRef.current = marker;

        // Handle marker drag
        marker.addListener('dragend', async () => {
          const pos = marker.position;
          if (!pos) return;
          const lat = pos.lat();
          const lng = pos.lng();
          
          if (onPositionChangeRef.current) {
            onPositionChangeRef.current({ lat, lng });
          }

          // Reverse geocode the new position
          const addr = await reverseGeocode(lat, lng);
          if (addr && onAddressChangeRef.current) {
            onAddressChangeRef.current(addr);
          }
        });

        // Handle map click — move marker to clicked location
        map.addListener('click', async (e) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          
          marker.position = e.latLng;

          if (onPositionChangeRef.current) {
            onPositionChangeRef.current({ lat, lng });
          }

          const addr = await reverseGeocode(lat, lng);
          if (addr && onAddressChangeRef.current) {
            onAddressChangeRef.current(addr);
          }
        });

        setMapLoaded(true);
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Google Maps load error:', err);
          setMapError('Failed to load Google Maps');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []); // Only run once on mount

  // Update marker position when parent passes new coords
  useEffect(() => {
    if (mapRef.current && markerRef.current && position) {
      const newPos = { lat: position.lat, lng: position.lng };
      markerRef.current.position = newPos;
      mapRef.current.setCenter(newPos);
      mapRef.current.setZoom(17);
    }
  }, [position?.lat, position?.lng]);

  if (mapError) {
    return (
      <div 
        style={{ height, minHeight: '200px' }}
        className="rounded-xl bg-red-50 border-2 border-red-200 flex items-center justify-center"
      >
        <p className="text-sm text-red-600 text-center px-4">
          ⚠️ {mapError}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-primary/20 shadow-lg relative">
      {/* Search bar overlaid on the map — high z-index to stay above map controls */}
      <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', zIndex: 1000 }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Search your address here and press Enter..."
            style={{
              width: '100%',
              padding: '10px 16px',
              fontSize: '14px',
              borderRadius: '8px',
              border: '2px solid #e2e8f0',
              backgroundColor: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              outline: 'none',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#7c3aed'; }}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
          />
          <button
            type="button"
            onClick={handleSearch}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground shadow-md hover:opacity-90"
          >
            Search
          </button>
        </div>
      </div>

      {/* Map container */}
      <div 
        ref={mapContainerRef}
        style={{ height, minHeight: '250px', width: '100%', borderRadius: '10px' }}
      />

      {/* Loading overlay */}
      {!mapLoaded && (
        <div 
          style={{ height, minHeight: '250px' }}
          className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 flex flex-col items-center justify-center gap-3 rounded-xl"
        >
          <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-primary font-medium animate-pulse">Loading Google Maps...</p>
        </div>
      )}
    </div>
  );
}

export default GoogleMapPicker;
