import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Trash2, Building2, Smartphone, Banknote, Loader2, WalletCards, CreditCard, Shield, CheckCircle2, AlertCircle, TestTube2, Crosshair, Navigation, Calendar, Clock, Sun, Sunrise, Tag, X, Check } from 'lucide-react';
import { Button } from '../../components/common/button';
import { Input } from '../../components/common/input';
import { Label } from '../../components/common/label';
import { RadioGroup, RadioGroupItem } from '../../components/common/radio-group';
import { Card } from '../../components/common/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/common/dialog';
import { useCart } from '../../store/CartContext';
import { toast } from 'sonner';
import { useAuth } from '../../store/AuthContext';
import { API_BASE_URL, GOOGLE_MAPS_API_KEY } from "../../config";
import { useTranslation } from 'react-i18next';
import { GoogleMapPicker } from './GoogleMapPicker';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const USE_GOOGLE_MAPS = !!GOOGLE_MAPS_API_KEY;

const customIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const FALLBACK_CENTER = { lat: 31.5204, lng: 74.3587 };

const CAROUSEL_SLIDES = [
  "https://images.unsplash.com/photo-1731082300550-8093311708ef?w=1400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1565607052745-35f8c6ba59b1?w=1400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1623066798929-946425dbe1b0?w=1400&auto=format&fit=crop&q=80",
];

function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    const timers = [0, 100, 300, 600, 1000].map((delay) =>
      setTimeout(() => {
        if (map) map.invalidateSize({ animate: false });
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [map]);
  return null;
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && map) {
      map.setView(center, 17, { animate: true });
      const t1 = setTimeout(() => map.invalidateSize({ animate: false }), 200);
      return () => clearTimeout(t1);
    }
  }, [center, map]);
  return null;
}

function DraggableMarker({ position, onDragEnd }) {
  const markerRef = useRef(null);
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const latlng = marker.getLatLng();
          onDragEnd({ lat: latlng.lat, lng: latlng.lng });
        }
      },
    }),
    [onDragEnd]
  );

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={customIcon}
    />
  );
}

const SANDBOX_TEST_CARDS = {
  visa_success: '4242 4242 4242 4242',
  mastercard_success: '5555 5555 5555 4444',
  visa_decline: '4000 0000 0000 0002',
  insufficient_funds: '4000 0000 0000 9995',
};

const SANDBOX_TEST_PHONES = {
  success: '03211234567',
  insufficient: '03000000000',
  invalid: '03111111111',
  timeout: '03999999999',
};

// dukan ki jagah aur distance nikalne k liye yahan settings hain
const SHOP_LOCATION = { lat: 31.4973551, lng: 74.2446932 }; 

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

export function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { cart, getTotalPrice, updateQuantity, removeFromCart, clearCart } = useCart();
  const { t } = useTranslation();
  
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [orderType, setOrderType] = useState('pickup');
  
  // ghar ka pata save karne k liye variables
  const [deliveryArea, setDeliveryArea] = useState(''); 
  const [houseDetails, setHouseDetails] = useState(''); 

  const [locationStatus, setLocationStatus] = useState('');
  const [gpsCoords, setGpsCoords] = useState(null); 
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState(null); 
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [cnicLast6, setCnicLast6] = useState('');

  const [paymentStep, setPaymentStep] = useState('input'); 
  const [paymentResult, setPaymentResult] = useState(null);
  const [showSandboxHelper, setShowSandboxHelper] = useState(false);
  const [paySettings, setPaySettings] = useState({
    pay_method_cod_enabled: '1',
    pay_method_jazzcash_enabled: '1',
    pay_method_card_enabled: '1',
    pay_method_bank_enabled: '1',
  });

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [hasActiveCoupons, setHasActiveCoupons] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const total = getTotalPrice();
  const originalTotal = cart.reduce((sum, item) => {
    const basePrice = item.service?.price || 0;
    return sum + (basePrice * item.quantity);
  }, 0);
  const productDiscount = originalTotal - total;

  // Calculate subtotal for coupon (exclude items with product discounts, and exclude security deposits from rentals)
  const couponEligibleSubtotal = cart.reduce((sum, item) => {
    const hasProductDiscount = item.service?.discount_type && item.service.discount_type !== 'none' && item.service.discount_value > 0;
    if (hasProductDiscount) return sum;
    const isRental = item.service?.is_rental === 1 || item.service?.is_rental === '1' || item.service?.is_rental === true || item.service?.is_rental === 'true';
    if (isRental) {
      const rentalRateSubtotal = (parseFloat(item.service.rental_price_per_day) || 0) * (parseInt(item.service.rental_days) || 1);
      return sum + (rentalRateSubtotal * item.quantity);
    }
    const basePrice = item.service?.price || 0;
    return sum + (basePrice * item.quantity);
  }, 0);
  const hasPendingWeightItem = cart.some(item => item.isWeightPending);
  const hasTripItem = cart.some(item => item.service?.unit?.toLowerCase() === 'trip');
  const hasKgItem = cart.some(item => item.service?.unit?.toLowerCase() !== 'trip' && !item.isWeightPending);
  // isTbdOrder only when ALL items are trip/pending — not when mixed with kg items
  const isTbdOrder = hasTripItem && !hasKgItem;
  const isKgOrder = !hasTripItem && cart.length > 0;

  const [schedulePreview, setSchedulePreview] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // delivery ki fees aur map k variables
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [isOutOfLahore, setIsOutOfLahore] = useState(false);

  const couponDiscount = appliedCoupon ? appliedCoupon.discount_amount : 0;
  const vipDiscountAmount = user?.vip_discount ? (total - couponDiscount) * 0.10 : 0;
  const grandTotal = Math.max(0, total + deliveryFee - couponDiscount - vipDiscountAmount);

  // Show warning if coupon is applied to items with product discounts
  const hasMixedDiscounts = couponDiscount > 0 && productDiscount > 0;

  // delivery k rates db se nikal rahe han hum yahan
  const [deliveryConfig, setDeliveryConfig] = useState({ 
    base_fare: 50, 
    base_distance: 10, 
    per_km_rate: 10 
  }); 

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

    const fetchPaySettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/get_store_settings.php`);
        const data = await res.json();
        if (data.success && data.settings) {
          const settings = {
            pay_method_cod_enabled: data.settings.pay_method_cod_enabled ?? '1',
            pay_method_jazzcash_enabled: data.settings.pay_method_jazzcash_enabled ?? '1',
            pay_method_card_enabled: data.settings.pay_method_card_enabled ?? '1',
            pay_method_bank_enabled: data.settings.pay_method_bank_enabled ?? '1',
          };
          setPaySettings(settings);
          
          // Set default payment method if 'cash' (default) is disabled
          if (settings.pay_method_cod_enabled === '0') {
            if (settings.pay_method_jazzcash_enabled === '1') setPaymentMethod('jazzcash');
            else if (settings.pay_method_card_enabled === '1') setPaymentMethod('card');
            else if (settings.pay_method_bank_enabled === '1') setPaymentMethod('bank');
          }
        }
      } catch (err) {
        console.warn('Failed to load payment settings.');
      }
    };
    fetchPaySettings();

    const fetchActiveCouponsStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/coupons/get_coupons.php`);
        const data = await res.json();
        if (data.success && data.coupons) {
          const now = new Date();
          const hasActive = data.coupons.some(c => {
            if (c.is_active !== 1) return false;
            // expiry_date can be skipped if it's null or empty
            if (c.expiry_date && new Date(c.expiry_date) < now) return false;
            // check usage limit if applicable
            if (c.usage_limit && c.used_count >= c.usage_limit) return false;
            return true;
          });
          setHasActiveCoupons(hasActive);
        }
      } catch(err) {
        console.warn('Failed to fetch coupons status');
      }
    };
    fetchActiveCouponsStatus();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // maths ka sara kaam yahan ho raha hai (fees wagera)
  useEffect(() => {
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

      if (USE_GOOGLE_MAPS && window.google?.maps?.DistanceMatrixService) {
        try {
          const service = new window.google.maps.DistanceMatrixService();
          service.getDistanceMatrix(
            {
              origins: [new window.google.maps.LatLng(SHOP_LOCATION.lat, SHOP_LOCATION.lng)],
              destinations: [new window.google.maps.LatLng(gpsCoords.lat, gpsCoords.lng)],
              travelMode: window.google.maps.TravelMode.DRIVING,
              unitSystem: window.google.maps.UnitSystem.METRIC,
            },
            (response, status) => {
              if (status === 'OK' && response.rows[0]?.elements[0]?.status === 'OK') {
                const element = response.rows[0].elements[0];
                const roadDist = element.distance.value / 1000;
                updateFee(roadDist);
              } else {
                updateFee(straightDist);
              }
            }
          );
        } catch (e) {
          console.warn('Distance Matrix failed, using straight-line:', e);
          updateFee(straightDist);
        }
      } else {
        updateFee(straightDist);
      }
    } else {
      setDeliveryFee(user?.vip_free_shipping ? 0 : deliveryConfig.base_fare);
      setDistanceKm(0);
    }
  }, [gpsCoords, isOutOfLahore, orderType, deliveryConfig, user?.vip_free_shipping]);

  useEffect(() => {
    if (hasTripItem) setOrderType('delivery');
  }, [hasTripItem, cart]);

  useEffect(() => {
    if (cart.length === 0) {
      setSchedulePreview(null);
      return;
    }

    const totalWeight = cart.reduce((sum, item) => {
      if (item.isWeightPending) return sum;
      const unit = item.service?.unit?.toLowerCase() || 'kg';
      if (unit === 'kg') return sum + item.quantity;
      if (unit === 'g') return sum + (item.quantity / 1000);
      return sum;
    }, 0) || 1;

    const fetchSchedule = async () => {
      setScheduleLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/check_schedule.php?weight=${totalWeight}`);
        const data = await res.json();
        if (data.success && data.schedule) setSchedulePreview(data.schedule);
      } catch (err) {
        console.warn('Schedule check failed:', err);
      } finally {
        setScheduleLoading(false);
      }
    };

    const timer = setTimeout(fetchSchedule, 500);
    return () => clearTimeout(timer);
  }, [cart]);

  useEffect(() => {
    if (user && user.role === 'customer') {
      setCustomerName(user.full_name || user.name || '');
      setPhone(user.phone || user.username || '');
      if (user.address) setHouseDetails(user.address);
    }
  }, [user]);

  const reverseGeocode = useCallback(async (lat, lng) => {
    let addressText = null;
    let inLahore = false;

    if (USE_GOOGLE_MAPS) {
      try {
        const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=en`;
        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'OK' && data.results && data.results.length > 0) {
            const bestResult = data.results.find(r => !r.types.includes('plus_code') && r.formatted_address) || data.results[0];
            inLahore = bestResult.address_components.some(comp => 
              comp.long_name.toLowerCase().includes('lahore') || 
              comp.short_name.toLowerCase().includes('lahore')
            );
            return { addressText: bestResult.formatted_address, inLahore };
          }
        }
      } catch (e) { console.warn('Google reverse geocode failed:', e); }
    }

    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`;
      const response = await fetch(nominatimUrl, { headers: { 'User-Agent': 'ApniChakki-DeliveryApp/1.0' } });
      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name) {
          inLahore = data.display_name.toLowerCase().includes('lahore');
          const addr = data.address;
          if (addr) {
            const parts = [ addr.house_number, addr.road, addr.neighbourhood || addr.suburb, addr.city || addr.town || addr.village, addr.state, addr.country ].filter(Boolean);
            if (parts.length >= 3) addressText = parts.join(', ');
          }
          if (!addressText) addressText = data.display_name;
          return { addressText, inLahore };
        }
      }
    } catch (e) { console.warn('Nominatim failed:', e); }

    return { addressText: null, inLahore: false };
  }, []);



  const fallbackToManualLocation = useCallback(() => {
    setGpsCoords({ lat: FALLBACK_CENTER.lat, lng: FALLBACK_CENTER.lng, accuracy: 0 });
    setShowMap(true);
    setMapCenter([FALLBACK_CENTER.lat, FALLBACK_CENTER.lng]);
    setLocationStatus(t('Drag the pin to your general area'));
    setIsOutOfLahore(false);
  }, [t]);

  const processLocationFix = useCallback(async (lat, lng, accuracy, source) => {
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
      setLocationStatus(inLahore ? `✅ ${t('Area updated')}` : `❌ ${t('Service not available in this city')}`);
      if(inLahore) toast.success(t('Area updated from your current location'));
    } else {
      const nearText = `Near GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setDeliveryArea(nearText);
      if (!houseDetails || houseDetails.trim() === '') {
        setHouseDetails(nearText);
      }
      setLocationStatus(inLahore ? `✅ ${t('Location pinned')}` : `❌ ${t('Service not available in this city')}`);
    }

    const isLowAccuracy = accuracy > 200; 

    if (isLowAccuracy) {
      if (accuracy > 1000) {
        setLocationStatus(`⚠️ ${t('Approximate location — Please refine by dragging the pin to your exact spot')}`);
      } else {
        setLocationStatus(`⚠️ ${t('Approximate location')} (±${Math.round(accuracy)}m) — ${t('Please refine on the map')}`);
      }
    } else {
      setLocationStatus(inLahore ? `✅ ${t('Location pinned')}` : `❌ ${t('Service not available in this city')}`);
    }

    if (addressText) {
      setDeliveryArea(addressText);
      if (!houseDetails || houseDetails.trim() === '') {
        setHouseDetails(addressText);
      }
    } else {
      const nearText = `Near GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setDeliveryArea(nearText);
      if (!houseDetails || houseDetails.trim() === '') {
        setHouseDetails(nearText);
      }
    }
  }, [reverseGeocode, t, houseDetails]);

  // pata khud se bharne k liye logic — pehle GPS try karo, phir fallback
  useEffect(() => {
    if (orderType === 'delivery' && !deliveryArea && !gpsCoords) {
      const initLocation = async () => {
        setLocationStatus(`📡 ${t('Getting your exact location...')}`);
        
        // Try actual GPS first
        if (navigator.geolocation) {
          try {
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
              });
            });
            const { latitude: lat, longitude: lng, accuracy } = position.coords;
            await processLocationFix(lat, lng, accuracy, 'GPS');
            return; // GPS mil gaya, fallback ki zaroorat nahi
          } catch (geoError) {
            console.warn('GPS failed on init, using fallback:', geoError.message);
          }
        }

        // Fallback if GPS fails
        const { addressText, inLahore } = await reverseGeocode(FALLBACK_CENTER.lat, FALLBACK_CENTER.lng);
        if (addressText) {
          setDeliveryArea(addressText);
          setIsOutOfLahore(!inLahore);
          setLocationStatus(inLahore ? `✅ ${t('Area updated')}` : `❌ ${t('Service not available in this city')}`);
        }
      };
      initLocation();
    }
  }, [orderType, deliveryArea, gpsCoords, reverseGeocode, processLocationFix, t]);

  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  const getCardType = (number) => {
    const digits = number.replace(/\s/g, '');
    if (/^4/.test(digits)) return 'visa';
    if (/^5[1-5]/.test(digits)) return 'mastercard';
    if (/^3[47]/.test(digits)) return 'amex';
    return null;
  };



  const searchTypedAddress = async (queryOverride) => {
    const addressToSearch = typeof queryOverride === 'string' ? queryOverride : deliveryArea;
    if (!addressToSearch || addressToSearch.length < 3) return;
    setLocationStatus(`🔍 ${t('Verifying area on map...')}`);

    let foundLocation = null;

    if (USE_GOOGLE_MAPS) {
      try {
        const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressToSearch + ', Pakistan')}&key=${GOOGLE_MAPS_API_KEY}&language=en`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
          const result = data.results[0];
          const { lat, lng } = result.geometry.location;
          const isOfficiallyLahore = result.address_components.some(comp =>
            comp.long_name.toLowerCase().includes('lahore') ||
            comp.short_name.toLowerCase().includes('lahore')
          );
          foundLocation = { lat, lng, isLahore: isOfficiallyLahore };
        }
      } catch (e) { console.warn('Google forward geocode failed', e); }
    }

    if (!foundLocation) {
      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressToSearch + ', Pakistan')}&limit=1`;
        const response = await fetch(nominatimUrl, { headers: { 'User-Agent': 'ApniChakki-DeliveryApp/1.0' } });
        const data = await response.json();
        
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          const isOfficiallyLahore = data[0].display_name.toLowerCase().includes('lahore');
          foundLocation = { lat, lng, isLahore: isOfficiallyLahore };
        }
      } catch (e) { console.warn('Nominatim forward geocode failed', e); }
    }

    if (foundLocation) {
      setGpsCoords({ lat: foundLocation.lat, lng: foundLocation.lng, accuracy: 50 });
      setMapCenter([foundLocation.lat, foundLocation.lng]);
      setShowMap(true);
      setDeliveryArea(addressToSearch); // Synchronize deliveryArea state
      
      setIsOutOfLahore(!foundLocation.isLahore);

      if (foundLocation.isLahore) {
        setLocationStatus(`✅ ${t('Area verified & mapped!')}`);
      } else {
        setLocationStatus(`❌ ${t('Service not available in this city')}`);
      }
    } else {
      // NEW CUSTOM ERROR MESSAGE
      setLocationStatus(`⚠️ ${t("Can't find your area, select from map or try another nearest area.")}`);
    }
  };

  // Debounce typed address search to automatically map and calculate distance
  useEffect(() => {
    if (orderType !== 'delivery') return;
    if (!houseDetails || houseDetails.trim().length < 6) return;
    if (houseDetails === deliveryArea) return;

    const delayDebounceFn = setTimeout(() => {
      searchTypedAddress(houseDetails);
    }, 1800);

    return () => clearTimeout(delayDebounceFn);
  }, [houseDetails, orderType, deliveryArea]);

  const handleMarkerDrag = useCallback(async (newPos) => {
    setGpsCoords(prev => ({ ...prev, lat: newPos.lat, lng: newPos.lng }));
    setLocationStatus(`📡 ${t('Fetching area...')}`);
    
    const { addressText, inLahore } = await reverseGeocode(newPos.lat, newPos.lng);
    
    setIsOutOfLahore(!inLahore);

    if (addressText) {
      setDeliveryArea(addressText);
      if (!houseDetails || houseDetails.trim() === '') {
        setHouseDetails(addressText);
      }
      setLocationStatus(inLahore ? `✅ ${t('Area updated')}` : `❌ ${t('Service not available in this city')}`);
      if(inLahore) toast.success(t('Area updated from new pin location'));
    } else {
      const nearText = `Near GPS: ${newPos.lat.toFixed(5)}, ${newPos.lng.toFixed(5)}`;
      setDeliveryArea(nearText);
      if (!houseDetails || houseDetails.trim() === '') {
        setHouseDetails(nearText);
      }
      setLocationStatus(inLahore ? `✅ ${t('Location pinned')}` : `❌ ${t('Service not available in this city')}`);
    }
  }, [reverseGeocode, t, houseDetails]);



  const handleGetLocation = async () => {
    setLocationStatus(t('📡 Getting precise GPS fix...'));
    setGpsCoords(null);
    setShowMap(false);

    if (!navigator.geolocation) {
      fallbackToManualLocation();
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 15000, maximumAge: 0, 
        });
      });
      const { latitude: lat, longitude: lng, accuracy } = position.coords;
      await processLocationFix(lat, lng, accuracy, 'GPS');
    } catch (geoError) {
      fallbackToManualLocation();
    }
  };

  const handleHouseDetailsBlur = () => {
    if (houseDetails && houseDetails.trim().length > 5 && houseDetails !== deliveryArea) {
      searchTypedAddress(houseDetails);
    }
  };

  const handlePlaceOrder = () => {
    if (!user) {
      toast.error(t('Please log in to place an order'));
      navigate('/login/customer', { state: { from: location } });
      return;
    }
    if (!customerName || !phone) {
      toast.error(t('Please fill in your details'));
      return;
    }

    const cleanPhone = phone.replace(/\s/g, '');
    const isPlaceholder = cleanPhone.startsWith('G-') || cleanPhone.startsWith('G') || !/^\d{11}$/.test(cleanPhone);
    if (isPlaceholder) {
      toast.error(
        t('Please update your phone number in account settings to proceed with orders!'),
        {
          duration: 9000,
          description: 'آرڈرز جاری رکھنے کے لیے، برائے مہربانی اکاؤنٹ سیٹنگز میں اپنا فون نمبر درست درج کریں۔',
        }
      );
      navigate('/account');
      return;
    }
    
    if (orderType === 'delivery') {
      const hasMap = deliveryArea && gpsCoords;
      const hasManual = houseDetails && houseDetails.trim().length > 0;

      if (!hasMap && !hasManual) {
        toast.error(t('Please provide your Delivery Area via Map OR enter details manually.'));
        return;
      }

      if (hasMap && isOutOfLahore) {
        toast.error(t('Service not available in this city'));
        return;
      }

      if (!hasMap && hasManual) {
        const manualLower = houseDetails.toLowerCase();
        if (!manualLower.includes('lahore') && !manualLower.includes('lhr')) {
          toast.error(t('Service not available in this city'));
          return;
        }
      }
    }
    
    if (cart.length === 0) return;

    if (paymentMethod !== 'cash' && (!hasPendingWeightItem || total > 0) && !isTbdOrder) {
      setPaymentResult(null);
      setShowPaymentDialog(true);
    } else {
      completeOrder('pending');
    }
  };

  const processOnlinePayment = async () => {
    // ── Payment validation checks ──
    if (paymentMethod === 'jazzcash') {
      if (!mobileNumber || mobileNumber.trim() === '') {
        toast.error(t('Please enter your JazzCash mobile number'));
        return;
      }
      if (mobileNumber.length !== 11 || !mobileNumber.startsWith('03')) {
        toast.error(t('Please enter a valid 11-digit JazzCash mobile number starting with 03'));
        return;
      }
      if (cnicLast6 && cnicLast6.length !== 6) {
        toast.error(t('CNIC Last 6 digits must be exactly 6 digits if provided'));
        return;
      }
    } else if (paymentMethod === 'bank') {
      if (!bankAccountNumber || bankAccountNumber.trim() === '') {
        toast.error(t('Please enter your Bank Account / IBAN Number'));
        return;
      }
      if (bankAccountNumber.trim().length < 8) {
        toast.error(t('Please enter a valid Bank Account or IBAN Number (minimum 8 characters)'));
        return;
      }
    } else if (paymentMethod === 'card') {
      const rawCardNum = cardNumber.replace(/\s/g, '');
      if (!rawCardNum || rawCardNum.length < 12 || rawCardNum.length > 19) {
        toast.error(t('Please enter a valid Card Number'));
        return;
      }
      if (!cardName || cardName.trim() === '') {
        toast.error(t('Please enter the Cardholder Name'));
        return;
      }
      if (!cardExpiry || !/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        toast.error(t('Please enter a valid expiry date (MM/YY)'));
        return;
      }
      if (!cardCvv || cardCvv.length < 3 || cardCvv.length > 4) {
        toast.error(t('Please enter a valid 3 or 4 digit CVV'));
        return;
      }
    }

    setIsProcessingPayment(true);
    setPaymentStep('processing');

    try {
      const paymentData = {
        order_id: null,
        user_id: user.id,
        payment_method: paymentMethod,
        amount: grandTotal,
        user_phone: paymentMethod === 'jazzcash' ? mobileNumber : null,
        bank_account_number: paymentMethod === 'bank' ? bankAccountNumber : null,
        card_number: paymentMethod === 'card' ? cardNumber.replace(/\s/g, '') : null,
        card_expiry: paymentMethod === 'card' ? cardExpiry : null,
        card_cvv: paymentMethod === 'card' ? cardCvv : null,
        card_name: paymentMethod === 'card' ? cardName : null,
        cnic_last6: cnicLast6 || null,
      };

      let fullDeliveryAddress = "Pickup From Store";
      if (orderType === 'delivery') {
        const h = (houseDetails || '').trim();
        const a = (deliveryArea || '').trim();
        if (h && a) {
          if (h === a) {
            fullDeliveryAddress = a;
          } else if (h.toLowerCase().includes(a.toLowerCase())) {
            fullDeliveryAddress = h;
          } else {
            fullDeliveryAddress = `${h}, ${a}`;
          }
        } else {
          fullDeliveryAddress = h || a || "";
        }
      }

      const orderData = {
        user_id: user.id,
        customer_name: customerName,
        customer_phone: phone,
        cart_items: cart.map(item => {
          const isRental = item.service?.is_rental === 1 || item.service?.is_rental === '1' || item.service?.is_rental === true || item.service?.is_rental === 'true';
          return {
            id: item.service.id,
            qty: item.quantity,
            is_cleaning: item.service.is_cleaning ? 1 : 0,
            is_grinding: item.service.is_grinding ? 1 : 0,
            price: item.service.price,
            unit: item.service.unit || 'kg',
            is_weight_pending: item.isWeightPending ? 1 : 0,
            selected_customizations: item.service.is_custom_mix
              ? (item.service.selected_mix_items || []).map(m => ({ option_name: `Mix: ${m.item_name} (${m.ratio})`, option_price: 0 }))
              : (item.service.selected_customizations || []),
            is_custom_mix: item.service.is_custom_mix ? 1 : 0,
            is_rental: isRental ? 1 : 0,
            rental_start_date: isRental ? item.service.rental_start_date : null,
            rental_days: isRental ? item.service.rental_days : null,
            rental_price_per_day: isRental ? item.service.rental_price_per_day : null,
            security_deposit: isRental ? item.service.security_deposit : null,
            late_penalty_per_day: isRental ? item.service.late_penalty_per_day : null
          };
        }),
        total: isTbdOrder ? 0 : grandTotal,
        address: fullDeliveryAddress,
        payment_method: isTbdOrder ? 'cash' : paymentMethod,
        payment_status: 'pending',
        amount_paid: 0,
        order_type: orderType,
        is_pickup_request: hasTripItem,
        is_kg_order: isKgOrder,
        coupon_code: appliedCoupon ? appliedCoupon.code : null
      };

      const orderResponse = await fetch(`${API_BASE_URL}/place_order.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const orderResult = await orderResponse.json();
      if (!orderResult.success) throw new Error(orderResult.message || 'Failed to create order');

      paymentData.order_id = orderResult.order_id;

      const paymentResponse = await fetch(`${API_BASE_URL}/process_online_payment.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      });

      const result = await paymentResponse.json();

      if (result.success) {
        setPaymentStep('success');
        setPaymentResult(result);
        setIsProcessingPayment(false);
        setTimeout(() => {
          setShowPaymentDialog(false);
          toast.success(result.message);
          clearCart();
          navigate(`/order-confirmation/${orderResult.order_id}`);
        }, 2500);
      } else {
        throw new Error(result.message || 'Payment processing failed');
      }
    } catch (error) {
      setIsProcessingPayment(false);
      setPaymentStep('failed');
      setPaymentResult({ message: error.message });
    }
  };

  const completeOrder = async (paymentStatus, transactionId, paidAmount = 0) => {
    // If there are TBD items, and user is paying the current total, it must be 'partial'
    // because more weight/price will be added later.
    let finalStatus = paymentStatus;
    if (hasPendingWeightItem && paymentStatus === 'paid') {
      finalStatus = 'partial';
    }

    // Build delivery address with GPS pin link for delivery person
    let deliveryAddress = "Pickup From Store";
    if (orderType === 'delivery') {
      const h = (houseDetails || '').trim();
      const a = (deliveryArea || '').trim();
      if (h && a) {
        if (h === a) {
          deliveryAddress = a;
        } else if (h.toLowerCase().includes(a.toLowerCase())) {
          deliveryAddress = h;
        } else {
          deliveryAddress = `${h}, ${a}`;
        }
      } else {
        deliveryAddress = h || a || "";
      }
      if (gpsCoords) deliveryAddress += ` | 📍 https://maps.google.com/?q=${gpsCoords.lat},${gpsCoords.lng}`;
    }

    const orderData = {
      user_id: user.id,
      customer_name: customerName,
      customer_phone: phone,
      cart_items: cart.map(item => {
        const isRental = item.service?.is_rental === 1 || item.service?.is_rental === '1' || item.service?.is_rental === true || item.service?.is_rental === 'true';
        return {
          id: item.service.id,
          qty: item.quantity,
          is_cleaning: item.service.is_cleaning ? 1 : 0,
          is_grinding: item.service.is_grinding ? 1 : 0,
          price: item.service.price,
          unit: item.service.unit || 'kg',
          is_weight_pending: item.isWeightPending ? 1 : 0,
          selected_customizations: item.service.is_custom_mix
            ? (item.service.selected_mix_items || []).map(m => ({ option_name: `Mix: ${m.item_name} (${m.ratio})`, option_price: 0 }))
            : (item.service.selected_customizations || []),
          is_custom_mix: item.service.is_custom_mix ? 1 : 0,
          is_rental: isRental ? 1 : 0,
          rental_start_date: isRental ? item.service.rental_start_date : null,
          rental_days: isRental ? item.service.rental_days : null,
          rental_price_per_day: isRental ? item.service.rental_price_per_day : null,
          security_deposit: isRental ? item.service.security_deposit : null,
          late_penalty_per_day: isRental ? item.service.late_penalty_per_day : null
        };
      }),
      total: isTbdOrder ? 0 : grandTotal,
      delivery_fee: deliveryFee,
      distance_km: distanceKm.toFixed(1),
      address: deliveryAddress,
      payment_method: isTbdOrder ? 'cash' : paymentMethod,
      payment_status: finalStatus,
      transaction_id: transactionId || null,
      amount_paid: paidAmount,
      order_type: orderType,
      is_pickup_request: hasTripItem,
      is_kg_order: isKgOrder,
      coupon_code: appliedCoupon ? appliedCoupon.code : null
    };

    try {
      const response = await fetch(`${API_BASE_URL}/place_order.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || t("Order placed successfully!"));
        clearCart(); 
        navigate(`/order-confirmation/${result.order_id}`); 
      } else {
        toast.error(t("Failed to place order") + ": " + result.message);
      }
    } catch (error) {
      console.error("Order Error:", error);
      toast.error(t("Network error. Check your internet or server."));
    }
  };

  const fillTestCard = (type) => {
    switch(type) {
      case 'visa_success':
        setCardNumber('4242 4242 4242 4242'); setCardExpiry('12/28'); setCardCvv('123'); setCardName('Test Visa User'); break;
      case 'mastercard_success':
        setCardNumber('5555 5555 5555 4444'); setCardExpiry('12/28'); setCardCvv('456'); setCardName('Test MC User'); break;
      case 'decline':
        setCardNumber('4000 0000 0000 0002'); setCardExpiry('12/28'); setCardCvv('789'); setCardName('Decline Test'); break;
    }
    toast.info(t('Test card data filled'));
  };

  const fillTestPhone = (type) => {
    switch(type) {
      case 'success': setMobileNumber('03211234567'); break;
      case 'fail': setMobileNumber('03000000000'); break;
      case 'invalid': setMobileNumber('03111111111'); break;
    }
    toast.info(t('Test phone number filled'));
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError(t('Please enter a coupon code'));
      return;
    }

    if (couponEligibleSubtotal === 0) {
      setCouponError(t('Coupon cannot be applied - all items have product discounts'));
      return;
    }

    setValidatingCoupon(true);
    setCouponError('');
    setAppliedCoupon(null);

    try {
      const res = await fetch(`${API_BASE_URL}/coupons/validate_coupon.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode,
          subtotal: couponEligibleSubtotal,
          user_id: user?.id
        })
      });

      const data = await res.json();
      if (data.success) {
        setAppliedCoupon(data.coupon);
        toast.success(t('Coupon applied successfully!'));
      } else {
        setCouponError(data.message || t('Invalid coupon'));
      }
    } catch (err) {
      setCouponError(t('Failed to validate coupon'));
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponError('');
  };

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <h1 className="mb-4 text-foreground">{t('Your Cart is Empty')}</h1>
        <p className="text-muted-foreground mb-6">{t('Add some items from our services to get started')}</p>
        <Button onClick={() => navigate('/')}>{t('Browse Services')}</Button>
      </div>
    );
  }

  const cardType = getCardType(cardNumber);

  const isCartEmpty = total === 0 && !hasPendingWeightItem && !isTbdOrder;
  const isDeliveryInvalid = orderType === 'delivery' && (isOutOfLahore || !gpsCoords || !deliveryArea);

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Background Carousel */}
      {CAROUSEL_SLIDES.map((slide, i) => (
        <div
          key={i}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url(${slide})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: i === currentSlide ? 1 : 0,
            transition: 'opacity 1.5s ease-in-out',
            zIndex: -2,
          }}
        />
      ))}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.5) 100%)',
        zIndex: -1,
      }} />
      
      <div className="container mx-auto px-4 py-8 max-w-3xl" style={{ position: 'relative', zIndex: 1 }}>
      <h1 className="mb-6 text-white">{t('Checkout')}</h1>

      <Card className="p-6 mb-6">
        <h3 className="mb-4 text-foreground">{t('Order Summary')}</h3>
        <div className="space-y-4">
          {cart.map((item, index) => {
            const isRental = item.service?.is_rental === 1 || item.service?.is_rental === '1' || item.service?.is_rental === true || item.service?.is_rental === 'true';
            return (
              <div key={`${item.service.id}-${item.isWeightPending ? 'pending' : 'regular'}-${index}`} className="flex items-center justify-between pb-4 border-b border-border last:border-0 last:pb-0">
                <div className="flex-1">
                  <h4 className="text-foreground">{item.service.name}</h4>
                  {isRental ? (
                    <div className="text-xs text-muted-foreground font-medium space-y-0.5 mt-1">
                      <p>🗓️ {t('Dates')}: {item.service.rental_start_date} ({item.service.rental_days} {t('days')})</p>
                      <p>💵 {t('Rental Rate')}: Rs. {Math.round(item.service.rental_price_per_day)}/{t('day')} × {item.quantity}</p>
                      <p>🔒 {t('Refundable Deposit')}: Rs. {Math.round(item.service.security_deposit)} × {item.quantity}</p>
                    </div>
                  ) : (
                    <>
                      {(item.service.selected_customizations?.length > 0 || item.service.is_grinding_service) && !item.service.is_custom_mix && (
                        <p className="text-xs text-muted-foreground font-medium">
                          ({item.service.selected_customizations?.length > 0
                            ? item.service.selected_customizations.map(c => t(c.option_name)).join(' + ')
                            : [item.service.is_cleaning && t('Cleaning'), item.service.is_grinding && t('Grinding')].filter(Boolean).join(' + ')
                          })
                        </p>
                      )}
                      {item.service.is_custom_mix && item.service.selected_mix_items?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.service.selected_mix_items.map((m, idx) => (
                            <span key={idx} className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">
                              {m.item_name} ({m.ratio})
                            </span>
                          ))}
                        </div>
                      )}
                      {item.isWeightPending || item.service?.unit?.toLowerCase() === 'trip' ? (
                        <p className="text-sm text-primary font-medium">
                          {t('Weight to be confirmed (Price TBD)')}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Rs. {item.service.price} × {item.quantity} {item.service.unit}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {item.isWeightPending || item.service?.unit?.toLowerCase() === 'trip' ? (
                    <p className="text-foreground font-semibold">TBD</p>
                  ) : (
                    <p className="text-foreground">Rs. {item.service.price * item.quantity}</p>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 ml-2 bg-red-500 hover:bg-red-600 border-red-600 shadow flex items-center justify-center px-0 py-0"
                    onClick={() => {
                      if (isRental) {
                        removeFromCart(item.service.id, false, false, false, null, false, null, true, item.service.rental_start_date, item.service.rental_days);
                      } else {
                        removeFromCart(item.service.id, item.isWeightPending, item.service.is_cleaning, item.service.is_grinding, item.service.selected_customizations, item.service.is_custom_mix, item.service.selected_mix_items);
                      }
                    }}
                    title={t('Remove Item')}
                  >
                    <Trash2 className="h-4 w-4 text-white" strokeWidth={3} />
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="flex justify-between pt-4 border-t border-border">
            <span className="text-foreground">{t('Original Subtotal')}</span>
            <span className="text-foreground font-bold">{isTbdOrder ? 'TBD' : `Rs. ${originalTotal.toFixed(2)}`}</span>
          </div>

          {productDiscount > 0 && (
            <div className="flex justify-between pt-2 text-blue-600 dark:text-blue-400">
              <span className="text-sm font-medium">{t('Product Discount')}</span>
              <span className="text-sm font-medium">-Rs. {productDiscount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between pt-2 border-t border-border">
            <span className="text-foreground">{t('Cart Subtotal')}</span>
            <span className="text-foreground font-bold">{isTbdOrder ? 'TBD' : `Rs. ${total.toFixed(2)}`}</span>
          </div>

          {orderType === 'delivery' && !isOutOfLahore && (
            <div className="flex justify-between pt-2">
              <span className="text-muted-foreground text-sm">
                {t('Delivery Fee')} ({distanceKm.toFixed(1)} km)
              </span>
              <span className={`text-sm ${user?.vip_free_shipping ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}`}>
                {user?.vip_free_shipping ? t('Free (VIP Benefit)') : `Rs. ${deliveryFee}`}
              </span>
            </div>
          )}

          {!isTbdOrder && hasActiveCoupons && (
            <div className="pt-4 border-t border-border">
              <Label className="text-foreground">{t('Coupon Code')}</Label>
              {appliedCoupon ? (
                <div className="mt-2 flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{appliedCoupon.code}</span>
                      <span className="text-sm text-emerald-600 dark:text-emerald-400 ml-2">
                        {appliedCoupon.discount_type === 'percentage'
                          ? `${appliedCoupon.discount_value}% OFF`
                          : `Rs. ${appliedCoupon.discount_value} OFF`}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={removeCoupon}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder={t('Enter coupon code')}
                    className="flex-1"
                    disabled={validatingCoupon}
                  />
                  <Button
                    onClick={validateCoupon}
                    disabled={validatingCoupon || !couponCode.trim()}
                    className="whitespace-nowrap"
                  >
                    {validatingCoupon ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t('Apply')
                    )}
                  </Button>
                </div>
              )}
              {couponError && (
                <p className="mt-1 text-sm text-destructive">{couponError}</p>
              )}
            </div>
          )}

          {couponDiscount > 0 && (
            <div className="flex justify-between pt-2 text-emerald-600 dark:text-emerald-400">
              <span className="text-sm font-medium">{t('Coupon Discount')}</span>
              <span className="text-sm font-medium">-Rs. {couponDiscount.toFixed(2)}</span>
            </div>
          )}

          {vipDiscountAmount > 0 && (
            <div className="flex justify-between pt-2 text-purple-600 dark:text-purple-400">
              <span className="text-sm font-medium">{t('VIP 10% Discount')}</span>
              <span className="text-sm font-medium">-Rs. {vipDiscountAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between pt-2 border-t border-border font-bold">
            <span className="text-foreground">{t('Grand Total')}</span>
            <span className="text-foreground">{isTbdOrder ? 'TBD' : `Rs. ${grandTotal.toFixed(2)}`}</span>
          </div>

          {hasPendingWeightItem && (
            <p className="text-sm text-primary text-right mt-2">
              {t('Total does not include items with pending weight.')}
            </p>
          )}
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <h3 className="mb-4 text-foreground">{t('Your Details')}</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">{t('Full Name')}</Label>
            <Input
              id="name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t('Enter your name')}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone">{t('Phone Number')}</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('Enter your phone number')}
              className="mt-1"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <h3 className="mb-4 text-foreground">{t('Order Type')}</h3>
        <RadioGroup value={orderType} onValueChange={(value) => setOrderType(value)}>
          {!hasTripItem && (
            <div className="flex items-center space-x-2 p-4 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors">
              <RadioGroupItem value="pickup" id="pickup" />
              <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                <div>
                  <p>{t('Pickup')}</p>
                  <p className="text-sm text-muted-foreground">{t('Collect from our store')}</p>
                </div>
              </Label>
            </div>
          )}
          <div className="flex items-center space-x-2 p-4 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors">
            <RadioGroupItem value="delivery" id="delivery" />
            <Label htmlFor="delivery" className="flex-1 cursor-pointer">
              <div>
                <p>{t('Delivery / Service')}</p>
                <p className="text-sm text-muted-foreground">{t('Get it delivered or serviced at your location')}</p>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </Card>

      <Card className={`p-6 mb-6 transition-all duration-300 ${orderType !== 'delivery' ? 'opacity-50 pointer-events-none hidden' : ''}`}>
        <h3 className="mb-4 text-foreground flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          {t('Delivery Address')}
        </h3>
        
        {isOutOfLahore && (
          <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800">{t('Delivery Not Available')}</p>
              <p className="text-xs text-red-700 mt-1">
                {t('Currently, Apni Chakki only delivers within Lahore. Please change your order type to "Pickup" or update your area.')}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-5">
          {/* ── MAP SECTION — Always visible, user picks location here ── */}
          <div className="border-2 border-primary/20 rounded-xl overflow-hidden bg-primary/5">
            <div className="px-4 py-3 border-b border-primary/10 bg-primary/5">
              <p className="text-sm font-bold text-primary flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                {t('1. Select your location on the map')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('Search, use GPS, or tap on the map to pin your delivery location')}</p>
            </div>

            {/* Search bar + GPS button above map */}
            <div className="px-3 py-2.5 bg-white/80 border-b border-primary/10 flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="deliveryArea"
                  value={deliveryArea}
                  onChange={(e) => setDeliveryArea(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchTypedAddress(); } }}
                  placeholder={t('Search area (e.g. Rasheed Pura, DHA Phase 5)')}
                  className="pr-3 bg-white text-sm h-9"
                />
              </div>
              <Button 
                type="button" 
                size="sm"
                onClick={searchTypedAddress}
                disabled={!deliveryArea || deliveryArea.length < 3 || locationStatus?.includes('Verifying')}
                className="h-9 px-3 shrink-0"
              >
                {locationStatus?.includes('Verifying') ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Search')}
              </Button>
              <button
                type="button"
                title={t('Use My GPS Location')}
                onClick={handleGetLocation}
                disabled={locationStatus?.includes('Refining') || locationStatus?.includes('Getting') || locationStatus?.includes('Verifying')}
                className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {locationStatus?.includes('Getting') ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crosshair className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Status message */}
            {locationStatus && (
              <div className={`px-4 py-2 text-xs font-medium border-b border-primary/10 ${
                locationStatus.includes('✅') || locationStatus.includes('updated') ? 'bg-green-50 text-green-700' :
                locationStatus.includes('⚠️') || locationStatus.includes('Approximate') || locationStatus.includes('refine') ? 'bg-amber-50 text-amber-700' :
                locationStatus.includes('📡') || locationStatus.includes('🔍') ? 'bg-blue-50 text-blue-600' :
                locationStatus.includes('denied') || locationStatus.includes('error') || locationStatus.includes('❌') ? 'bg-red-50 text-red-600' :
                'bg-secondary/50 text-muted-foreground'
              }`}>
                {locationStatus}
              </div>
            )}

            {/* Map — Always rendered */}
            <div className="relative">
              {USE_GOOGLE_MAPS ? (
                <GoogleMapPicker
                  position={gpsCoords ? { lat: gpsCoords.lat, lng: gpsCoords.lng } : FALLBACK_CENTER}
                  onPositionChange={(newPos) => {
                    setGpsCoords(prev => ({ ...prev, lat: newPos.lat, lng: newPos.lng }));
                  }}
                  onAddressChange={(addr) => {
                    setDeliveryArea(addr);
                    if (!houseDetails || houseDetails.trim() === '') {
                      setHouseDetails(addr);
                    }
                    setLocationStatus(`✅ ${t('Area updated')}`);
                  }}
                  height="280px"
                  showSearch={false}
                />
              ) : (
                <div className="h-[280px] w-full relative z-0">
                  <MapContainer
                    key={`map-${(gpsCoords || FALLBACK_CENTER).lat}-${(gpsCoords || FALLBACK_CENTER).lng}`}
                    center={[(gpsCoords || FALLBACK_CENTER).lat, (gpsCoords || FALLBACK_CENTER).lng]}
                    zoom={17}
                    scrollWheelZoom={true}
                    className="h-full w-full z-0"
                    zoomControl={true}
                  >
                    <MapInvalidator />
                    <RecenterMap center={mapCenter || [FALLBACK_CENTER.lat, FALLBACK_CENTER.lng]} />
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <DraggableMarker 
                      position={[(gpsCoords || FALLBACK_CENTER).lat, (gpsCoords || FALLBACK_CENTER).lng]} 
                      onDragEnd={handleMarkerDrag} 
                    />
                  </MapContainer>
                </div>
              )}
            </div>

            {/* Selected area confirmation chip */}
            {gpsCoords && deliveryArea && !isOutOfLahore && (
              <div className="px-4 py-2.5 bg-green-50 border-t border-green-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <p className="text-xs text-green-800 font-medium truncate flex-1">{deliveryArea}</p>
                {distanceKm > 0 && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold shrink-0">
                    {distanceKm.toFixed(1)} km
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── HOUSE DETAILS SECTION ── */}
          <div className="p-4 border-2 border-primary/20 rounded-xl bg-primary/5">
            <Label htmlFor="houseDetails" className="text-primary font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {t('2. House, Street & Building Details')} <span className="text-xs font-normal text-muted-foreground">({t('Optional if location selected')})</span>
            </Label>
            <p className="text-xs text-muted-foreground mb-2 mt-0.5">{t('Provide exact details for the delivery rider')}</p>
            <textarea
              id="houseDetails"
              value={houseDetails}
              onChange={(e) => setHouseDetails(e.target.value)}
              onBlur={handleHouseDetailsBlur}
              placeholder={t('e.g. House # 85, Street # 20, Mohalla Javed Colony')}
              className="w-full min-h-[80px] rounded-lg border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              rows={3}
            />
          </div>
          
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <h3 className="mb-4 text-foreground">{t('Payment Method')}</h3>
          
          {total === 0 && (hasPendingWeightItem || isTbdOrder) ? (
            <div className="p-4 border border-border rounded-lg bg-secondary/30">
              <div className="flex items-center gap-3">
                <Banknote className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{t('Price TBD')}</p>
                  <p className="text-sm text-muted-foreground">{t('Payment method will be selected once weight is confirmed')}</p>
                </div>
              </div>
            </div>
          ) : (
          <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value)}>
            {paySettings.pay_method_cod_enabled === '1' && (
              <div className="flex items-center space-x-2 p-4 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Banknote className="h-5 w-5 text-primary" />
                    <div>
                      <p>{t('Cash')} ({orderType === 'delivery' ? t('on Delivery') : t('on Pickup')})</p>
                    </div>
                  </div>
                </Label>
              </div>
            )}

            {paySettings.pay_method_jazzcash_enabled === '1' && (
              <div className="flex items-center space-x-2 p-4 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors">
                <RadioGroupItem value="jazzcash" id="jazzcash" />
                <Label htmlFor="jazzcash" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5" style={{ color: '#e1272c' }} />
                    <div>
                      <p className="flex items-center gap-2">
                        JazzCash
                        <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-medium">SANDBOX</span>
                      </p>
                      <p className="text-sm text-muted-foreground">{t('Pay via JazzCash mobile wallet')}</p>
                    </div>
                  </div>
                </Label>
              </div>
            )}

            {paySettings.pay_method_card_enabled === '1' && (
              <div className="flex items-center space-x-2 p-4 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5" style={{ color: '#1a1f71' }} />
                    <div>
                      <p className="flex items-center gap-2">
                        {t('Credit / Debit Card')}
                        <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-medium">SANDBOX</span>
                      </p>
                      <p className="text-sm text-muted-foreground">{t('Visa, Mastercard accepted')}</p>
                    </div>
                  </div>
                </Label>
              </div>
            )}

            {paySettings.pay_method_bank_enabled === '1' && (
              <div className="flex items-center space-x-2 p-4 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors">
                <RadioGroupItem value="bank" id="bank" />
                <Label htmlFor="bank" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-primary" />
                    <div>
                      <p>{t('Bank Transfer')}</p>
                      <p className="text-sm text-muted-foreground">{t('Direct bank account transfer')}</p>
                    </div>
                  </div>
                </Label>
              </div>
            )}
          </RadioGroup>
          )}

          {paymentMethod === 'cash' && (!hasPendingWeightItem || total > 0) && !isTbdOrder && (
            <div className="mt-6 p-4 border border-border rounded-lg bg-secondary/20">
              <p className="text-sm text-muted-foreground">{t('Payment will be collected at the time of delivery or pickup.')}</p>
            </div>
          )}
      </Card>

      {/* order kab mile ga uska preview yahan dikha rahe han */}
      {schedulePreview && (
        <Card 
          className="p-4 mb-6"
          style={{
            borderLeft: `4px solid ${schedulePreview.is_today ? '#22c55e' : '#f97316'}`,
            backgroundColor: schedulePreview.is_today ? '#f0fdf4' : '#fff7ed'
          }}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${schedulePreview.is_today ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
              {schedulePreview.is_today ? <Sunrise className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-foreground">
                  {schedulePreview.is_today ? t('Scheduled for Today') : t('Scheduled for Tomorrow')}
                </h4>
                <span className="text-xs font-mono bg-white/50 px-2 py-0.5 rounded border border-border">
                  {schedulePreview.is_today ? t('Today') : t('Tomorrow')}
                </span>
              </div>
              
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{t('Expected')}: <strong>{schedulePreview.estimated_completion_display}</strong></span>
                </div>
                {!schedulePreview.is_today && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(schedulePreview.assigned_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</span>
                  </div>
                )}
              </div>

              {!schedulePreview.is_today && schedulePreview.reason_code !== 'today' && (
                <p className="mt-2 text-xs text-amber-700 bg-amber-100/50 p-2 rounded border border-amber-200/50 italic">
                  {schedulePreview.reason_code === 'time_cutoff' && t('Shop closing soon, new orders moved to tomorrow.')}
                  {schedulePreview.reason_code === 'capacity_full' && t('Today\'s slots are full. Scheduled for tomorrow.')}
                  {schedulePreview.reason_code === 'no_time_left' && t('Not enough time to process today. Scheduled for tomorrow.')}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {scheduleLoading && (
        <div className="flex items-center justify-center p-4 mb-6 bg-secondary/20 rounded-lg animate-pulse">
          <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">{t('Checking schedule...')}</span>
        </div>
      )}

      <Button
        className="w-full h-12 text-base font-bold shadow-lg"
        size="lg"
        onClick={handlePlaceOrder}
        disabled={isCartEmpty || isDeliveryInvalid}
      >
        {paymentMethod === 'cash' || isTbdOrder ? t('Place Order') : t('Proceed to Payment')} {isTbdOrder ? '(TBD)' : `(Rs. ${grandTotal})`}{(hasPendingWeightItem && !isTbdOrder) && " + TBD"}
      </Button>

      {/* PAYMENT DIALOG */}
      <Dialog open={showPaymentDialog} onOpenChange={(open) => {
        if (!isProcessingPayment) {
          setShowPaymentDialog(open);
          if (!open) {
            setPaymentStep('input');
            setPaymentResult(null);
          }
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {paymentMethod === 'jazzcash' && (
                <>
                  <Smartphone className="h-5 w-5" style={{ color: '#e1272c' }} />
                  JazzCash Payment
                </>
              )}
              {paymentMethod === 'card' && (
                <>
                  <CreditCard className="h-5 w-5" style={{ color: '#1a1f71' }} />
                  {t('Card Payment')}
                </>
              )}
              {paymentMethod === 'bank' && (
                <>
                  <Building2 className="h-5 w-5 text-primary" />
                  {t('Bank Transfer')}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="hidden">
              Payment processing and details
            </DialogDescription>
          </DialogHeader>
          
          {paymentStep === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-primary/20 animate-spin" style={{ borderTopColor: paymentMethod === 'jazzcash' ? '#e1272c' : '#1a1f71' }}></div>
                {paymentMethod === 'jazzcash' && <Smartphone className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8" style={{ color: '#e1272c' }} />}
                {paymentMethod === 'card' && <CreditCard className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8" style={{ color: '#1a1f71' }} />}
                {paymentMethod === 'bank' && <Building2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary" />}
              </div>
              <p className="text-lg font-semibold text-foreground">{t('Processing Payment...')}</p>
              <p className="text-sm text-muted-foreground text-center">
                {paymentMethod === 'jazzcash' && t('Connecting to JazzCash gateway...')}
                {paymentMethod === 'card' && t('Authorizing card payment...')}
                {paymentMethod === 'bank' && t('Initiating bank transfer...')}
              </p>
              <p className="text-xs text-muted-foreground">{t('Please do not close this window')}</p>
            </div>
          )}

          {paymentStep === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <p className="text-xl font-bold text-green-600">{t('Payment Successful!')}</p>
              <div className="w-full bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('Amount')}:</span>
                  <span className="font-bold">Rs. {total}{hasPendingWeightItem && " + TBD"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('Method')}:</span>
                  <span className="font-medium">
                    {paymentMethod === 'jazzcash' ? 'JazzCash' : paymentMethod === 'card' ? 'Card' : 'Bank'}
                  </span>
                </div>
                {paymentResult?.transaction_id && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">TXN ID:</span>
                    <span className="font-mono text-xs">{paymentResult.transaction_id}</span>
                  </div>
                )}
                {paymentResult?.sandbox && (
                  <div className="text-center mt-2">
                    <span className="text-[10px] px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">SANDBOX MODE</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{t('Redirecting to order confirmation...')}</p>
            </div>
          )}

          {paymentStep === 'failed' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
              <p className="text-xl font-bold text-red-600">{t('Payment Failed')}</p>
              <p className="text-sm text-muted-foreground text-center">
                {paymentResult?.message || t('An error occurred while processing your payment')}
              </p>
              <div className="flex gap-3 w-full">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => { setShowPaymentDialog(false); setPaymentStep('input'); }}
                >
                  {t('Cancel')}
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => setPaymentStep('input')}
                >
                  {t('Try Again')}
                </Button>
              </div>
            </div>
          )}

          {paymentStep === 'input' && (
            <div className="space-y-4">
              <div className="text-center py-3 bg-secondary/30 rounded-lg">
                <p className="text-3xl font-bold text-foreground">Rs. {total}{hasPendingWeightItem && " + TBD"}</p>
                <p className="text-sm text-muted-foreground">{t('Amount to pay')}</p>
                {hasPendingWeightItem && (
                  <p className="text-xs text-primary mt-1">
                    {t('(Additional charges for pending items will be due on delivery/pickup)')}
                  </p>
                )}
              </div>

              <button
                onClick={() => setShowSandboxHelper(!showSandboxHelper)}
                className="w-full flex items-center justify-center gap-2 text-xs text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg py-2 px-3 transition-colors"
              >
                <TestTube2 className="h-3.5 w-3.5" />
                {showSandboxHelper ? t('Hide Sandbox Test Data') : t('Show Sandbox Test Data')}
              </button>

              {paymentMethod === 'jazzcash' && (
                <div className="space-y-4">
                  {showSandboxHelper && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-semibold text-yellow-800 flex items-center gap-1">
                        <TestTube2 className="h-3 w-3" /> {t('Sandbox Test Numbers')}:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => fillTestPhone('success')} className="text-[11px] px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors">
                          ✅ Success: 03211234567
                        </button>
                        <button onClick={() => fillTestPhone('fail')} className="text-[11px] px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors">
                          ❌ Low Balance: 03000000000
                        </button>
                        <button onClick={() => fillTestPhone('invalid')} className="text-[11px] px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors">
                          ❌ Invalid: 03111111111
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="mobileNumber">{t('JazzCash Mobile Number')}</Label>
                    <div className="relative mt-1">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="mobileNumber"
                        placeholder="03XX XXXXXXX"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 11))}
                        className="pl-10"
                        maxLength={11}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t('Enter your JazzCash registered mobile number')}</p>
                  </div>

                  <div>
                    <Label htmlFor="cnicLast6">{t('CNIC Last 6 Digits')} ({t('Optional')})</Label>
                    <Input
                      id="cnicLast6"
                      placeholder="XXXXXX"
                      value={cnicLast6}
                      onChange={(e) => setCnicLast6(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      maxLength={6}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="space-y-4">
                  {showSandboxHelper && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-semibold text-yellow-800 flex items-center gap-1">
                        <TestTube2 className="h-3 w-3" /> {t('Sandbox Test Cards')}:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => fillTestCard('visa_success')} className="text-[11px] px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors">
                          ✅ Visa Success
                        </button>
                        <button onClick={() => fillTestCard('mastercard_success')} className="text-[11px] px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors">
                          ✅ MC Success
                        </button>
                        <button onClick={() => fillTestCard('decline')} className="text-[11px] px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors">
                          ❌ Declined
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="cardNumber">{t('Card Number')}</Label>
                    <div className="relative mt-1">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="cardNumber"
                        placeholder="4242 4242 4242 4242"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        className="pl-10 pr-16 font-mono tracking-wider"
                        maxLength={19}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold">
                        {cardType === 'visa' && <span className="text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded">VISA</span>}
                        {cardType === 'mastercard' && <span className="text-orange-800 bg-orange-100 px-1.5 py-0.5 rounded">MC</span>}
                        {cardType === 'amex' && <span className="text-green-800 bg-green-100 px-1.5 py-0.5 rounded">AMEX</span>}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="cardName">{t('Cardholder Name')}</Label>
                    <Input
                      id="cardName"
                      placeholder="JOHN DOE"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value.toUpperCase())}
                      className="mt-1 uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cardExpiry">{t('Expiry Date')}</Label>
                      <Input
                        id="cardExpiry"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        className="mt-1 font-mono"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cardCvv">CVV</Label>
                      <div className="relative mt-1">
                        <Input
                          id="cardCvv"
                          type="password"
                          placeholder="•••"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          className="pr-10 font-mono"
                          maxLength={4}
                        />
                        <Shield className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 rounded-lg p-2.5">
                    <Shield className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span>{t('Your card information is encrypted and secure. Sandbox mode - no real charges.')}</span>
                  </div>
                </div>
              )}

              {paymentMethod === 'bank' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bankAccountNumber">{t('Bank Account / IBAN Number')}</Label>
                    <div className="relative mt-1">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="bankAccountNumber"
                        placeholder="PK00 XXXX 0000 0000 0000 0000"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-blue-800">{t('Bank Transfer Instructions')}:</p>
                    <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                      <li>{t('Transfer Rs.')} {total}{hasPendingWeightItem && " + TBD"} {t('to the account below')}</li>
                      <li>{t('Your order will be confirmed after admin verification')}</li>
                      <li>{t('Please keep the transfer receipt for reference')}</li>
                    </ol>
                    <div className="bg-white rounded p-2 mt-2 space-y-1">
                      <p className="text-xs"><span className="text-muted-foreground">{t('Bank')}:</span> <strong>Meezan Bank</strong></p>
                      <p className="text-xs"><span className="text-muted-foreground">{t('Account')}:</span> <strong>0123-4567890</strong></p>
                      <p className="text-xs"><span className="text-muted-foreground">{t('Title')}:</span> <strong>Mughal Ata Chaki</strong></p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={processOnlinePayment}
                disabled={isProcessingPayment}
                style={
                  paymentMethod === 'jazzcash' 
                    ? { background: 'linear-gradient(135deg, #e1272c, #b91c20)', color: 'white' }
                    : paymentMethod === 'card'
                    ? { background: 'linear-gradient(135deg, #1a1f71, #2d35a8)', color: 'white' }
                    : {}
                }
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('Processing...')}
                  </>
                ) : (
                  <>
                    {paymentMethod === 'jazzcash' && `Pay Rs. ${total} via JazzCash`}
                    {paymentMethod === 'card' && `${t('Pay')} Rs. ${total} ${t('via Card')}`}
                    {paymentMethod === 'bank' && `${t('Confirm Transfer')} Rs. ${total}`}
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}





