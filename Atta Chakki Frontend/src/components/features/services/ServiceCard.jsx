import { useState, useEffect, memo } from 'react';
import { Card } from '@/components/common/card';
import { useCart } from '@/store/CartContext';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config';
import { useAuth } from '@/store/AuthContext';
import { useDynamicTranslation } from '@/hooks/useDynamicTranslation';

import { RentalModal } from './RentalModal';
import { CustomMixModal } from './CustomMixModal';
import { CustomizationsModal } from './CustomizationsModal';
import { useServicePricing } from './useServicePricing';
import { ServiceCardMedia } from './ServiceCardMedia';
import { ServicePricingBlock } from './ServicePricingBlock';
import { ServiceCardActions } from './ServiceCardActions';

export const ServiceCard = memo(function ServiceCard({ service }) {
  const [quantity, setQuantity] = useState(1);
  const [isPickupRequested, setIsPickupRequested] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const { addToCart } = useCart();
  const { t, tDynamic } = useDynamicTranslation();
  const { user } = useAuth();

  // Dialog open states
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [showMixModal, setShowMixModal] = useState(false);
  const [showCustomizationsModal, setShowCustomizationsModal] = useState(false);

  // Rental configuration states
  const [rentalDays, setRentalDays] = useState(1);
  const [rentalStartDate, setRentalStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [rentalQty, setRentalQty] = useState(1);

  // Custom request inquiry states
  const [showCustomRequest, setShowCustomRequest] = useState(false);
  const [customRequestData, setCustomRequestData] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
  });
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Encapsulated Pricing, Discounts, Mix Normalization, and Stock Calculations
  const pricing = useServicePricing(service, quantity);

  const handlePlaceRental = () => {
    if (!user) {
      toast.error(t('Please login to rent this item.'));
      return;
    }
    const qtyNum = Math.max(1, parseInt(rentalQty || 1, 10));
    const daysNum = Math.max(1, parseInt(rentalDays || 1, 10));

    if (qtyNum <= 0) {
      toast.error(t('Quantity must be greater than 0.'));
      return;
    }
    if (qtyNum > parseFloat(service.rental_available_qty || 0)) {
      toast.error(t('Insufficient available rental quantity.'));
      return;
    }

    const rentalItem = {
      ...service,
      is_rental: true,
      rental_start_date: rentalStartDate,
      rental_days: daysNum,
      rental_price_per_day: parseFloat(service.rental_price_per_day) || 0,
      security_deposit: parseFloat(service.security_deposit) || 0,
      late_penalty_per_day: parseFloat(service.late_penalty_per_day) || 0,
    };

    addToCart(rentalItem, qtyNum);
    setShowRentalModal(false);
  };

  const handleAddToCart = () => {
    if (pricing.isOnlyPickup) {
      handleAddPickupRequest();
      return;
    }
    if (pricing.isOutOfStock) {
      toast.error(t('This item is out of stock.'));
      return;
    }
    if (!pricing.isOnlyPickup && !pricing.isRental && pricing.stock !== Infinity && quantity > pricing.stock) {
      toast.error(`${t('Only')} ${pricing.stock} ${pricing.isDualUnit ? 'kg' : pricing.displayUnit} ${t('left')}!`);
      return;
    }

    const unitLabel = pricing.isDualUnit ? 'kg' : pricing.displayUnit;

    if (pricing.isCustomMix) {
      const selectedMix = pricing.getSelectedMixItems();
      if (!selectedMix || selectedMix.length === 0) {
        toast.error(t('Please select at least one ingredient ratio'));
        return;
      }

      addToCart(
        {
          ...service,
          price: parseFloat(pricing.effectivePrice),
          original_price: pricing.baseForDiscount,
          discount_type: pricing.discountType,
          discount_value: pricing.discountValue,
          unit: pricing.isDualUnit ? 'kg' : service.unit,
          is_cleaning: false,
          is_grinding: false,
          selected_customizations: [],
          selected_mix_items: selectedMix,
          is_custom_mix: true,
        },
        quantity,
        false
      );

      toast.success(t(`Added ${quantity} ${unitLabel} of Custom Mix to cart`));
      setQuantity(1);
      setIsAddedToCart(true);
      return;
    }

    const selected = pricing.getSelectedCustomizations();
    if (pricing.hasCustomizations && selected.length === 0) {
      toast.error(t('Please select at least one service option'));
      return;
    }

    const isCleaning = selected.some((s) => s.option_name.toLowerCase().includes('clean'));
    const isGrinding = selected.some((s) => s.option_name.toLowerCase().includes('grind'));

    addToCart(
      {
        ...service,
        price: pricing.effectivePrice,
        original_price: pricing.baseForDiscount,
        discount_type: pricing.discountType,
        discount_value: pricing.discountValue,
        unit: pricing.isDualUnit ? 'kg' : service.unit,
        is_cleaning: isCleaning,
        is_grinding: isGrinding,
        selected_customizations: selected,
      },
      quantity,
      false
    );

    toast.success(t(`Added ${quantity} ${unitLabel} of ${service.name} to cart`));
    setQuantity(1);
    setIsAddedToCart(true);
    setIsPickupRequested(false);
  };

  const handleQuickAdd = (presetQty) => {
    if (pricing.isOutOfStock) {
      toast.error(t('This item is out of stock.'));
      return;
    }
    if (!pricing.isOnlyPickup && !pricing.isRental && pricing.stock !== Infinity && presetQty > pricing.stock) {
      toast.error(`${t('Only')} ${pricing.stock} ${pricing.isDualUnit ? 'kg' : pricing.displayUnit} ${t('left')}!`);
      return;
    }

    const unitLabel = pricing.isDualUnit ? 'kg' : pricing.displayUnit;

    if (pricing.isCustomMix) {
      const selectedMix = pricing.getSelectedMixItems();
      if (!selectedMix || selectedMix.length === 0) {
        toast.error(t('Please select at least one ingredient ratio'));
        return;
      }

      addToCart(
        {
          ...service,
          price: parseFloat(pricing.effectivePrice),
          original_price: pricing.baseForDiscount,
          discount_type: pricing.discountType,
          discount_value: pricing.discountValue,
          unit: pricing.isDualUnit ? 'kg' : service.unit,
          is_cleaning: false,
          is_grinding: false,
          selected_customizations: [],
          selected_mix_items: selectedMix,
          is_custom_mix: true,
        },
        presetQty,
        false
      );

      toast.success(t(`Added ${presetQty} ${unitLabel} of Custom Mix to cart`));
      setIsAddedToCart(true);
      return;
    }

    const selected = pricing.getSelectedCustomizations();
    if (pricing.hasCustomizations && selected.length === 0) {
      toast.error(t('Please select at least one service option'));
      return;
    }

    const isCleaning = selected.some((s) => s.option_name.toLowerCase().includes('clean'));
    const isGrinding = selected.some((s) => s.option_name.toLowerCase().includes('grind'));

    addToCart(
      {
        ...service,
        price: pricing.effectivePrice,
        original_price: pricing.baseForDiscount,
        discount_type: pricing.discountType,
        discount_value: pricing.discountValue,
        unit: pricing.isDualUnit ? 'kg' : service.unit,
        is_cleaning: isCleaning,
        is_grinding: isGrinding,
        selected_customizations: selected,
      },
      presetQty,
      false
    );

    toast.success(t(`Added ${presetQty} ${unitLabel} of ${service.name} to cart`));
    setIsAddedToCart(true);
    setIsPickupRequested(false);
  };

  const handleAddPickupRequest = () => {
    if (pricing.isCustomMix) {
      toast.error(t('Pickup request is not available for custom mixes directly.'));
      return;
    }

    const selected = pricing.getSelectedCustomizations();
    if (pricing.hasCustomizations && selected.length === 0) {
      toast.error(t('Please select at least one service option'));
      return;
    }

    const isCleaning = selected.some((s) => s.option_name.toLowerCase().includes('clean'));
    const isGrinding = selected.some((s) => s.option_name.toLowerCase().includes('grind'));

    addToCart(
      {
        ...service,
        price: pricing.effectivePrice,
        original_price: pricing.baseForDiscount,
        discount_type: pricing.discountType,
        discount_value: pricing.discountValue,
        unit: 'trip',
        is_cleaning: isCleaning,
        is_grinding: isGrinding,
        selected_customizations: selected,
      },
      quantity,
      true
    );

    toast.success(t('Pickup request added to cart.'));
    setIsPickupRequested(true);
    setIsAddedToCart(false);
  };

  const submitCustomRequest = async () => {
    if (!customRequestData.name || !customRequestData.phone) {
      toast.error(t('Please enter your name and phone number.'));
      return;
    }

    setIsSubmittingRequest(true);
    try {
      const payload = {
        product_id: service.id,
        product_name: service.name,
        customer_name: customRequestData.name,
        customer_phone: customRequestData.phone,
        customer_email: customRequestData.email,
        selected_items: pricing.getSelectedMixItems(),
        custom_items: customRequestData.message,
        total_quantity: quantity,
        estimated_price: pricing.currentPrice,
      };

      const response = await fetch(`${API_BASE_URL}/submit_custom_mix_request.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t(data.message));
        setShowCustomRequest(false);
        setCustomRequestData({ name: '', phone: '', email: '', message: '' });
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      toast.error(err.message || t('Failed to submit request'));
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div className="h-full transition-transform duration-200 hover:-translate-y-1">
      <Card className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow h-full relative">
        {/* Media (Image, Badges, Out of Stock) */}
        <ServiceCardMedia
          service={service}
          isRental={pricing.isRental}
          badgeText={pricing.badgeText}
          hasDiscount={pricing.hasDiscount}
          discountType={pricing.discountType}
          discountValue={pricing.discountValue}
          isOutOfStock={pricing.isOutOfStock}
          t={t}
          tDynamic={tDynamic}
        />

        {/* Card Body & Pricing */}
        <div className="p-4 flex flex-col gap-3 flex-1">
          <ServicePricingBlock
            service={service}
            isRental={pricing.isRental}
            hasDiscount={pricing.hasDiscount}
            effectivePrice={pricing.effectivePrice}
            baseForDiscount={pricing.baseForDiscount}
            currentPrice={pricing.currentPrice}
            isDualUnit={pricing.isDualUnit}
            displayUnit={pricing.displayUnit}
            t={t}
            tDynamic={tDynamic}
          />

          {/* Action Buttons & Quantity Selector */}
          <ServiceCardActions
            service={service}
            isRental={pricing.isRental}
            onOpenRentalModal={() => setShowRentalModal(true)}
            isCustomMix={pricing.isCustomMix}
            onOpenMixModal={() => setShowMixModal(true)}
            hasCustomizations={pricing.hasCustomizations}
            selectedOptions={pricing.selectedOptions}
            onOpenCustomizationsModal={() => setShowCustomizationsModal(true)}
            showPickupButton={pricing.showPickupButton}
            isPickupRequested={isPickupRequested}
            onAddPickupRequest={handleAddPickupRequest}
            isDualUnit={pricing.isDualUnit}
            isOnlyPickup={pricing.isOnlyPickup}
            quantity={quantity}
            setQuantity={setQuantity}
            hasQuickOptions={pricing.hasQuickOptions}
            quickOptions={pricing.quickOptions}
            displayUnit={pricing.displayUnit}
            isOutOfStock={pricing.isOutOfStock}
            isQuantityExceeded={pricing.isQuantityExceeded}
            stock={pricing.stock}
            handleQuickAdd={handleQuickAdd}
            handleAddToCart={handleAddToCart}
            isAddedToCart={isAddedToCart}
            currentPrice={pricing.currentPrice}
            t={t}
          />
        </div>
      </Card>

      {/* Existing Modals */}
      <RentalModal
        showRentalModal={showRentalModal}
        setShowRentalModal={setShowRentalModal}
        service={service}
        rentalDays={rentalDays}
        setRentalDays={setRentalDays}
        rentalStartDate={rentalStartDate}
        setRentalStartDate={setRentalStartDate}
        rentalQty={rentalQty}
        setRentalQty={setRentalQty}
        handlePlaceRental={handlePlaceRental}
        user={user}
        t={t}
        tDynamic={tDynamic}
      />

      <CustomMixModal
        showMixModal={showMixModal}
        setShowMixModal={setShowMixModal}
        mixItems={pricing.mixItems}
        mixRatios={pricing.mixRatios}
        handleRatioChange={pricing.handleRatioChange}
        currentPrice={pricing.currentPrice}
        showCustomRequest={showCustomRequest}
        setShowCustomRequest={setShowCustomRequest}
        customRequestData={customRequestData}
        setCustomRequestData={setCustomRequestData}
        submitCustomRequest={submitCustomRequest}
        isSubmittingRequest={isSubmittingRequest}
        t={t}
        tDynamic={tDynamic}
      />

      <CustomizationsModal
        showCustomizationsModal={showCustomizationsModal}
        setShowCustomizationsModal={setShowCustomizationsModal}
        service={service}
        effectiveCustomizations={pricing.effectiveCustomizations}
        selectedOptions={pricing.selectedOptions}
        toggleOption={pricing.toggleOption}
        currentPrice={pricing.currentPrice}
        isDualUnit={pricing.isDualUnit}
        displayUnit={pricing.displayUnit}
        t={t}
        tDynamic={tDynamic}
      />
    </div>
  );
});

export default ServiceCard;
