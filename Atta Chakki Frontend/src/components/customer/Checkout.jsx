import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Trash2, Building2, Smartphone, Banknote, Loader2, WalletCards, CreditCard, Shield, CheckCircle2, AlertCircle, TestTube2, Crosshair, Navigation, Calendar, Clock, Sun, Sunrise } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Card } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useCart } from '../../lib/CartContext';
import { toast } from 'sonner';
import { useAuth } from '../../lib/AuthContext';
import { API_BASE_URL, GOOGLE_MAPS_API_KEY } from "../../config";
import { useTranslation } from 'react-i18next';
import { GoogleMapPicker } from './GoogleMapPicker';
// Leaflet fallback (when no Google Maps API key)
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Flag to decide which map to use
const USE_GOOGLE_MAPS = !!GOOGLE_MAPS_API_KEY;

// ============================================================
// LEAFLET SETUP — Explicit custom icon (avoids bundler issues)
// ============================================================
const customIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Fallback: Lahore city center (used when GPS fails so map doesn't show gray)
const FALLBACK_CENTER = { lat: 31.5204, lng: 74.3587 };

// ============================================================
// MapInvalidator — Aggressively invalidates size to fix broken/gray tiles
// ============================================================
function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    // Fire on mount and repeatedly to catch dynamic unhiding
    const timers = [0, 100, 300, 600, 1000].map((delay) =>
      setTimeout(() => {
        if (map) map.invalidateSize({ animate: false });
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [map]);
  return null;
}

// ============================================================
// RecenterMap — Programmatically moves the map when center changes
// ============================================================
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && map) {
      map.setView(center, 17, { animate: true });
      // Re-invalidate after the view change settles
      const t1 = setTimeout(() => map.invalidateSize({ animate: false }), 200);
      return () => clearTimeout(t1);
    }
  }, [center, map]);
  return null;
}

// ============================================================
// DraggableMarker — Marker the user can drag to refine location
// ============================================================
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

// Sandbox test card numbers
const SANDBOX_TEST_CARDS = {
  visa_success: '4242 4242 4242 4242',
  mastercard_success: '5555 5555 5555 4444',
  visa_decline: '4000 0000 0000 0002',
  insufficient_funds: '4000 0000 0000 9995',
};

// Sandbox test phone numbers  
const SANDBOX_TEST_PHONES = {
  success: '03211234567',
  insufficient: '03000000000',
  invalid: '03111111111',
  timeout: '03999999999',
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
  const [address, setAddress] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  const [gpsCoords, setGpsCoords] = useState(null); // { lat, lng, accuracy }
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState(null); // triggers map re-center
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [partialPayment, setPartialPayment] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  
  // Credit card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [cnicLast6, setCnicLast6] = useState('');

  // Payment processing states
  const [paymentStep, setPaymentStep] = useState('input'); // 'input', 'processing', 'success', 'failed'
  const [paymentResult, setPaymentResult] = useState(null);
  const [showSandboxHelper, setShowSandboxHelper] = useState(false);

  const total = getTotalPrice();
  const hasPendingWeightItem = cart.some(item => item.isWeightPending);
  const hasTripItem = cart.some(item => item.service?.unit?.toLowerCase() === 'trip');
  // Only trip-based items are TBD — Kg orders always have known weight & price
  const isTbdOrder = hasTripItem;
  // Determine if this is a Kg order (user knows weight, price is calculated immediately)
  const isKgOrder = !hasTripItem && cart.length > 0;

  // ── Schedule Preview State ──
  const [schedulePreview, setSchedulePreview] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  useEffect(() => {
    if (hasTripItem) {
      setOrderType('delivery');
    }
  }, [hasTripItem, cart]);

  // ── Fetch schedule availability when cart changes ──
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
        if (data.success && data.schedule) {
          setSchedulePreview(data.schedule);
        }
      } catch (err) {
        console.warn('Schedule check failed:', err);
      } finally {
        setScheduleLoading(false);
      }
    };

    // Debounce: wait 500ms after last cart change
    const timer = setTimeout(fetchSchedule, 500);
    return () => clearTimeout(timer);
  }, [cart]);

  useEffect(() => {
    if (user && user.role === 'customer') {
      setCustomerName(user.full_name || user.name || '');
      setPhone(user.phone || user.username || '');
      
      if (user.address) setAddress(user.address);
    }
  }, [user]);

  // Format card number with spaces (XXXX XXXX XXXX XXXX)
  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  // Format expiry date (MM/YY)
  const formatExpiry = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      return digits.slice(0, 2) + '/' + digits.slice(2);
    }
    return digits;
  };

  // Detect card type from number
  const getCardType = (number) => {
    const digits = number.replace(/\s/g, '');
    if (/^4/.test(digits)) return 'visa';
    if (/^5[1-5]/.test(digits)) return 'mastercard';
    if (/^3[47]/.test(digits)) return 'amex';
    return null;
  };

  // Reverse geocode a lat/lng into a human-readable address
  // Uses FREE Nominatim (OpenStreetMap) as primary, Google as fallback
  const reverseGeocode = useCallback(async (lat, lng) => {
      // ── 1. Try Nominatim (FREE — no API key needed) ──
      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`;
        const response = await fetch(nominatimUrl, {
          headers: { 'User-Agent': 'ApniChakki-DeliveryApp/1.0' }
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.display_name) {
            // Build a cleaner address from components if available
            const addr = data.address;
            if (addr) {
              const parts = [
                addr.house_number,
                addr.road,
                addr.neighbourhood || addr.suburb,
                addr.city || addr.town || addr.village,
                addr.state,
                addr.country
              ].filter(Boolean);
              
              if (parts.length >= 3) {
                return parts.join(', ');
              }
            }
            return data.display_name;
          }
        }
      } catch (e) {
        console.warn('Nominatim reverse geocode failed:', e);
      }

      // ── 2. Fallback to Google Geocoding API (if key exists) ──
      try {
        if (!GOOGLE_MAPS_API_KEY) return null;

        const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=en`;
        const response = await fetch(apiUrl);
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'OK' && data.results && data.results.length > 0) {
            const bestResult = data.results.find(r => 
              !r.types.includes('plus_code') && r.formatted_address
            ) || data.results[0];
            return bestResult.formatted_address;
          }
        }
      } catch (e) {
        console.warn('Google reverse geocode fallback failed:', e);
      }

      return null;
    }, []);

  // Handle marker drag on the map
  const handleMarkerDrag = useCallback(async (newPos) => {
    setGpsCoords(prev => ({ ...prev, lat: newPos.lat, lng: newPos.lng }));
    setLocationStatus(`📡 ${t('Fetching address...')}`);
    
    const addr = await reverseGeocode(newPos.lat, newPos.lng);
    if (addr) {
      setAddress(addr);
      setLocationStatus(`✅ ${t('Address updated')}`);
      toast.success(t('Address updated from new pin location'));
    } else {
      setAddress(`Near GPS: ${newPos.lat.toFixed(5)}, ${newPos.lng.toFixed(5)}`);
      setLocationStatus(`✅ ${t('Location pinned')}`);
      toast.info(t('Could not fetch address. Please type it manually.'));
    }
  }, [reverseGeocode, t]);

  // Helper: process a successful lat/lng fix (shared by browser GPS & Google fallback)
  const processLocationFix = useCallback(async (lat, lng, accuracy, source) => {
    setGpsCoords({ lat, lng, accuracy });
    setShowMap(true);
    setMapCenter([lat, lng]);

    const isLowAccuracy = accuracy > 200; // Desktop WiFi/IP typically >200m

    if (isLowAccuracy) {
      setLocationStatus(`⚠️ ${t('Approximate location')} (±${Math.round(accuracy)}m) — ${t('Please refine on the map')}`);
      toast.info(t('Location is approximate. Use the map search bar or drag the pin to your exact location.'), { duration: 6000 });
    } else {
      setLocationStatus(`✅ ${t('Location pinned')} (±${Math.round(accuracy)}m) — ${source}`);
    }

    // Reverse-geocode → fill address field automatically
    const addr = await reverseGeocode(lat, lng);
    if (addr) {
      setAddress(addr);
      if (!isLowAccuracy) {
        toast.success(t('Location captured! Drag the pin to adjust.'));
      }
    } else {
      setAddress(`Near GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      toast.info(t('GPS pin saved. Please type your full address above.'));
    }
  }, [reverseGeocode, t]);

  // Fallback: show the map at a safe default location so the user can search or drag the pin manually.
  const fallbackToManualLocation = useCallback(() => {
    setGpsCoords({ lat: FALLBACK_CENTER.lat, lng: FALLBACK_CENTER.lng, accuracy: 0 });
    setShowMap(true);
    setMapCenter([FALLBACK_CENTER.lat, FALLBACK_CENTER.lng]);
    setLocationStatus(t('Drag the pin to your location'));
    toast.info(t('Please search your address or drag the pin to your delivery location.'));
  }, [t]);

  // ─── Main handler: "Get My Location" button ───────────────────
  const handleGetLocation = async () => {
    setLocationStatus(t('📡 Getting precise GPS fix...'));
    setGpsCoords(null);
    setShowMap(false);

    // ── 1. Check browser Geolocation API support ──
    if (!navigator.geolocation) {
      toast.error(t('Your browser does not support GPS. Please search the address or drag the pin.'));
      fallbackToManualLocation();
      return;
    }

    // ── 2. Use browser GPS with high accuracy (real GPS hardware) ──
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,   // Uses GPS chip → sub-10 m accuracy
          timeout: 15000,             // Wait up to 15 s for a GPS fix
          maximumAge: 0,              // Always get a fresh reading
        });
      });

      const { latitude: lat, longitude: lng, accuracy } = position.coords;
      await processLocationFix(lat, lng, accuracy, 'GPS');

    } catch (geoError) {
      // ── 3. Handle specific geolocation errors ──
      switch (geoError.code) {
        case geoError.PERMISSION_DENIED:
          console.warn('User denied Geolocation permission.');
          toast.error(t('Location permission denied. Please allow location access, or search/drag the pin on the map.'));
          fallbackToManualLocation();
          break;

        case geoError.POSITION_UNAVAILABLE:
          console.warn('Position unavailable (GPS hardware error).');
          toast.error(t('GPS signal unavailable. Please search the address or drag the pin manually.'));
          fallbackToManualLocation();
          break;

        case geoError.TIMEOUT:
          console.warn('Geolocation timed out.');
          toast.error(t('GPS took too long. Please search the address or drag the pin manually.'));
          fallbackToManualLocation();
          break;

        default:
          console.error('Unknown geolocation error:', geoError);
          toast.error(t('Could not get location. Please search the address or drag the pin manually.'));
          fallbackToManualLocation();
          break;
      }
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

    if (orderType === 'delivery' && !address) {
      toast.error(t('Please provide a delivery address'));
      return;
    }

    if (cart.length === 0) {
      toast.error(t('Your cart is empty'));
      return;
    }

    // Validate partial payment amount
    if (partialPayment && paymentMethod === 'cash' && total > 0) {
      const paidAmount = parseFloat(amountPaid);
      if (isNaN(paidAmount) || paidAmount <= 0) {
        toast.error(t('Please enter a valid payment amount'));
        return;
      }
      if (paidAmount >= total) {
        toast.error(t('Partial payment cannot be equal or greater than total amount'));
        return;
      }
    }

    if (paymentMethod !== 'cash' && (!hasPendingWeightItem || total > 0) && !isTbdOrder) {
      setPaymentResult(null);
      setShowPaymentDialog(true);
    } else {
      if (partialPayment && total > 0 && !isTbdOrder) {
        const paidAmount = parseFloat(amountPaid);
        completeOrder('partial', null, paidAmount);
      } else {
        completeOrder('pending');
      }
    }
  };

  const processOnlinePayment = async () => {
    // Validate inputs based on payment method
    if (paymentMethod === 'jazzcash' && !mobileNumber) {
      toast.error(t('Please enter mobile number'));
      return;
    }
    if (paymentMethod === 'bank' && !bankAccountNumber) {
      toast.error(t('Please enter bank account number'));
      return;
    }
    if (paymentMethod === 'card') {
      if (!cardNumber || !cardExpiry || !cardCvv || !cardName) {
        toast.error(t('Please fill in all card details'));
        return;
      }
      // Basic validation
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (cleanCard.length < 13) {
        toast.error(t('Invalid card number'));
        return;
      }
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        toast.error(t('Invalid expiry date. Use MM/YY format'));
        return;
      }
      if (!/^\d{3,4}$/.test(cardCvv)) {
        toast.error(t('Invalid CVV'));
        return;
      }
    }

    setIsProcessingPayment(true);
    setPaymentStep('processing');

    try {
      // Build payment data
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

      // First create the order
      const orderData = {
        user_id: user.id,
        cart_items: cart.map(item => ({
          id: item.service.id,
          qty: item.quantity
        })),
        total: isTbdOrder ? 0 : total,
        address: orderType === 'delivery' ? address : "Pickup From Store",
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

      if (!orderResult.success) {
        throw new Error(orderResult.message || 'Failed to create order');
      }

      // Now process the payment
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
        
        // Auto navigate after 2 seconds
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
      console.error('Payment Error:', error);
    }
  };

  const completeOrder = async (paymentStatus, transactionId, paidAmount = 0) => {
    // Build delivery address with GPS pin link for delivery person
    let deliveryAddress = "Pickup From Store";
    if (orderType === 'delivery') {
      deliveryAddress = address;
      if (gpsCoords) {
        deliveryAddress += ` | 📍 https://maps.google.com/?q=${gpsCoords.lat},${gpsCoords.lng}`;
      }
    }

    const orderData = {
      user_id: user.id,
      cart_items: cart.map(item => ({
        id: item.service.id,
        qty: item.quantity
      })),
      total: isTbdOrder ? 0 : total,
      address: deliveryAddress,
      payment_method: isTbdOrder ? 'cash' : paymentMethod,
      payment_status: paymentStatus,
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

  // Fill test data helpers
  const fillTestCard = (type) => {
    switch(type) {
      case 'visa_success':
        setCardNumber('4242 4242 4242 4242');
        setCardExpiry('12/28');
        setCardCvv('123');
        setCardName('Test Visa User');
        break;
      case 'mastercard_success':
        setCardNumber('5555 5555 5555 4444');
        setCardExpiry('12/28');
        setCardCvv('456');
        setCardName('Test MC User');
        break;
      case 'decline':
        setCardNumber('4000 0000 0000 0002');
        setCardExpiry('12/28');
        setCardCvv('789');
        setCardName('Decline Test');
        break;
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="mb-6 text-foreground">{t('Checkout')}</h1>

      {/* Order Summary */}
      <Card className="p-6 mb-6">
        <h3 className="mb-4 text-foreground">{t('Order Summary')}</h3>
        <div className="space-y-4">
          {cart.map((item, index) => (
            <div key={`${item.service.id}-${item.isWeightPending ? 'pending' : 'regular'}-${index}`} className="flex items-center justify-between pb-4 border-b border-border last:border-0 last:pb-0">
              <div className="flex-1">
                <h4 className="text-foreground">{item.service.name}</h4>
                {item.isWeightPending || isTbdOrder ? (
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
                {item.isWeightPending || isTbdOrder ? (
                  <p className="text-foreground font-semibold">TBD</p>
                ) : (
                  <p className="text-foreground">Rs. {item.service.price * item.quantity}</p>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFromCart(item.service.id, item.isWeightPending)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex justify-between pt-4 border-t border-border">
            <span className="text-foreground">{t('Total')}</span>
            <span className="text-foreground">{isTbdOrder ? 'TBD' : `Rs. ${total}`}</span>
          </div>
          {hasPendingWeightItem && (
            <p className="text-sm text-primary text-right mt-2">
              {t('Total does not include items with pending weight.')}
            </p>
          )}
        </div>
      </Card>

      {/* ── Expected Schedule Banner ── */}
      {cart.length > 0 && (
        <Card className={`p-0 mb-6 overflow-hidden border-2 transition-all duration-500 ${
          scheduleLoading 
            ? 'border-border opacity-70' 
            : schedulePreview?.is_today 
              ? 'border-green-300 dark:border-green-700' 
              : 'border-amber-300 dark:border-amber-700'
        }`}>
          {scheduleLoading ? (
            <div className="flex items-center justify-center gap-3 py-5">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('Checking schedule availability...')}</span>
            </div>
          ) : schedulePreview ? (
            <div>
              {/* Header strip */}
              <div className={`px-5 py-3 flex items-center gap-3 ${
                schedulePreview.is_today 
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/30' 
                  : 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30'
              }`}>
                <div className={`p-2.5 rounded-xl ${
                  schedulePreview.is_today 
                    ? 'bg-green-100 dark:bg-green-900/60' 
                    : 'bg-amber-100 dark:bg-amber-900/60'
                }`}>
                  {schedulePreview.is_today 
                    ? <Sun className="h-6 w-6 text-green-600 dark:text-green-400" />
                    : <Sunrise className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  }
                </div>
                <div className="flex-1">
                  <p className={`text-base font-bold ${
                    schedulePreview.is_today 
                      ? 'text-green-700 dark:text-green-400' 
                      : 'text-amber-700 dark:text-amber-400'
                  }`}>
                    {schedulePreview.is_today ? `📦 ${t('Expected')}: ${t('Today')}` : `📅 ${t('Expected')}: ${t('Tomorrow')}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {schedulePreview.reason}
                  </p>
                </div>
              </div>

              {/* Details row */}
              <div className="px-5 py-3 flex items-center gap-4 flex-wrap border-t border-border/50">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{t('ETA')}:</span>
                  <span className="text-xs font-semibold text-foreground">{schedulePreview.estimated_completion_display}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{t('Date')}:</span>
                  <span className="text-xs font-semibold text-foreground">
                    {new Date(schedulePreview.assigned_date + 'T00:00:00').toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{t('Today\'s Orders')}:</span>
                  <span className={`text-xs font-bold ${
                    schedulePreview.today_order_count >= schedulePreview.max_daily_orders 
                      ? 'text-red-600' 
                      : 'text-foreground'
                  }`}>
                    {schedulePreview.today_order_count}/{schedulePreview.max_daily_orders}
                  </span>
                </div>
                {!schedulePreview.is_today && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{t('Cutoff was')}:</span>
                    <span className="text-xs font-semibold text-foreground">{schedulePreview.cutoff_time_display}</span>
                  </div>
                )}
                {schedulePreview.server_time_display && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Clock className="h-3 w-3 text-muted-foreground/60" />
                    <span className="text-[10px] text-muted-foreground/70 font-mono">
                      {schedulePreview.server_time_display} · {schedulePreview.server_timezone || 'UTC'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </Card>
      )}

      {/* Customer Details */}
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
          {user && (
            <p className="text-xs text-muted-foreground">
              {t("To change your details permanently, please go to your 'My Account' page.")}
            </p>
          )}
        </div>
      </Card>

      {/* Order Type */}
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
          {hasTripItem && (
            <div className="mb-2 text-sm font-medium text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
              {t('Pickup is not available for service-based orders.')}
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

      {/* Delivery Section */}
      <Card className={`p-6 mb-6 transition-all duration-300 ${orderType !== 'delivery' ? 'opacity-50 pointer-events-none hidden' : ''}`}>
        <h3 className="mb-4 text-foreground">{t('Delivery Address')}</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="address">{t('Full Address (House/Street/Area)')}</Label>
            <div className="relative mt-1">
              <textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t('House # / Street / Mohalla / Area / City — be specific for delivery!')}
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 pr-12 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                rows={3}
              />
              {/* Inline location button */}
              <button
                type="button"
                title={t('Get My Location')}
                onClick={handleGetLocation}
                disabled={locationStatus?.includes('Refining') || locationStatus?.includes('Getting')}
                className="absolute top-2 right-2 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {locationStatus?.includes('Refining') || locationStatus?.includes('Getting') ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Crosshair className="h-5 w-5 group-hover:scale-110 transition-transform" />
                )}
              </button>
            </div>
          </div>
          
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleGetLocation}
            disabled={locationStatus?.includes('Refining') || locationStatus?.includes('Getting')}
          >
            {locationStatus?.includes('Refining') || locationStatus?.includes('Getting') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            {gpsCoords ? t('📍 Recapture Location') : t('📍 Get My Location')}
          </Button>
          
          {locationStatus && (
            <p className={`text-sm text-center font-medium ${
              locationStatus.includes('✅') || locationStatus.includes('updated') ? 'text-green-600' :
              locationStatus.includes('⚠️') || locationStatus.includes('Approximate') || locationStatus.includes('refine') ? 'text-amber-600' :
              locationStatus.includes('📡') ? 'text-blue-600' :
              locationStatus.includes('denied') || locationStatus.includes('error') || locationStatus.includes('unavailable') ? 'text-red-500' :
              'text-muted-foreground'
            }`}>
              {locationStatus}
            </p>
          )}

          {/* ===== INTERACTIVE MAP ===== */}
          {showMap && gpsCoords && (
            <div className="mt-4">
              {/* Low accuracy warning banner */}
              {gpsCoords.accuracy > 200 && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-t-xl px-4 py-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      {t('Location is approximate')} (±{Math.round(gpsCoords.accuracy)}m)
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {USE_GOOGLE_MAPS 
                        ? t('👆 Use the search bar in the map below to find your exact address, or click/drag the pin.')
                        : t('👆 Drag the red pin to your exact location on the map below.')
                      }
                    </p>
                  </div>
                </div>
              )}
              {/* Map header */}
              <div className={`bg-gradient-to-r from-primary/10 to-primary/5 px-3 py-2 flex items-center justify-between ${gpsCoords.accuracy > 200 ? 'border-x-2 border-primary/20' : 'rounded-t-xl border-2 border-b-0 border-primary/20'}`}>
                <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {USE_GOOGLE_MAPS 
                    ? t('Search, click, or drag pin to set exact location')
                    : t('Drag the pin to adjust your location')
                  }
                </span>
                <button
                  onClick={() => setShowMap(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded hover:bg-secondary"
                >
                  {t('Hide Map')}
                </button>
              </div>
              
              {/* Google Maps (preferred) or Leaflet fallback */}
              {USE_GOOGLE_MAPS ? (
                <GoogleMapPicker
                  position={{ lat: gpsCoords.lat, lng: gpsCoords.lng }}
                  onPositionChange={(newPos) => {
                    setGpsCoords(prev => ({ ...prev, lat: newPos.lat, lng: newPos.lng }));
                  }}
                  onAddressChange={(addr) => {
                    setAddress(addr);
                    setLocationStatus(`✅ ${t('Address updated')}`);
                    toast.success(t('Address updated from map'));
                  }}
                  height="350px"
                />
              ) : (
                <div className="rounded-b-xl overflow-hidden border-2 border-t-0 border-primary/20 shadow-lg relative z-0">
                  <div className="h-[300px] w-full">
                    <MapContainer
                      key={`map-${gpsCoords.lat}-${gpsCoords.lng}`}
                      center={[gpsCoords.lat, gpsCoords.lng]}
                      zoom={17}
                      scrollWheelZoom={true}
                      className="h-full w-full z-0"
                      zoomControl={true}
                    >
                      <MapInvalidator />
                      <RecenterMap center={mapCenter} />
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <DraggableMarker
                        position={[gpsCoords.lat, gpsCoords.lng]}
                        onDragEnd={handleMarkerDrag}
                      />
                    </MapContainer>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* GPS Pin Info */}
          {gpsCoords && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-green-800">
                  📍 {t('GPS Pin Captured')} {gpsCoords.accuracy ? `(±${Math.round(gpsCoords.accuracy)}m)` : ''}
                </span>
                <a
                  href={`https://www.google.com/maps?q=${gpsCoords.lat},${gpsCoords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                >
                  <Navigation className="h-3 w-3" />
                  {t('View on Google Maps')} ↗
                </a>
              </div>
              <p className="text-[10px] text-green-700">
                {t('This exact GPS pin will be shared with the delivery person for precise navigation.')}
              </p>
              <p className="text-[10px] text-green-600 font-mono">
                📌 {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}
              </p>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            💡 {USE_GOOGLE_MAPS 
              ? t('Tip: Use "Get My Location" for GPS, search in the map, or click/drag the pin. Also type your exact address above.')
              : t('Tip: Use "Get My Location" then drag the pin on the map to fine-tune. Also type your exact address above.')
            }
          </p>
        </div>
      </Card>

      {/* Payment Method */}
      <Card className="p-6 mb-6">
        <h3 className="mb-4 text-foreground">{t('Payment Method')}</h3>
          
          {(total === 0 && hasPendingWeightItem) || isTbdOrder ? (
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
            {/* Cash */}
            <div className="flex items-center space-x-2 p-4 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors">
              <RadioGroupItem value="cash" id="cash" />
              <Label htmlFor="cash" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Banknote className="h-5 w-5 text-primary" />
                  <div>
                    <p>{t('Cash')} ({orderType === 'delivery' ? t('on Delivery') : t('on Pickup')})</p>
                    <p className="text-sm text-muted-foreground">{t('Pay when you receive')}</p>
                  </div>
                </div>
              </Label>
            </div>
  
            {/* JazzCash */}
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
  
            {/* Credit / Debit Card */}
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
  
            {/* Bank Transfer */}
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
                      <span className="font-semibold text-foreground">Rs. {total}</span>
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

      {/* Place Order Button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handlePlaceOrder}
        disabled={(total === 0 && !hasPendingWeightItem && !isTbdOrder)}
      >
        {paymentMethod === 'cash' || isTbdOrder ? t('Place Order') : t('Proceed to Payment')} {isTbdOrder ? '(TBD)' : `(Rs. ${total})`}{(hasPendingWeightItem && !isTbdOrder) && " + TBD"}
      </Button>

      {/* ========================================= */}
      {/* PAYMENT DIALOG - Enhanced with all methods */}
      {/* ========================================= */}
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
          
          {/* ---- PROCESSING STATE ---- */}
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

          {/* ---- SUCCESS STATE ---- */}
          {paymentStep === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <p className="text-xl font-bold text-green-600">{t('Payment Successful!')}</p>
              <div className="w-full bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('Amount')}:</span>
                  <span className="font-bold">Rs. {total}</span>
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

          {/* ---- FAILED STATE ---- */}
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

          {/* ---- INPUT STATE ---- */}
          {paymentStep === 'input' && (
            <div className="space-y-4">
              {/* Amount Display */}
              <div className="text-center py-3 bg-secondary/30 rounded-lg">
                <p className="text-3xl font-bold text-foreground">Rs. {total}</p>
                <p className="text-sm text-muted-foreground">{t('Amount to pay')}</p>
                {hasPendingWeightItem && (
                  <p className="text-xs text-primary mt-1">
                    {t('(Additional charges for pending items will be due on delivery/pickup)')}
                  </p>
                )}
              </div>

              {/* Sandbox Helper Toggle */}
              <button
                onClick={() => setShowSandboxHelper(!showSandboxHelper)}
                className="w-full flex items-center justify-center gap-2 text-xs text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg py-2 px-3 transition-colors"
              >
                <TestTube2 className="h-3.5 w-3.5" />
                {showSandboxHelper ? t('Hide Sandbox Test Data') : t('Show Sandbox Test Data')}
              </button>

              {/* ======== JAZZCASH FORM ======== */}
              {paymentMethod === 'jazzcash' && (
                <div className="space-y-4">
                  {/* Sandbox Test Helpers */}
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

              {/* ======== CREDIT CARD FORM ======== */}
              {paymentMethod === 'card' && (
                <div className="space-y-4">
                  {/* Sandbox Test Helpers */}
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

                  {/* Card Number */}
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
                      {/* Card type indicator */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold">
                        {cardType === 'visa' && <span className="text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded">VISA</span>}
                        {cardType === 'mastercard' && <span className="text-orange-800 bg-orange-100 px-1.5 py-0.5 rounded">MC</span>}
                        {cardType === 'amex' && <span className="text-green-800 bg-green-100 px-1.5 py-0.5 rounded">AMEX</span>}
                      </div>
                    </div>
                  </div>

                  {/* Cardholder Name */}
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

                  {/* Expiry + CVV row */}
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

                  {/* Security note */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 rounded-lg p-2.5">
                    <Shield className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span>{t('Your card information is encrypted and secure. Sandbox mode - no real charges.')}</span>
                  </div>
                </div>
              )}

              {/* ======== BANK TRANSFER FORM ======== */}
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
                      <li>{t('Transfer Rs.')} {total} {t('to the account below')}</li>
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

              {/* Pay Button */}
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