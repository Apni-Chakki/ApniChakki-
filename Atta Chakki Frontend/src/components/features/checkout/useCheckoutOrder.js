import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../../config';

const NON_LAHORE_CITIES = [
  'faisalabad', 'karachi', 'islamabad', 'rawalpindi', 'multan', 'gujranwala', 'peshawar', 
  'quetta', 'sialkot', 'hyderabad', 'sargodha', 'bahawalpur', 'sukkur', 'jhang', 'sheikhupura', 
  'kasur', 'okara', 'gujrat', 'mardan', 'abbottabad', 'murree', 'sahiwal', 'wah cantt', 'taxila',
  'dera ghazi khan', 'mirpur', 'muzaffarabad', 'gilgit', 'skardu', 'chaman', 'larkana', 'nawabshah'
];

export function useCheckoutOrder({
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
}) {
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentStep, setPaymentStep] = useState('input');
  const [paymentResult, setPaymentResult] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [mobileNumber, setMobileNumber] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [cnicLast6, setCnicLast6] = useState('');

  const [isSandboxEnv, setIsSandboxEnv] = useState(true);
  const [paySettings, setPaySettings] = useState({
    pay_method_cod_enabled: '1',
    pay_method_jazzcash_enabled: '1',
    pay_method_card_enabled: '1',
    pay_method_bank_enabled: '1',
  });
  const [bankDetails, setBankDetails] = useState({
    bank_name: 'Meezan Bank',
    account_name: 'Suchi Chakki',
    account_number: '0123-4567890',
    iban: 'PK00 MEZN 0000 0000 0000 0000'
  });

  useEffect(() => {
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
          
          if (settings.pay_method_cod_enabled === '0') {
            if (settings.pay_method_jazzcash_enabled === '1') setPaymentMethod('jazzcash');
            else if (settings.pay_method_card_enabled === '1') setPaymentMethod('card');
            else if (settings.pay_method_bank_enabled === '1') setPaymentMethod('bank');
          }
        }
      } catch (err) {
        console.warn('Failed to load payment settings.');
      }

      try {
        const pRes = await fetch(`${API_BASE_URL}/payments/get_payment_config.php`);
        const pData = await pRes.json();
        if (pData.success && typeof pData.is_sandbox === 'boolean') {
          setIsSandboxEnv(pData.is_sandbox);
        }
      } catch (err) {
        console.warn('Failed to load payment gateway config.');
      }

      try {
        const bRes = await fetch(`${API_BASE_URL}/manage_wallets.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_bank_details' })
        });
        const bData = await bRes.json();
        if (bData.success && bData.bank_details) {
          setBankDetails(bData.bank_details);
        }
      } catch (err) {
        console.warn('Failed to load bank transfer details.');
      }
    };
    fetchPaySettings();
  }, [setPaymentMethod]);

  const buildDeliveryAddress = () => {
    if (orderType !== 'delivery') return 'Pickup From Store';

    const h = (houseDetails || '').trim();
    const a = (deliveryArea || '').trim();
    let full = '';
    if (h && a) {
      if (h === a) {
        full = a;
      } else if (h.toLowerCase().includes(a.toLowerCase())) {
        full = h;
      } else {
        full = `${h}, ${a}`;
      }
    } else {
      full = h || a || '';
    }
    if (gpsCoords && gpsCoords.lat && gpsCoords.lng && !full.includes('[GPS:')) {
      full += ` [GPS: ${gpsCoords.lat.toFixed(6)}, ${gpsCoords.lng.toFixed(6)}]`;
    }
    return full;
  };

  const mapCartItems = () => {
    return cart.map(item => {
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
        selected_mix_items: item.service.is_custom_mix ? (item.service.selected_mix_items || []) : [],
        is_custom_mix: item.service.is_custom_mix ? 1 : 0,
        is_rental: isRental ? 1 : 0,
        rental_start_date: isRental ? item.service.rental_start_date : null,
        rental_days: isRental ? item.service.rental_days : null,
        rental_price_per_day: isRental ? item.service.rental_price_per_day : null,
        security_deposit: isRental ? item.service.security_deposit : null,
        late_penalty_per_day: isRental ? item.service.late_penalty_per_day : null
      };
    });
  };

  const handlePlaceOrder = () => {
    if (isPlacingOrder) return;
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
    const isPlaceholder = cleanPhone.startsWith('G-') || !/^\d{11}$/.test(cleanPhone);
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
        toast.error(t('Out of city service not available'));
        return;
      }

      if (!hasMap && hasManual) {
        const manualLower = houseDetails.toLowerCase();
        if (NON_LAHORE_CITIES.some(c => manualLower.includes(c)) || (!manualLower.includes('lahore') && !manualLower.includes('lhr'))) {
          toast.error(t('Out of city service not available'));
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

      const fullDeliveryAddress = buildDeliveryAddress();

      const orderData = {
        user_id: user.id,
        customer_name: customerName,
        customer_phone: phone,
        cart_items: mapCartItems(),
        total: isTbdOrder ? 0 : grandTotal,
        address: fullDeliveryAddress,
        latitude: gpsCoords?.lat || null,
        longitude: gpsCoords?.lng || null,
        payment_method: isTbdOrder ? 'cash' : paymentMethod,
        payment_status: 'pending',
        amount_paid: 0,
        order_type: orderType,
        is_pickup_request: hasTripItem,
        is_kg_order: isKgOrder,
        coupon_code: appliedCoupon ? appliedCoupon.code : null
      };

      const token = localStorage.getItem('token');
      const orderHeaders = { 'Content-Type': 'application/json' };
      if (token) orderHeaders['Authorization'] = `Bearer ${token}`;

      const orderResponse = await fetch(`${API_BASE_URL}/place_order.php`, {
        method: 'POST',
        headers: orderHeaders,
        body: JSON.stringify(orderData),
      });

      const orderResult = await orderResponse.json();
      if (!orderResult.success) {
        if (orderResponse.status === 409 || orderResult.error_code === 'OUT_OF_STOCK_RACE') {
          toast.error(t('Stock Conflict: Another customer just purchased this item! Please adjust your cart quantity.'));
        }
        throw new Error(orderResult.message || 'Failed to create order');
      }

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
    if (isPlacingOrder) return;
    setIsPlacingOrder(true);

    let finalStatus = paymentStatus;
    if (hasPendingWeightItem && paymentStatus === 'paid') {
      finalStatus = 'partial';
    }

    const deliveryAddress = buildDeliveryAddress();

    const orderData = {
      user_id: user.id,
      customer_name: customerName,
      customer_phone: phone,
      cart_items: mapCartItems(),
      total: isTbdOrder ? 0 : grandTotal,
      delivery_fee: deliveryFee,
      distance_km: (distanceKm || 0).toFixed(1),
      address: deliveryAddress,
      latitude: gpsCoords?.lat || null,
      longitude: gpsCoords?.lng || null,
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
      const token = localStorage.getItem('token');
      const orderHeaders = { 'Content-Type': 'application/json' };
      if (token) orderHeaders['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/place_order.php`, {
        method: 'POST',
        headers: orderHeaders,
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.success) {
        if (window.fbq) {
          window.fbq('track', 'Purchase', {
            value: grandTotal,
            currency: 'PKR'
          });
        }
        let displayMessage = result.message || t('Order placed successfully!');
        if (paymentMethod === 'cod' || paymentMethod === 'cash') {
          displayMessage = displayMessage.replace(/\.?\s*(Full amount\s*)?Rs\.?\s*[\d,.]+\s*added to Udhaar\.?/gi, '').trim();
        }
        toast.success(displayMessage || t('Order placed successfully!'));
        clearCart(); 
        navigate(`/order-confirmation/${result.order_id}`); 
      } else {
        if (response.status === 409 || result.error_code === 'OUT_OF_STOCK_RACE') {
          toast.error(
            t('Stock Conflict: Another customer just purchased this item! Please adjust your cart quantity.'),
            { duration: 7000 }
          );
        } else {
          toast.error(t('Failed to place order') + ': ' + (result.message || 'Server error'));
        }
      }
    } catch (error) {
      console.error('Order Error:', error);
      toast.error(t('Network error. Check your internet or server.'));
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return {
    isPlacingOrder,
    showPaymentDialog,
    setShowPaymentDialog,
    paymentStep,
    setPaymentStep,
    paymentResult,
    setPaymentResult,
    isProcessingPayment,
    mobileNumber,
    setMobileNumber,
    bankAccountNumber,
    setBankAccountNumber,
    cardNumber,
    setCardNumber,
    cardExpiry,
    setCardExpiry,
    cardCvv,
    setCardCvv,
    cardName,
    setCardName,
    cnicLast6,
    setCnicLast6,
    isSandboxEnv,
    paySettings,
    bankDetails,
    handlePlaceOrder,
    processOnlinePayment,
    completeOrder,
  };
}
