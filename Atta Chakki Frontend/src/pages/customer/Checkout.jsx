import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '../../components/common/button';
import { Card } from '../../components/common/card';
import { useCart } from '../../store/CartContext';
import { useAuth } from '../../store/AuthContext';
import { API_BASE_URL } from '../../config';
import { useTranslation } from 'react-i18next';
import { SEO } from '../../components/common/SEO';
import { CAROUSEL_SLIDES } from '../../utils/checkoutHelpers';
import {
  CartItemsList,
  CouponBox,
  PriceSummary,
  useCheckoutAddress,
  AddressPickerSection,
  CustomerDetailsSection,
  OrderTypeSection,
  SchedulePreviewSection,
  PaymentMethodSection,
  PaymentDialog,
  useCheckoutOrder
} from '../../components/features/checkout';
import 'mapbox-gl/dist/mapbox-gl.css';

export function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { cart, getTotalPrice, removeFromCart, clearCart } = useCart();
  const { t } = useTranslation();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [orderType, setOrderType] = useState('pickup');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Background carousel
  const [currentSlide, setCurrentSlide] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Pre-fill customer details
  useEffect(() => {
    if (user && user.role === 'customer') {
      setCustomerName(user.full_name || user.name || '');
      setPhone(user.phone || user.username || '');
    }
  }, [user]);

  // Cart totals and properties
  const total = getTotalPrice();
  const originalTotal = cart.reduce((sum, item) => {
    const basePrice = item.service?.price || 0;
    return sum + (basePrice * item.quantity);
  }, 0);
  const productDiscount = originalTotal - total;

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
  const isTbdOrder = hasTripItem && !hasKgItem;
  const isKgOrder = !hasTripItem && cart.length > 0;

  useEffect(() => {
    if (hasTripItem) setOrderType('delivery');
  }, [hasTripItem]);

  // Address and geocoding hook
  const addressHook = useCheckoutAddress({ user, orderType, t });
  const {
    deliveryArea,
    setDeliveryArea,
    houseDetails,
    setHouseDetails,
    locationStatus,
    addressSuggestion,
    setAddressSuggestion,
    gpsCoords,
    deliveryFee,
    distanceKm,
    isOutOfLahore,
    searchTypedAddress,
    handleMarkerDrag,
    handleGetLocation,
    handleHouseDetailsBlur
  } = addressHook;

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [hasActiveCoupons, setHasActiveCoupons] = useState(false);

  useEffect(() => {
    const fetchActiveCouponsStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/coupons/get_coupons.php`);
        const data = await res.json();
        if (data.success && data.coupons) {
          const now = new Date();
          const hasActive = data.coupons.some(c => {
            if (c.is_active !== 1) return false;
            if (c.expiry_date && new Date(c.expiry_date) < now) return false;
            if (c.usage_limit && c.used_count >= c.usage_limit) return false;
            return true;
          });
          setHasActiveCoupons(hasActive);
        }
      } catch (err) {
        console.warn('Failed to fetch coupons status');
      }
    };
    fetchActiveCouponsStatus();
  }, []);

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
        setCouponError('');
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

  const couponDiscount = appliedCoupon ? appliedCoupon.discount_amount : 0;
  const vipDiscountAmount = user?.vip_discount ? (total - couponDiscount) * 0.10 : 0;
  const grandTotal = Math.max(0, Math.round(total + deliveryFee - couponDiscount - vipDiscountAmount));

  // Schedule preview state
  const [schedulePreview, setSchedulePreview] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  useEffect(() => {
    if (cart.length === 0 || hasTripItem) {
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
  }, [cart, hasTripItem]);

  // Order submission and payment processing hook
  const orderHook = useCheckoutOrder({
    user,
    customerName,
    phone,
    orderType,
    houseDetails,
    deliveryArea,
    gpsCoords,
    isOutOfLahore,
    cart,
    total,
    grandTotal,
    deliveryFee,
    distanceKm,
    paymentMethod,
    setPaymentMethod,
    appliedCoupon,
    hasPendingWeightItem,
    isTbdOrder,
    isKgOrder,
    hasTripItem,
    clearCart,
    navigate,
    location,
    t
  });

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <h1 className="mb-4 text-foreground text-2xl sm:text-3xl font-bold">{t('Your Cart is Empty')}</h1>
        <p className="text-muted-foreground mb-6">{t('Add some items from our services to get started')}</p>
        <Button onClick={() => navigate('/')}>{t('Browse Services')}</Button>
      </div>
    );
  }

  const isCartEmpty = total === 0 && !hasPendingWeightItem && !isTbdOrder;
  const isDeliveryInvalid = orderType === 'delivery' && (isOutOfLahore || !gpsCoords || !deliveryArea);

  return (
    <div className="relative min-h-screen">
      <SEO
        title="Checkout"
        description="Complete your order at Suchi Chakki. Secure checkout for fresh flour and premium services."
      />
      {CAROUSEL_SLIDES.map((slide, i) => (
        <div
          key={i}
          className="fixed inset-0 w-full h-full bg-cover bg-center transition-opacity duration-[1500ms] ease-in-out -z-20"
          style={{
            backgroundImage: `url(${slide})`,
            opacity: i === currentSlide ? 1 : 0,
          }}
        />
      ))}
      <div className="fixed inset-0 w-full h-full bg-[linear-gradient(to_bottom,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0.3)_50%,rgba(0,0,0,0.5)_100%)] -z-10" />

      <div className="container mx-auto px-4 py-8 max-w-3xl relative z-10">
        <h1 className="mb-6 text-white text-2xl sm:text-3xl font-bold drop-shadow-md">{t('Checkout')}</h1>

        <Card className="p-6 mb-6">
          <h3 className="mb-4 text-foreground">{t('Order Summary')}</h3>
          <div className="space-y-4">
            <CartItemsList cart={cart} removeFromCart={removeFromCart} t={t} />

            <PriceSummary
              originalTotal={originalTotal}
              productDiscount={productDiscount}
              total={total}
              orderType={orderType}
              isOutOfLahore={isOutOfLahore}
              distanceKm={distanceKm}
              user={user}
              deliveryFee={deliveryFee}
              couponDiscount={couponDiscount}
              vipDiscountAmount={vipDiscountAmount}
              grandTotal={grandTotal}
              isTbdOrder={isTbdOrder}
              hasPendingWeightItem={hasPendingWeightItem}
              t={t}
              couponSlot={
                !isTbdOrder && hasActiveCoupons ? (
                  <CouponBox
                    couponCode={couponCode}
                    setCouponCode={setCouponCode}
                    appliedCoupon={appliedCoupon}
                    validatingCoupon={validatingCoupon}
                    couponError={couponError}
                    validateCoupon={validateCoupon}
                    removeCoupon={removeCoupon}
                    t={t}
                  />
                ) : null
              }
            />
          </div>
        </Card>

        <CustomerDetailsSection
          customerName={customerName}
          setCustomerName={setCustomerName}
          phone={phone}
          setPhone={setPhone}
          t={t}
        />

        <OrderTypeSection
          orderType={orderType}
          setOrderType={setOrderType}
          hasTripItem={hasTripItem}
          t={t}
        />

        <AddressPickerSection
          orderType={orderType}
          isOutOfLahore={isOutOfLahore}
          deliveryArea={deliveryArea}
          setDeliveryArea={setDeliveryArea}
          houseDetails={houseDetails}
          setHouseDetails={setHouseDetails}
          locationStatus={locationStatus}
          addressSuggestion={addressSuggestion}
          setAddressSuggestion={setAddressSuggestion}
          gpsCoords={gpsCoords}
          distanceKm={distanceKm}
          searchTypedAddress={searchTypedAddress}
          handleMarkerDrag={handleMarkerDrag}
          handleGetLocation={handleGetLocation}
          handleHouseDetailsBlur={handleHouseDetailsBlur}
          t={t}
        />

        <PaymentMethodSection
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          orderType={orderType}
          paySettings={orderHook.paySettings}
          isSandboxEnv={orderHook.isSandboxEnv}
          total={total}
          hasPendingWeightItem={hasPendingWeightItem}
          isTbdOrder={isTbdOrder}
          t={t}
        />

        <SchedulePreviewSection
          schedulePreview={schedulePreview}
          scheduleLoading={scheduleLoading}
          hasTripItem={hasTripItem}
          t={t}
        />

        <Button
          className="w-full h-12 text-base font-bold shadow-lg"
          size="lg"
          onClick={orderHook.handlePlaceOrder}
          disabled={isCartEmpty || isDeliveryInvalid || orderHook.isPlacingOrder}
        >
          {orderHook.isPlacingOrder ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('Placing Order...')}
            </>
          ) : (
            <>
              {paymentMethod === 'cash' || isTbdOrder ? t('Place Order') : t('Proceed to Payment')} {isTbdOrder ? '(TBD)' : `(Rs. ${grandTotal})`}{(hasPendingWeightItem && !isTbdOrder) && " + TBD"}
            </>
          )}
        </Button>

        <PaymentDialog
          showPaymentDialog={orderHook.showPaymentDialog}
          setShowPaymentDialog={orderHook.setShowPaymentDialog}
          paymentMethod={paymentMethod}
          paymentStep={orderHook.paymentStep}
          setPaymentStep={orderHook.setPaymentStep}
          paymentResult={orderHook.paymentResult}
          setPaymentResult={orderHook.setPaymentResult}
          isProcessingPayment={orderHook.isProcessingPayment}
          grandTotal={grandTotal}
          hasPendingWeightItem={hasPendingWeightItem}
          isSandboxEnv={orderHook.isSandboxEnv}
          mobileNumber={orderHook.mobileNumber}
          setMobileNumber={orderHook.setMobileNumber}
          cnicLast6={orderHook.cnicLast6}
          setCnicLast6={orderHook.setCnicLast6}
          cardNumber={orderHook.cardNumber}
          setCardNumber={orderHook.setCardNumber}
          cardName={orderHook.cardName}
          setCardName={orderHook.setCardName}
          cardExpiry={orderHook.cardExpiry}
          setCardExpiry={orderHook.setCardExpiry}
          cardCvv={orderHook.cardCvv}
          setCardCvv={orderHook.setCardCvv}
          bankAccountNumber={orderHook.bankAccountNumber}
          setBankAccountNumber={orderHook.setBankAccountNumber}
          bankDetails={orderHook.bankDetails}
          processOnlinePayment={orderHook.processOnlinePayment}
          t={t}
        />
      </div>
    </div>
  );
}

export default Checkout;
