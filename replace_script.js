const fs = require('fs');

const path = 'Atta Chakki Frontend/src/components/customer/Checkout.jsx';
let content = fs.readFileSync(path, 'utf8');

// Replace reverseGeocode
const replace1 = `const reverseGeocode = useCallback(async (lat, lng) => {
      try {
        if (!GOOGLE_MAPS_API_KEY) {
          console.error("Google Maps API Key is missing.");
          return null;
        }

        const apiUrl = \`https://maps.googleapis.com/maps/api/geocode/json?latlng=\${lat},\${lng}&key=\${GOOGLE_MAPS_API_KEY}&language=en\`;
        const response = await fetch(apiUrl);
        
        if (response.ok) {
          const data = await response.json();
          
          switch (data.status) {
            case 'OK':
              if (data.results && data.results.length > 0) {
                const bestResult = data.results.find(r => 
                  !r.types.includes('plus_code') && r.formatted_address
                ) || data.results[0];
                return bestResult.formatted_address;
              }
              break;
            case 'ZERO_RESULTS':
              console.warn('Google Maps API: ZERO_RESULTS for coordinates', lat, lng);
              break;
            case 'OVER_QUERY_LIMIT':
              console.error('Google Maps API: OVER_QUERY_LIMIT exceeded');
              toast.error(t('Location service temporarily unavailable (query limit).'));
              break;
            case 'REQUEST_DENIED':
              console.error('Google Maps API: REQUEST_DENIED. Check API Key configuration.');
              toast.error(t('Location service misconfigured.'));
              break;
            default:
              console.warn(\`Google Maps API error: \${data.status} - \${data.error_message || ''}\`);
          }
        } else {
          console.warn('Reverse geocode failed with HTTP status:', response.status);
        }
      } catch (e) {
        console.warn('Reverse geocode execution failed:', e);
      }
      return null;
    }, [t]);`;

// Regex finding the existing reverseGeocode
content = content.replace(/const reverseGeocode = useCallback\(async \(lat, lng\) => \{[\s\S]*?return null;\s*\}, \[\]\);/, replace1);

// Replace handleGetLocation
const replace2 = `const handleGetLocation = async () => {
    setLocationStatus(t('📡 Getting precise GPS fix...'));
    setGpsCoords(null);
    setShowMap(false);

    if (!GOOGLE_MAPS_API_KEY) {
      toast.error(t('Location service misconfigured (Missing API Key).'));
      setGpsCoords({ lat: FALLBACK_CENTER.lat, lng: FALLBACK_CENTER.lng, accuracy: 0 });
      setShowMap(true);
      setMapCenter([FALLBACK_CENTER.lat, FALLBACK_CENTER.lng]);
      return;
    }

    try {
      const response = await fetch(\`https://www.googleapis.com/geolocation/v1/geolocate?key=\${GOOGLE_MAPS_API_KEY}\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ considerIp: true })
      });
      
      const data = await response.json();

      if (response.ok) {
        const { lat, lng } = data.location;
        const accuracy = data.accuracy;
        
        setGpsCoords({ lat, lng, accuracy });
        setShowMap(true);
        setMapCenter([lat, lng]);
        setLocationStatus(\`✅ \${t('Location pinned')} (±\${Math.round(accuracy)}m)\`);
        
        const addr = await reverseGeocode(lat, lng);
        if (addr) {
          setAddress(addr);
          toast.success(t('Location captured! Drag the pin to adjust.'));
        } else {
          setAddress(\`Near GPS: \${lat.toFixed(5)}, \${lng.toFixed(5)}\`);
          toast.info(t('GPS pin saved. Please type your full address above.'));
        }
      } else {
        if (data.error) {
          switch (data.error.status) {
            case 'NOT_FOUND':
            case 'ZERO_RESULTS':
              toast.error(t('Could not determine location. Please drop the pin manually.'));
              break;
            case 'OVER_QUERY_LIMIT':
            case 'RESOURCE_EXHAUSTED':
              toast.error(t('Location service temporarily unavailable (query limit).'));
              break;
            case 'PERMISSION_DENIED':
            case 'REQUEST_DENIED':
              toast.error(t('Location service misconfigured.'));
              break;
            default:
              toast.error(t('Failed to fetch location. Drag the pin to your location.'));
          }
          console.error("Google Geolocation API Error:", data.error.message);
        }
        setGpsCoords({ lat: FALLBACK_CENTER.lat, lng: FALLBACK_CENTER.lng, accuracy: 0 });
        setShowMap(true);
        setMapCenter([FALLBACK_CENTER.lat, FALLBACK_CENTER.lng]);
        setLocationStatus(t('Drag the pin to your location'));
      }
    } catch (e) {
      console.error("Error calling Google Geolocation API:", e);
      toast.error(t('Network error fetching location. Drag the pin manually.'));
      setGpsCoords({ lat: FALLBACK_CENTER.lat, lng: FALLBACK_CENTER.lng, accuracy: 0 });
      setShowMap(true);
      setMapCenter([FALLBACK_CENTER.lat, FALLBACK_CENTER.lng]);
      setLocationStatus(t('Drag the pin to your location'));
    }
  };`;

// Because handleGetLocation spans a large area, finding it by string split or regex
const startIndex = content.indexOf('const handleGetLocation = () => {');
const endIndex = content.indexOf('// Form Submission', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.slice(0, startIndex) + replace2 + '\n\n  ' + content.slice(endIndex);
} else {
  console.log("Could not find handleGetLocation boundaries");
}

fs.writeFileSync(path, content, 'utf8');
console.log("Done");