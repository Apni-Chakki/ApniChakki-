import { useState } from 'react';

/**
 * Custom hook to encapsulate all pricing, mix ratio normalization, discount,
 * customization selection, and stock checks for a service card.
 */
export function useServicePricing(service, quantity) {
  const isRental = service.is_rental === 1 || service.is_rental === true;
  const isCustomMix = service.is_custom_mix === 1 || service.is_custom_mix === true;
  const mixItems = service.mix_items || [];

  // Custom Mix states — ratios always sum to 1 (representing a full 1kg mix)
  const [mixRatios, setMixRatios] = useState(() => {
    if (!isCustomMix || mixItems.length === 0) return {};
    const raw = mixItems.map((item) => parseFloat(item.default_ratio) || 0);
    const sum = raw.reduce((s, v) => s + v, 0);
    const round1 = (v) => Math.round(v * 10) / 10;

    const ratios = {};
    if (sum <= 0) {
      const equal = round1(1 / mixItems.length);
      mixItems.forEach((_, idx) => {
        ratios[idx] = equal;
      });
    } else {
      mixItems.forEach((_, idx) => {
        ratios[idx] = Math.max(0, round1(raw[idx] / sum));
      });
    }

    const total = Object.values(ratios).reduce((s, v) => s + v, 0);
    const drift = round1(1 - total);
    if (drift !== 0 && mixItems.length > 0) {
      const lastIdx = mixItems.length - 1;
      ratios[lastIdx] = Math.max(0, round1(ratios[lastIdx] + drift));
    }
    return ratios;
  });

  const handleRatioChange = (index, value) => {
    const round1 = (v) => Math.round(v * 10) / 10;
    const newVal = round1(Math.max(0, Math.min(1, parseFloat(value) || 0)));

    setMixRatios((prev) => {
      const otherIndices = mixItems.map((_, i) => i).filter((i) => i !== index);
      if (otherIndices.length === 0) return { ...prev, [index]: 1 };

      const remaining = round1(1 - newVal);
      const currentOthersSum = otherIndices.reduce(
        (s, i) => s + (parseFloat(prev[i]) || 0),
        0
      );

      const next = { ...prev, [index]: newVal };

      otherIndices.forEach((i) => {
        const prevVal = parseFloat(prev[i]) || 0;
        const share =
          currentOthersSum > 0.0001
            ? (prevVal / currentOthersSum) * remaining
            : remaining / otherIndices.length;
        next[i] = Math.max(0, round1(share));
      });

      const total = Object.values(next).reduce((s, v) => s + v, 0);
      const drift = round1(1 - total);
      if (drift !== 0) {
        const largestOther = otherIndices.reduce(
          (max, i) => (next[i] > next[max] ? i : max),
          otherIndices[0]
        );
        next[largestOther] = Math.max(0, round1(next[largestOther] + drift));
      }

      return next;
    });
  };

  // Customizations
  const customizations = service.customizations || [];
  const hasCustomizations = customizations.length > 0 || service.is_grinding_service == 1;

  const effectiveCustomizations =
    customizations.length > 0
      ? customizations
      : service.is_grinding_service == 1 && !isCustomMix
      ? [
          {
            id: 'legacy-clean',
            option_name: 'Cleaning',
            option_price: service.cleaning_price || 0,
          },
          {
            id: 'legacy-grind',
            option_name: 'Grinding',
            option_price: service.grinding_price || 0,
          },
        ]
      : [];

  const [selectedOptions, setSelectedOptions] = useState(() =>
    effectiveCustomizations.reduce((acc, c, i) => ({ ...acc, [i]: true }), {})
  );

  const toggleOption = (index) => {
    setSelectedOptions((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // Price Calculation
  let currentPrice = service.price;

  if (isCustomMix) {
    let totalPrice = 0;
    let totalRatio = 0;

    mixItems.forEach((item, idx) => {
      const ratio = mixRatios[idx] || 0;
      totalPrice += ratio * parseFloat(item.price_per_kg || 0);
      totalRatio += ratio;
    });

    currentPrice = totalRatio > 0 ? Math.round(totalPrice / totalRatio) : 0;
  } else if (hasCustomizations) {
    const pricingMode = service.customization_pricing_mode || 'additive';
    const selectedIndices = Object.keys(selectedOptions).filter((i) => selectedOptions[i]);

    if (pricingMode === 'average') {
      if (selectedIndices.length > 0) {
        const sum = selectedIndices.reduce(
          (acc, i) => acc + (parseFloat(effectiveCustomizations[i]?.option_price) || 0),
          0
        );
        currentPrice = Math.round(sum / selectedIndices.length);
      } else {
        currentPrice = 0;
      }
    } else {
      currentPrice = effectiveCustomizations.reduce(
        (sum, c, i) => sum + (selectedOptions[i] ? parseFloat(c.option_price) || 0 : 0),
        0
      );
    }
  }

  // Discounts
  const discountType = service.discount_type || 'none';
  const discountValue = parseFloat(service.discount_value) || 0;
  const hasDiscount = discountType !== 'none' && discountValue > 0;
  const baseForDiscount = parseFloat(currentPrice) || 0;

  let discountedPrice = baseForDiscount;
  if (hasDiscount) {
    if (discountType === 'percentage') {
      discountedPrice = Math.max(
        0,
        baseForDiscount - (baseForDiscount * Math.min(discountValue, 100)) / 100
      );
    } else if (discountType === 'fixed') {
      discountedPrice = Math.max(0, baseForDiscount - discountValue);
    }
  }

  const effectivePrice = hasDiscount ? discountedPrice : baseForDiscount;
  const badgeText = (service.badge_text || '').trim();

  // Stock and units
  const hasStockDefined =
    service.stock_quantity !== undefined &&
    service.stock_quantity !== null &&
    service.stock_quantity !== '' &&
    !isNaN(Number(service.stock_quantity));
  const stock = hasStockDefined ? parseFloat(service.stock_quantity) : Infinity;
  const displayUnit = service.unit || 'unit';
  const isDualUnit = Number(service.dual_unit) === 1 || service.dual_unit === true || service.dual_unit === '1';
  const isOnlyPickup =
    (displayUnit.toLowerCase() === 'trip' || String(service.unit).toLowerCase() === 'trip') &&
    !isDualUnit;

  const showPickupButton =
    !isCustomMix &&
    !isRental &&
    !isOnlyPickup &&
    (isDualUnit || parseFloat(service.cleaning_price) > 0 || parseFloat(service.grinding_price) > 0);

  const isOutOfStock = !isOnlyPickup && !isRental && stock <= 0;
  const isQuantityExceeded = !isOnlyPickup && !isRental && stock !== Infinity && quantity > stock;

  let quickOptions = [];
  if (Array.isArray(service.weight_options)) {
    quickOptions = service.weight_options;
  } else if (typeof service.weight_options === 'string') {
    try {
      const parsed = JSON.parse(service.weight_options);
      if (Array.isArray(parsed)) quickOptions = parsed;
    } catch (e) {}
  }
  quickOptions = quickOptions.map(v => parseFloat(v)).filter(v => !isNaN(v) && v > 0);
  const hasQuickOptions = quickOptions.length > 0;

  const getSelectedCustomizations = () => {
    return effectiveCustomizations
      .filter((_, i) => selectedOptions[i])
      .map((c) => ({
        option_name: c.option_name,
        option_price: parseFloat(c.option_price) || 0,
      }));
  };

  const getSelectedMixItems = () => {
    if (!isCustomMix) return null;
    return mixItems
      .map((item, idx) => ({
        id: item.id,
        product_ingredient_id: item.product_ingredient_id || null,
        item_name: item.item_name,
        price_per_kg: item.price_per_kg,
        ratio: mixRatios[idx] || 0,
      }))
      .filter((m) => m.ratio > 0);
  };

  return {
    isRental,
    isCustomMix,
    mixItems,
    mixRatios,
    handleRatioChange,
    customizations,
    hasCustomizations,
    effectiveCustomizations,
    selectedOptions,
    toggleOption,
    currentPrice,
    discountType,
    discountValue,
    hasDiscount,
    baseForDiscount,
    effectivePrice,
    badgeText,
    stock,
    displayUnit,
    isDualUnit,
    isOnlyPickup,
    showPickupButton,
    isOutOfStock,
    isQuantityExceeded,
    quickOptions,
    hasQuickOptions,
    getSelectedCustomizations,
    getSelectedMixItems,
  };
}

export default useServicePricing;
