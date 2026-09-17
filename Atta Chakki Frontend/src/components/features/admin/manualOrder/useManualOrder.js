import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../../../config';

export function useManualOrder() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);

  const [orderType, setOrderType] = useState('pickup'); // 'pickup' | 'delivery'
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: 'Shop Pickup',
  });

  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [orderStatus, setOrderStatus] = useState('pending');

  // selected item ke add-ons / options
  const [selectedOptions, setSelectedOptions] = useState({});

  // Rental specific states
  const [rentalDays, setRentalDays] = useState(1);
  const [rentalStartDate, setRentalStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const getEffectiveCustomizations = (product) => {
    if (!product) return [];
    if (product.customizations && product.customizations.length > 0) {
      return product.customizations;
    }
    if (product.is_grinding_service == 1 || product.is_grinding_service === true) {
      return [
        { option_name: 'Cleaning', option_price: product.cleaning_price || 0 },
        { option_name: 'Grinding', option_price: product.grinding_price || 0 },
      ];
    }
    return [];
  };

  useEffect(() => {
    if (selectedProduct) {
      const product = products.find((p) => p.id.toString() === selectedProduct.toString());
      if (product) {
        const isRental = product.is_rental == 1 || product.is_rental === true || product.is_rental === '1';
        if (isRental) {
          setRentalDays(1);
          setRentalStartDate(new Date().toISOString().slice(0, 10));
        }
        const custs = getEffectiveCustomizations(product);
        const defaults = {};
        custs.forEach((_, i) => {
          defaults[i] = true;
        });
        setSelectedOptions(defaults);
      }
    }
  }, [selectedProduct, products]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/get_products.php`);
        const data = await response.json();

        if (data.success && Array.isArray(data.products)) {
          setProducts(data.products);
        } else {
          toast.error(t('Failed to load products list.'));
        }
      } catch (error) {
        console.error('Fetch Error:', error);
        toast.error(t('Network Error: Could not connect to database.'));
      }
    };

    loadProducts();
  }, [t]);

  const computeProductPrice = (product, selOptions, days = rentalDays) => {
    if (!product) return { originalPrice: 0, finalPrice: 0 };
    const isRental = product.is_rental == 1 || product.is_rental === true || product.is_rental === '1';
    if (isRental) {
      const dailyRate = parseFloat(product.rental_price_per_day) || 0;
      const deposit = parseFloat(product.security_deposit) || 0;
      const numDays = Math.max(1, parseInt(days) || 1);
      const rentalCost = Math.round(dailyRate * numDays);
      const unitTotal = rentalCost + deposit;
      return {
        originalPrice: unitTotal,
        finalPrice: unitTotal,
        dailyRate,
        deposit,
        rentalCost,
        numDays,
        isRental: true
      };
    }

    const custs = getEffectiveCustomizations(product);
    const hasCustomizations = custs.length > 0;
    let basePrice = parseFloat(product.price) || 0;

    if (hasCustomizations) {
      const pricingMode =
        product.customization_pricing_mode ||
        (product.is_grinding_service == 1 ? 'additive' : 'average');
      const selectedIndices = Object.keys(selOptions).filter((i) => selOptions[i]);

      if (pricingMode === 'average') {
        if (selectedIndices.length > 0) {
          const sum = selectedIndices.reduce(
            (acc, i) => acc + (parseFloat(custs[i]?.option_price) || 0),
            0
          );
          basePrice = Math.round(sum / selectedIndices.length);
        } else {
          basePrice = 0;
        }
      } else {
        // additive mode
        basePrice = custs.reduce(
          (sum, c, i) => sum + (selOptions[i] ? parseFloat(c.option_price) || 0 : 0),
          0
        );
        if (basePrice === 0 && selectedIndices.length === 0) {
          basePrice = parseFloat(product.price) || 0;
        }
      }
    }

    let finalPrice = basePrice;
    const discountType = product.discount_type || 'none';
    const discountValue = parseFloat(product.discount_value) || 0;
    if (discountType === 'percentage' && discountValue > 0) {
      finalPrice = Math.max(0, basePrice - (basePrice * Math.min(discountValue, 100)) / 100);
    } else if (discountType === 'fixed' && discountValue > 0) {
      finalPrice = Math.max(0, basePrice - discountValue);
    }

    return { originalPrice: basePrice, finalPrice, isRental: false };
  };

  const addToCart = () => {
    if (!selectedProduct) return;

    const product = products.find((p) => p.id.toString() === selectedProduct.toString());
    if (!product) return;

    const isRental = product.is_rental == 1 || product.is_rental === true || product.is_rental === '1';
    const requestedQty = parseInt(qty) || 1;

    if (isRental) {
      const availableQty = parseFloat(product.rental_available_qty || 0);
      const existingQty = cart
        .filter((item) => item.id === product.id && item.is_rental === 1)
        .reduce((sum, item) => sum + item.quantity, 0);

      if (availableQty > 0 && requestedQty + existingQty > availableQty) {
        toast.error(
          `${t('Insufficient available rental quantity')}. ${t('Available')}: ${availableQty}. ${t('Already in cart')}: ${existingQty}`
        );
        return;
      }

      const dailyRate = parseFloat(product.rental_price_per_day) || 0;
      const deposit = parseFloat(product.security_deposit) || 0;
      const latePenalty = parseFloat(product.late_penalty_per_day) || 0;
      const numDays = Math.max(1, parseInt(rentalDays) || 1);
      const unitPrice = (dailyRate * numDays) + deposit;

      const newItem = {
        id: product.id,
        name: product.name,
        price: unitPrice,
        original_price: unitPrice,
        quantity: requestedQty,
        is_rental: 1,
        rental_days: numDays,
        rental_start_date: rentalStartDate || new Date().toISOString().slice(0, 10),
        rental_price_per_day: dailyRate,
        security_deposit: deposit,
        late_penalty_per_day: latePenalty,
        is_cleaning: 0,
        is_grinding: 0,
        has_customizations: false,
        selected_customizations: [],
      };

      setCart([...cart, newItem]);
      setSelectedProduct('');
      setQty(1);
      setRentalDays(1);
      return;
    }

    const custs = getEffectiveCustomizations(product);
    const hasCustomizations = custs.length > 0;

    // Stock validation
    const isService = product.unit?.toLowerCase() === 'trip';
    const existingQty = cart
      .filter((item) => item.id === product.id)
      .reduce((sum, item) => sum + item.quantity, 0);

    if (
      !isService &&
      !hasCustomizations &&
      product.stock_quantity < requestedQty + existingQty
    ) {
      toast.error(
        `${t('Insufficient stock')}. ${t('Available')}: ${product.stock_quantity}. ${t('Already in cart')}: ${existingQty}`
      );
      return;
    }

    const { originalPrice, finalPrice } = computeProductPrice(product, selectedOptions);

    const selected = [];
    if (hasCustomizations) {
      custs.forEach((c, i) => {
        if (selectedOptions[i]) {
          selected.push({
            option_name: c.option_name,
            option_price: parseFloat(c.option_price || 0),
          });
        }
      });
    }

    // cleaning pisai check
    const isCleaning = selected.some((s) => s.option_name.toLowerCase().includes('clean')) ? 1 : 0;
    const isGrinding = selected.some((s) => s.option_name.toLowerCase().includes('grind')) ? 1 : 0;

    const newItem = {
      id: product.id,
      name: product.name,
      price: finalPrice,
      original_price: originalPrice,
      quantity: requestedQty,
      is_rental: 0,
      is_cleaning: hasCustomizations ? isCleaning : 0,
      is_grinding: hasCustomizations ? isGrinding : 0,
      has_customizations: hasCustomizations,
      selected_customizations: selected,
    };

    setCart([...cart, newItem]);
    setSelectedProduct('');
    setQty(1);
  };

  const removeFromCart = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, ''); // only numeric characters
    if (val.length > 11) {
      val = val.slice(0, 11);
    }
    setCustomer((prev) => ({ ...prev, phone: val }));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleSubmit = async () => {
    const cleanPhone = (customer.phone || '').trim();
    if (!cleanPhone) {
      toast.error(t('Please enter customer phone number.'));
      return;
    }

    if (!cleanPhone.startsWith('0')) {
      toast.error(t('Phone number must start with 0 (e.g. 03001234567).'));
      return;
    }

    if (cleanPhone.length !== 11) {
      toast.error(t('Phone number must be exactly 11 digits (e.g. 03001234567).'));
      return;
    }

    if (cart.length === 0) {
      toast.error(t('Please add at least one item to the cart.'));
      return;
    }

    if (orderType === 'delivery') {
      const addr = (customer.address || '').trim();
      if (!addr || addr.toLowerCase() === 'shop pickup') {
        toast.error(t('Please enter a valid delivery address for Home Delivery.'));
        return;
      }
    }

    setLoading(true);
    try {
      const orderTotal = calculateTotal();
      let paidAmount = 0;
      if (paymentStatus === 'paid') {
        paidAmount = orderTotal;
      } else if (paymentStatus === 'partial') {
        paidAmount = parseFloat(amountPaid) || 0;
        if (paidAmount <= 0 || paidAmount >= orderTotal) {
          toast.error(t('Partial amount must be between 1 and ') + (orderTotal - 1));
          setLoading(false);
          return;
        }
      }

      const finalAddress =
        orderType === 'pickup'
          ? customer.address?.trim() || 'Shop Pickup'
          : customer.address.trim();

      const payload = {
        name: customer.name,
        phone: cleanPhone,
        order_type: orderType,
        address: finalAddress,
        items: cart,
        total: orderTotal,
        status: orderStatus,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        amount_paid: paidAmount,
      };

      const response = await fetch(`${API_BASE_URL}/admin_create_order.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('Order Created Successfully!'));
        navigate('/admin');
      } else {
        toast.error(data.message || t('Failed to create order'));
      }
    } catch (error) {
      console.error(error);
      toast.error(t('Network Error'));
    } finally {
      setLoading(false);
    }
  };

  const currentProduct = products.find((p) => p.id.toString() === selectedProduct.toString());
  const currentCustomizations = currentProduct ? getEffectiveCustomizations(currentProduct) : [];

  return {
    products,
    loading,
    orderType,
    setOrderType,
    customer,
    setCustomer,
    cart,
    selectedProduct,
    setSelectedProduct,
    qty,
    setQty,
    paymentStatus,
    setPaymentStatus,
    paymentMethod,
    setPaymentMethod,
    amountPaid,
    setAmountPaid,
    orderStatus,
    setOrderStatus,
    selectedOptions,
    setSelectedOptions,
    rentalDays,
    setRentalDays,
    rentalStartDate,
    setRentalStartDate,
    currentProduct,
    currentCustomizations,
    computeProductPrice,
    addToCart,
    removeFromCart,
    handlePhoneChange,
    calculateTotal,
    handleSubmit,
    navigate,
    t,
  };
}
