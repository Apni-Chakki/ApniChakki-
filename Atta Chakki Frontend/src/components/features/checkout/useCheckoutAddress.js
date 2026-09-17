import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL, MAPBOX_TOKEN } from '../../../config';
import { lookupLahoreLocation, isWithinLahoreBounds, LAHORE_BOUNDS, findNearestLahoreArea } from '../../../utils/lahoreLocations';
import {
  FALLBACK_CENTER,
  SHOP_LOCATION,
  ROAD_DISTANCE_FACTOR,
  calculateDistance,
} from '../../../utils/checkoutHelpers';

const NON_LAHORE_CITIES = [
  'faisalabad', 'karachi', 'islamabad', 'rawalpindi', 'multan', 'gujranwala', 'peshawar', 
  'quetta', 'sialkot', 'hyderabad', 'sargodha', 'bahawalpur', 'sukkur', 'jhang', 'sheikhupura', 
  'kasur', 'okara', 'gujrat', 'mardan', 'abbottabad', 'murree', 'sahiwal', 'wah cantt', 'taxila',
  'dera ghazi khan', 'mirpur', 'muzaffarabad', 'gilgit', 'skardu', 'chaman', 'larkana', 'nawabshah'
];

export function useCheckoutAddress({ user, orderType, t }) {
  const [deliveryArea, setDeliveryArea] = useState('');
  const [houseDetails, setHouseDetails] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  const [addressSuggestion, setAddressSuggestion] = useState(null);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [isOutOfLahore, setIsOutOfLahore] = useState(false);

  const [deliveryConfig, setDeliveryConfig] = useState({ 
    base_fare: 50, 
    base_distance: 10, 
    per_km_rate: 10 
  });

  // Pre-fill user address if available
  useEffect(() => {
    if (user && user.role === 'customer' && user.address) {
      setHouseDetails(user.address);
    }
  }, [user]);

  // Fetch dynamic delivery rates
  useEffect(() => {
    const fetchDeliverySettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/get_delivery_settings.php`);
        const data = await res.json();
        if (data.success && data.settings) {
          setDeliveryConfig(data.settings);
        }
      } catch (err) {
        console.warn('Failed to load dynamic rates. Using default rates.');
      }
    };
    fetchDeliverySettings();
  }, []);

  // Calculate delivery fee and distance rules
  useEffect(() => {
    const calcDeliveryFee = async () => {
      if (orderType !== 'delivery') {
        setDeliveryFee(0);
        setIsOutOfLahore(false);
        return;
      }

      if (gpsCoords && !isOutOfLahore) {
        const straightDist = calculateDistance(
          SHOP_LOCATION.lat, SHOP_LOCATION.lng,
          gpsCoords.lat, gpsCoords.lng
        );
        const estimatedRoadDist = straightDist * ROAD_DISTANCE_FACTOR;

        const updateFee = (distVal) => {
          setDistanceKm(distVal);
          if (user?.vip_free_shipping) {
            setDeliveryFee(0);
            return;
          }
          let fee = deliveryConfig.base_fare;
          if (distVal > deliveryConfig.base_distance) {
            fee = deliveryConfig.base_fare + (Math.ceil(distVal - deliveryConfig.base_distance) * deliveryConfig.per_km_rate);
          }
          setDeliveryFee(fee);
        };

        if (MAPBOX_TOKEN) {
          try {
            const res = await fetch(
              `https://api.mapbox.com/directions/v5/mapbox/driving/${SHOP_LOCATION.lng},${SHOP_LOCATION.lat};${gpsCoords.lng},${gpsCoords.lat}?overview=false&access_token=${MAPBOX_TOKEN}`
            );
            if (res.ok) {
              const data = await res.json();
              if (data.routes && data.routes[0] && data.routes[0].distance) {
                updateFee(data.routes[0].distance / 1000);
              } else {
                updateFee(estimatedRoadDist);
              }
            } else {
              updateFee(estimatedRoadDist);
            }
          } catch (e) {
            console.warn('Mapbox directions failed, using estimate:', e);
            updateFee(estimatedRoadDist);
          }
        } else {
          updateFee(estimatedRoadDist);
        }
      } else {
        setDeliveryFee(user?.vip_free_shipping ? 0 : deliveryConfig.base_fare);
        setDistanceKm(0);
      }
    };
    calcDeliveryFee();
  }, [gpsCoords, isOutOfLahore, orderType, deliveryConfig, user?.vip_free_shipping]);

  const checkIsLahore = useCallback((text, lat, lng, addressComponents) => {
    const lt = parseFloat(lat);
    const lg = parseFloat(lng);
    const tStr = String(text || '').toLowerCase();
    
    if (NON_LAHORE_CITIES.some(city => tStr.includes(city))) {
      return false;
    }

    if (addressComponents && Array.isArray(addressComponents)) {
      for (const comp of addressComponents) {
        const compName = (comp.long_name || comp.short_name || '').toLowerCase();
        if (NON_LAHORE_CITIES.some(city => compName === city || compName.includes(city))) {
          return false;
        }
      }
    }

    if (!isNaN(lt) && !isNaN(lg)) {
      if (lt < 31.15 || lt > 31.80 || lg < 74.00 || lg > 74.60) {
        return false;
      }
    }

    return tStr.includes('lahore') || (!isNaN(lt) && !isNaN(lg) && lt >= 31.15 && lt <= 31.80 && lg >= 74.00 && lg <= 74.60);
  }, []);

  const reverseGeocode = useCallback(async (lat, lng) => {
    let inLahore = false;

    // 1. Try Mapbox Geocoding for a specific feature
    if (MAPBOX_TOKEN) {
      try {
        const apiUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=en`;
        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            const specificFeature = data.features.find(f => {
              const types = f.place_type || [];
              const isGeneric = types.includes('place') || types.includes('region') || types.includes('country');
              const nameLower = (f.place_name || '').toLowerCase().trim();
              const isGenericCity = nameLower === 'lahore' || nameLower === 'lahore, punjab, pakistan' || nameLower === 'lahore, pakistan';
              return !isGeneric && !isGenericCity;
            });

            if (specificFeature) {
              const formattedName = specificFeature.place_name;
              inLahore = checkIsLahore(formattedName, lat, lng, specificFeature.context);
              return { addressText: formattedName, inLahore };
            }
          }
        }
      } catch (e) { console.warn('Mapbox reverse geocode failed:', e); }
    }

    // 2. OpenStreetMap / Nominatim
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`;
      const response = await fetch(nominatimUrl, { headers: { 'User-Agent': 'ApniChakki-DeliveryApp/1.0' } });
      if (response.ok) {
        const data = await response.json();
        if (data && (data.address || data.display_name)) {
          inLahore = checkIsLahore(data.display_name, lat, lng, null);
          const addr = data.address || {};
          const localParts = [
            addr.amenity || addr.building,
            addr.road || addr.pedestrian,
            addr.neighbourhood || addr.suburb || addr.quarter || addr.residential || addr.commercial,
            addr.city_district || addr.town || addr.city
          ].filter(Boolean);

          let addressText = localParts.length > 0 ? localParts.join(', ') : data.display_name;
          const cleanName = addressText.toLowerCase().replace(/,?\s*(punjab|pakistan)/gi, '').trim();
          if (cleanName !== 'lahore' && cleanName.length > 3) {
            return { addressText, inLahore };
          }
        }
      }
    } catch (e) { console.warn('Nominatim failed:', e); }

    // Landmark check
    const nearest = findNearestLahoreArea(lat, lng, 2.5);
    if (nearest) {
      return { addressText: `Near ${nearest.name}`, inLahore: true };
    }

    return { 
      addressText: `Near GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, 
      inLahore: checkIsLahore('', lat, lng, null) 
    };
  }, [checkIsLahore]);

  const fallbackToManualLocation = useCallback(() => {
    setGpsCoords({ lat: FALLBACK_CENTER.lat, lng: FALLBACK_CENTER.lng, accuracy: 0 });
    setShowMap(true);
    setMapCenter([FALLBACK_CENTER.lat, FALLBACK_CENTER.lng]);
    setLocationStatus(t('Drag the pin to your general area'));
    setIsOutOfLahore(false);
  }, [t]);

  const processLocationFix = useCallback(async (lat, lng, accuracy) => {
    setGpsCoords({ lat, lng, accuracy });
    setShowMap(true);
    setMapCenter([lat, lng]);

    const { addressText, inLahore } = await reverseGeocode(lat, lng);
    setIsOutOfLahore(!inLahore);

    if (addressText) {
      setDeliveryArea(addressText);
      if (!houseDetails || houseDetails.trim() === '') {
        setHouseDetails(addressText);
      }
      setLocationStatus(inLahore ? `✅ ${t('Area updated')}` : `❌ ${t('Out of city service not available')}`);
      if (inLahore) toast.success(t('Area updated from your current location'));
    } else {
      const nearText = `Near GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setDeliveryArea(nearText);
      if (!houseDetails || houseDetails.trim() === '') {
        setHouseDetails(nearText);
      }
      setLocationStatus(inLahore ? `✅ ${t('Location pinned')}` : `❌ ${t('Out of city service not available')}`);
    }

    const isLowAccuracy = accuracy > 200; 

    if (isLowAccuracy) {
      if (accuracy > 1000) {
        setLocationStatus(`⚠️ ${t('Approximate location — Please refine by dragging the pin to your exact spot')}`);
      } else {
        setLocationStatus(`⚠️ ${t('Approximate location')} (±${Math.round(accuracy)}m) — ${t('Please refine on the map')}`);
      }
    } else {
      setLocationStatus(inLahore ? `✅ ${t('Location pinned')}` : `❌ ${t('Out of city service not available')}`);
    }
  }, [reverseGeocode, t, houseDetails]);

  // Initial location fix on mount/orderType=delivery
  useEffect(() => {
    if (orderType === 'delivery' && !deliveryArea && !gpsCoords) {
      let watchId = null;
      let settled = false;
      const initLocation = async () => {
        if (!navigator.geolocation) {
          setLocationStatus(t('Search area or pin on map'));
          return;
        }

        const isInsecureOrigin = typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        if (isInsecureOrigin) {
          setLocationStatus(`⚠️ ${t('Chrome blocks GPS on HTTP. Please search area or pin on map (HTTPS required for GPS).')}`);
          return;
        }

        try {
          if (navigator.permissions) {
            const permStatus = await navigator.permissions.query({ name: 'geolocation' });
            if (permStatus.state === 'denied') {
              setLocationStatus(`⚠️ ${t('Location blocked in Chrome settings. Tap lock icon beside URL to allow, or pin on map.')}`);
              return;
            }
          }
        } catch (_) {}

        setLocationStatus(`📡 ${t('Requesting your location...')}`);

        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude: lat, longitude: lng, accuracy } = position.coords;
            if (!settled) {
              settled = true;
              if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
              await processLocationFix(lat, lng, accuracy);
            }
          },
          (geoError) => {
            if (!settled) {
              settled = true;
              if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
              console.warn('Initial GPS unavailable:', geoError?.message, 'code:', geoError?.code);
              if (geoError?.code === 1) {
                setLocationStatus(`⚠️ ${t('Location access denied by browser. Please allow it in browser settings, or search/pin on the map.')}`);
              } else {
                setLocationStatus(t('Search area, use GPS button, or pin on map'));
              }
            }
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );

        setTimeout(() => {
          if (!settled && watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
            settled = true;
            setLocationStatus(t('Search area, use GPS button, or pin on map'));
          }
        }, 16000);
      };
      initLocation();

      return () => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
        }
      };
    }
  }, [orderType, deliveryArea, gpsCoords, processLocationFix, t]);

  const searchTypedAddress = async (queryOverride) => {
    const addressToSearch = typeof queryOverride === 'string' ? queryOverride : deliveryArea;
    if (!addressToSearch || addressToSearch.length < 3) return;
    setLocationStatus(`🔍 ${t('Verifying area on map...')}`);

    const lowerStr = addressToSearch.toLowerCase();
    const hasOtherCity = NON_LAHORE_CITIES.some(c => lowerStr.includes(c));

    let foundLocation = null;

    if (!hasOtherCity) {
      const localMatch = lookupLahoreLocation(addressToSearch);
      if (localMatch) {
        foundLocation = {
          lat: localMatch.lat,
          lng: localMatch.lng,
          isLahore: true,
          formatted: localMatch.name
        };
      }
    }

    if (!foundLocation) {
      const buildSearchQueries = (orig) => {
        const str = String(orig || '').trim();
        if (!str) return [];
        const queries = [];

        const addPak = (s) => {
          let tmp = s.trim();
          if (!tmp.toLowerCase().includes('pakistan')) tmp += ', Pakistan';
          return tmp;
        };
        const addLahorePak = (s) => {
          let tmp = s.trim();
          if (!hasOtherCity && !tmp.toLowerCase().includes('lahore')) tmp += ', Lahore';
          if (!tmp.toLowerCase().includes('pakistan')) tmp += ', Pakistan';
          return tmp;
        };

        const plusMatch = str.match(/([A-Z0-9]{4}\+[A-Z0-9]{2,3})/i);
        if (plusMatch && !hasOtherCity) {
          queries.push(`${plusMatch[1]}, Lahore, Pakistan`);
          queries.push(`${plusMatch[1]}, Pakistan`);
        } else if (plusMatch) {
          queries.push(`${plusMatch[1]}, Pakistan`);
        }

        queries.push(addLahorePak(str));
        queries.push(addPak(str));

        const noPlus = str.replace(/^[A-Z0-9]{4}\+[A-Z0-9]{2,3}(,\s*)?/i, '').trim();
        if (noPlus && noPlus !== str) {
          queries.push(addLahorePak(noPlus));
          queries.push(addPak(noPlus));
        }

        const parts = (noPlus || str).split(',').map(p => p.trim()).filter(p => {
          if (!p) return false;
          const lower = p.toLowerCase();
          if (lower.includes('pakistan') || lower.includes('lahore')) return false;
          if (/^\d+$/.test(p) || /^(house|ghar|makan|flat|apt|apartment|floor)\s*[#\-]?\s*\d/i.test(p)) return false;
          if (/^(street|gali|st\.?|lane)\s*[#\-]?\s*\d/i.test(p)) return false;
          return true;
        });

        if (parts.length > 0) {
          const lastPart = parts[parts.length - 1];
          queries.push(addLahorePak(lastPart));

          if (parts.length >= 2) {
            const lastTwo = parts.slice(-2).join(', ');
            queries.push(addLahorePak(lastTwo));
            queries.push(addLahorePak(parts[parts.length - 2]));
          }
        }

        return queries.filter((q, idx, arr) => q && q.length > 3 && arr.indexOf(q) === idx);
      };

      const queriesToTry = buildSearchQueries(addressToSearch);

      const scoreFeature = (feat, searchStr) => {
        let score = 0;
        const placeLower = (feat.place_name || '').toLowerCase();
        const textLower = (feat.text || '').toLowerCase();
        const searchLower = searchStr.toLowerCase().replace(/,?\s*(pakistan|lahore)\s*/gi, '').trim();
        const searchWords = searchLower.split(/[\s,]+/).filter(w => w.length > 2);

        const placeType = (feat.place_type || [])[0] || '';
        if (['neighborhood', 'locality', 'place'].includes(placeType)) score += 50;
        else if (['district', 'region'].includes(placeType)) score += 30;
        else if (placeType === 'address') score += 20;
        else if (placeType === 'poi') score += 5;

        for (const word of searchWords) {
          if (textLower.includes(word)) score += 25;
          if (placeLower.includes(word)) score += 10;
        }

        if (textLower === searchLower || textLower.includes(searchLower)) score += 40;
        if (feat.relevance) score += feat.relevance * 15;

        return score;
      };

      if (MAPBOX_TOKEN) {
        for (const q of queriesToTry) {
          try {
            const bboxParam = !hasOtherCity ? `&bbox=${LAHORE_BOUNDS.minLng},${LAHORE_BOUNDS.minLat},${LAHORE_BOUNDS.maxLng},${LAHORE_BOUNDS.maxLat}` : '';
            const apiUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MAPBOX_TOKEN}&country=PK&proximity=74.3587,31.5204&language=en&limit=5&types=neighborhood,locality,place,district,address,poi${bboxParam}`;
            const response = await fetch(apiUrl);
            const data = await response.json();
            if (data.features && data.features.length > 0) {
              const validFeatures = !hasOtherCity
                ? data.features.filter(f => isWithinLahoreBounds(f.center[1], f.center[0]))
                : data.features;

              if (validFeatures.length > 0) {
                let bestFeat = validFeatures[0];
                let bestScore = scoreFeature(bestFeat, addressToSearch);
                for (let i = 1; i < validFeatures.length; i++) {
                  const s = scoreFeature(validFeatures[i], addressToSearch);
                  if (s > bestScore) {
                    bestScore = s;
                    bestFeat = validFeatures[i];
                  }
                }

                const featName = (bestFeat.place_name || '').toLowerCase();
                const isCityCenterCoords = Math.abs(bestFeat.center[1] - 31.5656) < 0.01 && Math.abs(bestFeat.center[0] - 74.3141) < 0.01;
                const isCityLevel = featName.startsWith('lahore,') || featName === 'lahore' || bestFeat.place_type?.includes('place');
                const searchWords = addressToSearch.toLowerCase().replace(/,?\s*(pakistan|lahore)\s*/gi, '').trim().split(/[\s,]+/).filter(w => w.length > 2);
                const matchesSpecific = searchWords.some(w => featName.includes(w));
                const isGenericCity = !hasOtherCity && isCityLevel && isCityCenterCoords && !matchesSpecific;

                if (!isGenericCity) {
                  const [lng, lat] = bestFeat.center;
                  const isOfficiallyLahore = checkIsLahore(q || bestFeat.place_name, lat, lng, bestFeat.context);
                  foundLocation = { lat, lng, isLahore: isOfficiallyLahore, formatted: bestFeat.place_name };
                  break;
                }
              }
            }
          } catch (e) { console.warn('Mapbox forward geocode error:', e); }
        }
      }

      if (!foundLocation) {
        for (const q of queriesToTry) {
          try {
            const nominatimUrl = !hasOtherCity
              ? `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&viewbox=${LAHORE_BOUNDS.minLng},${LAHORE_BOUNDS.maxLat},${LAHORE_BOUNDS.maxLng},${LAHORE_BOUNDS.minLat}&bounded=1`
              : `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=pk`;
            const response = await fetch(nominatimUrl, { headers: { 'User-Agent': 'ApniChakki-DeliveryApp/1.0' } });
            const data = await response.json();
            if (data && data.length > 0) {
              const validItems = !hasOtherCity
                ? data.filter(item => isWithinLahoreBounds(parseFloat(item.lat), parseFloat(item.lon)))
                : data;

              if (validItems.length > 0) {
                const searchLower = addressToSearch.toLowerCase().replace(/,?\s*(pakistan|lahore)\s*/gi, '').trim();
                const searchWords = searchLower.split(/[\s,]+/).filter(w => w.length > 2);

                let bestResult = validItems[0];
                let bestScore = 0;
                for (const item of validItems) {
                  const dispLower = (item.display_name || '').toLowerCase();
                  let score = 0;
                  for (const word of searchWords) {
                    if (dispLower.includes(word)) score += 15;
                  }
                  if (['suburb', 'neighbourhood', 'residential', 'village'].includes(item.type)) score += 20;
                  else if (['administrative', 'town'].includes(item.type)) score += 15;
                  else if (['station', 'park', 'attraction'].includes(item.type)) score += 12;
                  if (score > bestScore) { bestScore = score; bestResult = item; }
                }

                const lat = parseFloat(bestResult.lat);
                const lng = parseFloat(bestResult.lon);
                const isOfficiallyLahore = checkIsLahore(q || bestResult.display_name, lat, lng, null);
                foundLocation = { lat, lng, isLahore: isOfficiallyLahore, formatted: bestResult.display_name };
                break;
              }
            }
          } catch (e) { console.warn('Nominatim forward geocode failed', e); }
        }
      }
    }

    if (foundLocation) {
      setGpsCoords({ lat: foundLocation.lat, lng: foundLocation.lng, accuracy: 50 });
      setMapCenter([foundLocation.lat, foundLocation.lng]);
      setShowMap(true);
      setDeliveryArea(addressToSearch);
      setIsOutOfLahore(!foundLocation.isLahore);
      setAddressSuggestion(null);

      if (foundLocation.isLahore) {
        setLocationStatus(`✅ ${t('Area verified & mapped!')}`);

        if (foundLocation.formatted) {
          const gParts = foundLocation.formatted.split(',').map(p => p.trim());
          const withoutCountry = gParts
            .filter(p => p.toLowerCase() !== 'pakistan' && !/^\d{5}$/.test(p))
            .join(', ');
          const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, '');
          if (withoutCountry && normalize(withoutCountry) !== normalize(addressToSearch)) {
            setAddressSuggestion({ corrected: withoutCountry, original: addressToSearch });
          }
        }
      } else {
        setLocationStatus(`❌ ${t('Out of city service not available')}`);
      }
    } else {
      if (!hasOtherCity) {
        setIsOutOfLahore(false);
        setLocationStatus(`⚠️ ${t("Can't find your area, select from map or try another nearest area.")}`);
      } else {
        setIsOutOfLahore(true);
        setLocationStatus(`❌ ${t('Out of city service not available')}`);
      }
    }
  };

  // Debounced address search
  useEffect(() => {
    if (orderType !== 'delivery') return;
    if (!houseDetails || houseDetails.trim().length < 6) return;
    if (houseDetails === deliveryArea) return;
    if (gpsCoords && gpsCoords.lat && gpsCoords.lng) return;

    setAddressSuggestion(null);

    const delayDebounceFn = setTimeout(() => {
      searchTypedAddress(houseDetails);
    }, 1800);

    return () => clearTimeout(delayDebounceFn);
  }, [houseDetails, orderType, deliveryArea, gpsCoords]);

  const handleMarkerDrag = useCallback(async (newPos) => {
    setGpsCoords(prev => ({ ...prev, lat: newPos.lat, lng: newPos.lng }));
    setLocationStatus(`📡 ${t('Fetching area...')}`);
    setAddressSuggestion(null);
    
    const { addressText, inLahore } = await reverseGeocode(newPos.lat, newPos.lng);
    
    setIsOutOfLahore(!inLahore);

    if (addressText) {
      setDeliveryArea(addressText);
      setHouseDetails(prev => (!prev || prev.trim() === '' || prev.toLowerCase().includes('lahore, punjab') ? addressText : prev));
      setLocationStatus(inLahore ? `✅ ${t('Area updated')}` : `❌ ${t('Out of city service not available')}`);
      if (inLahore) toast.success(t('Area updated from new pin location'));
    } else {
      const nearText = `Near GPS: ${newPos.lat.toFixed(5)}, ${newPos.lng.toFixed(5)}`;
      setDeliveryArea(nearText);
      setHouseDetails(prev => (!prev || prev.trim() === '' || prev.toLowerCase().includes('lahore, punjab') ? nearText : prev));
      setLocationStatus(inLahore ? `✅ ${t('Location pinned')}` : `❌ ${t('Out of city service not available')}`);
    }
  }, [reverseGeocode, t]);

  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      toast.error(t('Geolocation is not supported by your device'));
      fallbackToManualLocation();
      return;
    }

    const isInsecureOrigin = typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    if (isInsecureOrigin) {
      toast.error(t('Chrome blocks GPS on HTTP connections. Please use HTTPS or tap/drag on the map to pin your location.'), { duration: 8000 });
      setLocationStatus(`⚠️ ${t('GPS requires HTTPS on mobile Chrome. Search area or pin on map.')}`);
      return;
    }

    try {
      if (navigator.permissions) {
        const permStatus = await navigator.permissions.query({ name: 'geolocation' });
        if (permStatus.state === 'denied') {
          toast.error(t('Location permission is blocked in Chrome. Tap the lock (🔒) / settings icon next to the address bar -> Permissions -> Location -> Allow.'), { duration: 8000 });
          setLocationStatus(`⚠️ ${t('Blocked in Chrome — Tap lock icon in address bar, allow Location, then refresh.')}`);
          return;
        }
      }
    } catch (_) {}

    setLocationStatus(`📡 ${t('Getting precise GPS fix...')}`);

    let bestFix = null;
    let watchId = null;
    let fixTimeout = null;

    const finalize = async () => {
      if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
      if (fixTimeout) { clearTimeout(fixTimeout); fixTimeout = null; }
      if (bestFix) {
        await processLocationFix(bestFix.lat, bestFix.lng, bestFix.accuracy);
      }
    };

    watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        if (!bestFix || accuracy < bestFix.accuracy) {
          bestFix = { lat, lng, accuracy };
        }
        if (accuracy < 100) {
          await finalize();
        }
      },
      (geoError) => {
        if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
        if (fixTimeout) { clearTimeout(fixTimeout); fixTimeout = null; }
        console.warn('GPS watch error:', geoError);
        if (geoError.code === 1) {
          toast.error(t('Location permission denied. Please allow location access in your browser (click the lock icon in address bar) or drag the pin on the map.'), { duration: 8000 });
          setLocationStatus(`⚠️ ${t('Permission denied — Allow in browser settings or select on map')}`);
        } else if (bestFix) {
          processLocationFix(bestFix.lat, bestFix.lng, bestFix.accuracy);
        } else {
          toast.error(t('GPS timed out. Please tap or drag the pin on the map.'));
          fallbackToManualLocation();
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    fixTimeout = setTimeout(async () => {
      if (watchId !== null) {
        await finalize();
        if (!bestFix) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude: lat, longitude: lng, accuracy } = position.coords;
              await processLocationFix(lat, lng, accuracy);
            },
            (err2) => {
              if (err2.code === 1) {
                toast.error(t('Location permission denied. Enable in browser settings or use the map.'), { duration: 8000 });
                setLocationStatus(`⚠️ ${t('Permission denied — select on map')}`);
              } else {
                toast.error(t('GPS timed out. Please tap or drag the pin on the map.'));
                fallbackToManualLocation();
              }
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
          );
        }
      }
    }, 6000);
  };

  const handleHouseDetailsBlur = () => {
    if (houseDetails && houseDetails.trim().length > 5 && houseDetails !== deliveryArea) {
      searchTypedAddress(houseDetails);
    }
  };

  return {
    deliveryArea,
    setDeliveryArea,
    houseDetails,
    setHouseDetails,
    locationStatus,
    addressSuggestion,
    setAddressSuggestion,
    gpsCoords,
    setGpsCoords,
    showMap,
    mapCenter,
    deliveryFee,
    distanceKm,
    isOutOfLahore,
    setIsOutOfLahore,
    searchTypedAddress,
    handleMarkerDrag,
    handleGetLocation,
    handleHouseDetailsBlur,
  };
}
