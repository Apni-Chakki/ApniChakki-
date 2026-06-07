import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Trash2, Building2, Smartphone, Banknote, Loader2, WalletCards, CreditCard, Shield, CheckCircle2, AlertCircle, TestTube2, Crosshair, Navigation, Calendar, Clock, Sun, Sunrise } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Card } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
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

// ============================================================
// Shop Location & Distance Calculator
// ============================================================
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
  
  // Split Address States
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
  const [partialPayment, setPartialPayment] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [cnicLast6, setCnicLast6] = useState('');

  const [paymentStep, setPaymentStep] = useState('input'); 
  const [paymentResult, setPaymentResult] = useState(null);
  const [showSandboxHelper, setShowSandboxHelper] = useState(false);

  const total = getTotalPrice();
  const hasPendingWeightItem = cart.some(item => item.isWeightPending);
  const hasTripItem = cart.some(item => item.service?.unit?.toLowerCase() === 'trip');
  const isTbdOrder = hasTripItem;
  const isKgOrder = !hasTripItem && cart.length > 0;

  const [schedulePreview, setSchedulePreview] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Delivery & Geofencing States
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [isOutOfLahore, setIsOutOfLahore] = useState(false);

  const grandTotal = total + deliveryFee;

  // ============================================================
  // Fetch Dynamic Delivery Rates from PHP
  // ============================================================
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
  }, []);

  // ============================================================
  // MATH LOGIC: Now uses Dynamic Admin Rates
  // ============================================================
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
      setDeliveryFee(0);
      setDistanceKm(0);
    }
  }, [gpsCoords, isOutOfLahore, orderType, deliveryConfig]);

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
        const res = await fetch(`${API_BASE_URL}/controllers/orders/check_schedule.php?weight=${totalWeight}`);
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

  const searchTypedAddress = async () => {
    if (!deliveryArea || deliveryArea.length < 3) return;
    setLocationStatus(`🔍 ${t('Verifying area on map...')}`);

    let foundLocation = null;

    if (USE_GOOGLE_MAPS) {
      try {
        const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(deliveryArea + ', Pakistan')}&key=${GOOGLE_MAPS_API_KEY}&language=en`;
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
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(deliveryArea + ', Pakistan')}&limit=1`;
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

  const handleMarkerDrag = useCallback(async (newPos) => {
    setGpsCoords(prev => ({ ...prev, lat: newPos.lat, lng: newPos.lng }));
    setLocationStatus(`📡 ${t('Fetching area...')}`);
    
    const { addressText, inLahore } = await reverseGeocode(newPos.lat, newPos.lng);
    
    setIsOutOfLahore(!inLahore);

    if (addressText) {
      setDeliveryArea(addressText);
      setLocationStatus(inLahore ? `✅ ${t('Area updated')}` : `❌ ${t('Service not available in this city')}`);
      if(inLahore) toast.success(t('Area updated from new pin location'));
    } else {
      setDeliveryArea(`Near GPS: ${newPos.lat.toFixed(5)}, ${newPos.lng.toFixed(5)}`);
      setLocationStatus(inLahore ? `✅ ${t('Location pinned')}` : `❌ ${t('Service not available in this city')}`);
    }
  }, [reverseGeocode, t]);

  const processLocationFix = useCallback(async (lat, lng, accuracy, source) => {
    setGpsCoords({ lat, lng, accuracy });
    setShowMap(true);
    setMapCenter([lat, lng]);

    const { addressText, inLahore } = await reverseGeocode(lat, lng);
    setIsOutOfLahore(!inLahore);

    const isLowAccuracy = accuracy > 200; 

    if (isLowAccuracy) {
      if (accuracy > 1000) {
        setLocationStatus(`⚠️ ${t('Approximate location — Please refine by dragging the pin to your exact spot')}`);
      } else {
        setLocationStatus(`⚠️ ${t('Approximate location')} (±${Math.round(accuracy)}m) — ${t('Please refine on the map')}`);
      }
      toast.info(t('Location is approximate. Drag the pin to your exact area.'));
    } else {
      setLocationStatus(inLahore ? `✅ ${t('Location pinned')}` : `❌ ${t('Service not available in this city')}`);
    }

    if (addressText) {
      setDeliveryArea(addressText);
    } else {
      setDeliveryArea(`Near GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  }, [reverseGeocode, t]);

  const fallbackToManualLocation = useCallback(() => {
    setGpsCoords({ lat: FALLBACK_CENTER.lat, lng: FALLBACK_CENTER.lng, accuracy: 0 });
    setShowMap(true);
    setMapCenter([FALLBACK_CENTER.lat, FALLBACK_CENTER.lng]);
    setLocationStatus(t('Drag the pin to your general area'));
    setIsOutOfLahore(false);
  }, [t]);

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
    
    if (orderType === 'delivery') {
      if (!deliveryArea || !gpsCoords) {
        toast.error(t('Please provide your Delivery Area and confirm it on the map.'));
        return;
      }
      if (!houseDetails) {
        toast.error(t('Please provide your House/Street details for the rider.'));
        return;
      }
      if (isOutOfLahore) {
        toast.error(t('Service not available in this city'));
        return;
      }
    }
    
    if (cart.length === 0) return;

    if (partialPayment && paymentMethod === 'cash' && total > 0) {
      const paidAmount = parseFloat(amountPaid);
      if (isNaN(paidAmount) || paidAmount <= 0) return toast.error(t('Please enter a valid payment amount'));
      if (paidAmount >= total) return toast.error(t('Partial payment cannot be equal or greater than total amount'));
    }

    if (paymentMethod !== 'cash' && (!hasPendingWeightItem || total > 0) && !isTbdOrder) {
      setPaymentResult(null);
      setShowPaymentDialog(true);
    } else {
      if (partialPayment && total > 0 && !isTbdOrder) {
        completeOrder('partial', null, parseFloat(amountPaid));
      } else {
        completeOrder('pending');
      }
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
        amount: total,
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
        cart_items: cart.map(item => ({
          id: item.service.id,
          qty: item.quantity,
          is_cleaning: item.service.is_cleaning ? 1 : 0,
          is_grinding: item.service.is_grinding ? 1 : 0,
          price: item.service.price,
          is_weight_pending: item.isWeightPending ? 1 : 0
        })),
        total: isTbdOrder ? 0 : total,
        address: orderType === 'delivery' ? address : "Pickup From Store",
        cart_items: cart.map(item => ({ id: item.service.id, qty: item.quantity })),
        total: isTbdOrder ? 0 : grandTotal,
        address: fullDeliveryAddress,
        payment_method: isTbdOrder ? 'cash' : paymentMethod,
        payment_status: 'pending',
        amount_paid: 0,
        order_type: orderType,
        is_pickup_request: isTbdOrder,
        is_kg_order: isKgOrder
      };

      const orderResponse = await fetch(`${API_BASE_URL}/place_order.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const orderResult = await orderResponse.json();
      if (!orderResult.success) throw new Error(orderResult.message || 'Failed to create order');

      paymentData.order_id = orderResult.order_id;

      const paymentResponse = await fetch(`${API_BASE_URL}/payments/process_online_payment.php`, {
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
      cart_items: cart.map(item => ({
        id: item.service.id,
        qty: item.quantity,
        is_cleaning: item.service.is_cleaning ? 1 : 0,
        is_grinding: item.service.is_grinding ? 1 : 0,
        price: item.service.price
      })),
      total: isTbdOrder ? 0 : total,
      cart_items: cart.map(item => ({ id: item.service.id, qty: item.quantity })),
      total: isTbdOrder ? 0 : grandTotal,
      delivery_fee: deliveryFee,
      distance_km: distanceKm.toFixed(1),
      address: deliveryAddress,
      payment_method: isTbdOrder ? 'cash' : paymentMethod,
      payment_status: finalStatus,
      transaction_id: transactionId || null,
      amount_paid: paidAmount,
      order_type: orderType,
      is_pickup_request: isTbdOrder,
      is_kg_order: isKgOrder
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

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <h1 className="mb-4 text-foreground">{t('Your Cart is Empty')}</h1>
        <p className="text-muted-foreground mb-6">{t('Add some items from our services to get started')}</p>
        <Button onClick={() => navigate('/')}>{t('Browse Services')}</Button>
      </div>
    );
  }

  const remainingAmount = partialPayment ? Math.max(0, total - (parseFloat(amountPaid) || 0)) : 0;
  const cardType = getCardType(cardNumber);

  const isCartEmpty = total === 0 && !hasPendingWeightItem && !isTbdOrder;
  const isDeliveryInvalid = orderType === 'delivery' && (isOutOfLahore || !gpsCoords || !deliveryArea || !houseDetails);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="mb-6 text-foreground">{t('Checkout')}</h1>

      <Card className="p-6 mb-6">
        <h3 className="mb-4 text-foreground">{t('Order Summary')}</h3>
        <div className="space-y-4">
          {cart.map((item, index) => (
            <div key={`${item.service.id}-${item.isWeightPending ? 'pending' : 'regular'}-${index}`} className="flex items-center justify-between pb-4 border-b border-border last:border-0 last:pb-0">
              <div className="flex-1">
                <h4 className="text-foreground">{item.service.name}</h4>
                {item.service.is_grinding_service && (
                  <p className="text-xs text-muted-foreground font-medium">
                    ({item.service.is_cleaning ? t('Cleaning') : ''} 
                    {item.service.is_cleaning && item.service.is_grinding ? ' + ' : ''}
                    {item.service.is_grinding ? t('Grinding') : ''})
                  </p>
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
              </div>
              <div className="flex items-center gap-4">
                {item.isWeightPending || item.service?.unit?.toLowerCase() === 'trip' ? (
                  <p className="text-foreground font-semibold">TBD</p>
                ) : (
                  <p className="text-foreground">Rs. {item.service.price * item.quantity}</p>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFromCart(item.service.id, item.isWeightPending, item.service.is_cleaning, item.service.is_grinding)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 ml-2 bg-red-500 hover:bg-red-600 border-red-600 shadow flex items-center justify-center px-0 py-0"
                    onClick={() => removeFromCart(item.service.id, item.isWeightPending)}
                    title={t('Remove Item')}
                  >
                    <Trash2 className="h-4 w-4 text-white" strokeWidth={3} />
                  </Button>
              </div>
            </div>
          ))}
          
          <div className="flex justify-between pt-4 border-t border-border">
            <span className="text-foreground">{t('Total')}</span>
            <span className="text-foreground font-bold">
              Rs. {total}{hasPendingWeightItem && " + TBD"}
            </span>
            <span className="text-foreground">{t('Cart Subtotal')}</span>
            <span className="text-foreground">{isTbdOrder ? 'TBD' : `Rs. ${total}`}</span>
          </div>

          {orderType === 'delivery' && deliveryFee > 0 && !isOutOfLahore && (
            <div className="flex justify-between pt-2">
              <span className="text-muted-foreground text-sm">
                {t('Delivery Fee')} ({distanceKm.toFixed(1)} km)
              </span>
              <span className="text-muted-foreground text-sm">Rs. {deliveryFee}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-border font-bold">
            <span className="text-foreground">{t('Grand Total')}</span>
            <span className="text-foreground">{isTbdOrder ? 'TBD' : `Rs. ${grandTotal}`}</span>
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
        <h3 className="mb-4 text-foreground">{t('Delivery Address')}</h3>
        
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

        <div className="space-y-6">
          <div className="p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
            <Label htmlFor="deliveryArea" className="text-primary font-bold">{t('1. Delivery Area / Landmark')} *</Label>
            <p className="text-xs text-muted-foreground mb-2">{t('Search your nearest well-known area to calculate fare (e.g. Rasheed Pura, DHA Phase 5)')}</p>
            
            {/* NEW: Input with Verify Button next to it */}
            <div className="flex gap-2 mt-1">
              <div className="relative flex-1">
                <Input
                  id="deliveryArea"
                  value={deliveryArea}
                  onChange={(e) => setDeliveryArea(e.target.value)}
                  placeholder={t('Enter area (e.g. Rasheed Pura)')}
                  className="pr-12 bg-white"
                />
                <button
                  type="button"
                  title={t('Get My Location')}
                  onClick={handleGetLocation}
                  disabled={locationStatus?.includes('Refining') || locationStatus?.includes('Getting') || locationStatus?.includes('Verifying')}
                  className="absolute top-1 right-1 p-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {locationStatus?.includes('Refining') || locationStatus?.includes('Getting') || locationStatus?.includes('Verifying') ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Crosshair className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  )}
                </button>
              </div>
              <Button 
                type="button" 
                onClick={searchTypedAddress}
                disabled={!deliveryArea || deliveryArea.length < 3 || locationStatus?.includes('Verifying')}
              >
                {locationStatus?.includes('Verifying') ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('Verify')}
              </Button>
            </div>
            
            {locationStatus && (
              <p className={`text-sm mt-2 font-medium ${
                locationStatus.includes('✅') || locationStatus.includes('updated') ? 'text-green-600' :
                locationStatus.includes('⚠️') || locationStatus.includes('Approximate') || locationStatus.includes('refine') ? 'text-amber-600' :
                locationStatus.includes('📡') || locationStatus.includes('🔍') ? 'text-blue-600' :
                locationStatus.includes('denied') || locationStatus.includes('error') || locationStatus.includes('❌') ? 'text-red-500' :
                'text-muted-foreground'
              }`}>
                {locationStatus}
              </p>
            )}

            {showMap && gpsCoords && (
              <div className="mt-4 border-2 border-primary/20 rounded-lg overflow-hidden">
                {USE_GOOGLE_MAPS ? (
                  <GoogleMapPicker
                    position={{ lat: gpsCoords.lat, lng: gpsCoords.lng }}
                    onPositionChange={(newPos) => {
                      setGpsCoords(prev => ({ ...prev, lat: newPos.lat, lng: newPos.lng }));
                    }}
                    onAddressChange={(addr) => {
                      setDeliveryArea(addr);
                      setLocationStatus(`✅ ${t('Area updated')}`);
                    }}
                    height="250px"
                    showSearch={false}
                  />
                ) : (
                  <div className="h-[250px] w-full relative z-0">
                    <MapContainer
                      key={`map-${gpsCoords.lat}-${gpsCoords.lng}`}
                      center={[gpsCoords.lat, gpsCoords.lng]}
                      zoom={16}
                      scrollWheelZoom={true}
                      className="h-full w-full z-0"
                      zoomControl={true}
                    >
                      <MapInvalidator />
                      <RecenterMap center={mapCenter} />
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <DraggableMarker position={[gpsCoords.lat, gpsCoords.lng]} onDragEnd={handleMarkerDrag} />
                    </MapContainer>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="houseDetails" className="font-bold">{t('2. House, Street & Building Details')} *</Label>
            <p className="text-xs text-muted-foreground mb-2">{t('Provide exact details for the delivery rider')}</p>
            <textarea
              id="houseDetails"
              value={houseDetails}
              onChange={(e) => setHouseDetails(e.target.value)}
              placeholder={t('e.g. House # 85, Street # 20, Mohalla Javed Colony')}
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
          </RadioGroup>
          )}

          {paymentMethod === 'cash' && (!hasPendingWeightItem || total > 0) && !isTbdOrder && (
          <div className="mt-6 p-4 border border-border rounded-lg bg-secondary/20">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="partialPayment"
                checked={partialPayment}
                onChange={(e) => {
                  setPartialPayment(e.target.checked);
                  if (!e.target.checked) setAmountPaid('');
                }}
                className="h-5 w-5 rounded border border-border cursor-pointer"
              />
              <Label htmlFor="partialPayment" className="cursor-pointer flex items-center gap-2 mb-0 font-semibold">
                {t('Partial Payment')} ({t('Udhaar')})
              </Label>
            </div>
            
            {partialPayment && (
              <div className="space-y-4 pl-8">
                <div>
                  <Label htmlFor="amountPaid">{t('Amount Paying Now')}</Label>
                  <Input
                    id="amountPaid"
                    type="number"
                    min="1"
                    max={total - 1}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder={`${t('Enter amount')} (Rs. 1 - ${total - 1})`}
                    className="mt-1"
                  />
                </div>
                {amountPaid && parseFloat(amountPaid) > 0 && (
                  <div className="bg-background border border-border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{t('Total Amount')}:</span>
                      <span className="font-semibold text-foreground">Rs. {total}{hasPendingWeightItem && " + TBD"}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-border pt-2">
                      <span className="text-primary font-medium">{t('Paying Now')}:</span>
                      <span className="font-bold text-primary">Rs. {parseFloat(amountPaid) || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-border pt-2 mt-2">
                      <span className="text-destructive font-bold">{t('Udhaar (Remaining)')}:</span>
                      <span className="font-bold text-destructive">Rs. {remainingAmount}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          )}
      </Card>

      <Button
        className="w-full h-12 text-base font-bold shadow-lg"
        size="lg"
        onClick={handlePlaceOrder}
        disabled={isCartEmpty || isDeliveryInvalid}
      >
        {paymentMethod === 'cash' || (total === 0) ? t('Place Order') : t('Proceed to Payment')} 
        <span className="ml-2">
          (Rs. {total}{hasPendingWeightItem && " + TBD"})
        </span>
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
  );
}