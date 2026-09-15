import { useState, useEffect, memo } from "react";
import { Calendar, RotateCcw, ChevronRight } from "lucide-react";
import { Button } from "../../components/common/button";
import { Card } from "../../components/common/card";
import { useCart } from "../../store/CartContext";
import { toast } from "sonner";
import { ImageWithFallback } from "../../components/common/ImageWithFallback";
import { API_BASE_URL } from "../../config";
import { useAuth } from "../../store/AuthContext";
import { useDynamicTranslation } from "../../hooks/useDynamicTranslation";

import { RentalModal } from "../../components/features/services/RentalModal";
import { CustomMixModal } from "../../components/features/services/CustomMixModal";
import { CustomizationsModal } from "../../components/features/services/CustomizationsModal";
import { QuantitySelector } from "../../components/features/services/QuantitySelector";

export const ServiceCard = memo(function ServiceCard({ service }) {
  const [quantity, setQuantity] = useState(1);
  const [isPickupRequested, setIsPickupRequested] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const { addToCart } = useCart();
  const { t, tDynamic } = useDynamicTranslation();
  const { user } = useAuth();

  const isRental = service.is_rental === 1 || service.is_rental === true;

  const [showRentalModal, setShowRentalModal] = useState(false);
  const [showMixModal, setShowMixModal] = useState(false);
  const [showCustomizationsModal, setShowCustomizationsModal] = useState(false);
  const [rentalDays, setRentalDays] = useState(1);
  const [rentalStartDate, setRentalStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [rentalQty, setRentalQty] = useState(1);
  const [rentalName, setRentalName] = useState("");
  const [rentalPhone, setRentalPhone] = useState("");
  const [rentalAddress, setRentalAddress] = useState("");
  const [rentalPaymentMethod, setRentalPaymentMethod] = useState("cash");

  useEffect(() => {
    if (user && showRentalModal) {
      setRentalName(user.full_name || user.name || "");
      setRentalPhone(user.phone || "");
      setRentalAddress(user.address || "");
    }
  }, [user, showRentalModal]);

  const handlePlaceRental = () => {
    if (!user) {
      toast.error(t("Please login to rent this item."));
      return;
    }
    if (rentalQty <= 0) {
      toast.error(t("Quantity must be greater than 0."));
      return;
    }
    if (rentalQty > parseFloat(service.rental_available_qty || 0)) {
      toast.error(t("Insufficient available rental quantity."));
      return;
    }

    // Construct rental service item to add to cart
    const rentalItem = {
      ...service,
      is_rental: true,
      rental_start_date: rentalStartDate,
      rental_days: rentalDays,
      rental_price_per_day: parseFloat(service.rental_price_per_day) || 0,
      security_deposit: parseFloat(service.security_deposit) || 0,
      late_penalty_per_day: parseFloat(service.late_penalty_per_day) || 0,
    };

    addToCart(rentalItem, rentalQty);
    setShowRentalModal(false);
  };

  // Dynamic customizations from API
  const customizations = service.customizations || [];
  const hasCustomizations = customizations.length > 0 || service.is_grinding_service == 1;

  // Add states for Custom Mix
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
      // No defaults — split equally
      const equal = round1(1 / mixItems.length);
      mixItems.forEach((_, idx) => {
        ratios[idx] = equal;
      });
    } else {
      // Normalize so ratios sum to 1
      mixItems.forEach((_, idx) => {
        ratios[idx] = Math.max(0, round1(raw[idx] / sum));
      });
    }
    // Fix rounding drift so the sum is exactly 1
    const total = Object.values(ratios).reduce((s, v) => s + v, 0);
    const drift = round1(1 - total);
    if (drift !== 0 && mixItems.length > 0) {
      const lastIdx = mixItems.length - 1;
      ratios[lastIdx] = Math.max(0, round1(ratios[lastIdx] + drift));
    }
    return ratios;
  });

  const [showCustomRequest, setShowCustomRequest] = useState(false);
  const [customRequestData, setCustomRequestData] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Fallback to old cleaning/grinding if no dynamic customizations exist
  const effectiveCustomizations =
    customizations.length > 0
      ? customizations
      : service.is_grinding_service == 1 && !isCustomMix
      ? [
          {
            id: "legacy-clean",
            option_name: "Cleaning",
            option_price: service.cleaning_price || 0,
          },
          {
            id: "legacy-grind",
            option_name: "Grinding",
            option_price: service.grinding_price || 0,
          },
        ]
      : [];

  // Track which customizations are selected (all selected by default)
  const [selectedOptions, setSelectedOptions] = useState(() =>
    effectiveCustomizations.reduce((acc, c, i) => ({ ...acc, [i]: true }), {})
  );

  const toggleOption = (index) => {
    setSelectedOptions((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleRatioChange = (index, value) => {
    const round1 = (v) => Math.round(v * 10) / 10;
    const newVal = round1(Math.max(0, Math.min(1, parseFloat(value) || 0)));

    setMixRatios((prev) => {
      const otherIndices = mixItems.map((_, i) => i).filter((i) => i !== index);

      // Only one ingredient — it always takes 100% of the mix.
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

      // Correct rounding drift so the sum is exactly 1 — nudge the largest of the "others".
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

  // Calculate current price
  let currentPrice = service.price;

  if (isCustomMix) {
    let totalPrice = 0;
    let totalRatio = 0;

    mixItems.forEach((item, idx) => {
      const ratio = mixRatios[idx] || 0;
      totalPrice += ratio * parseFloat(item.price_per_kg || 0);
      totalRatio += ratio;
    });

    if (totalRatio > 0) {
      currentPrice = Math.round(totalPrice / totalRatio);
    } else {
      currentPrice = 0;
    }
  } else if (hasCustomizations) {
    const pricingMode = service.customization_pricing_mode || "additive";
    const selectedIndices = Object.keys(selectedOptions).filter((i) => selectedOptions[i]);

    if (pricingMode === "average") {
      if (selectedIndices.length > 0) {
        const sum = selectedIndices.reduce(
          (acc, i) =>
            acc + (parseFloat(effectiveCustomizations[i]?.option_price) || 0),
          0
        );
        currentPrice = Math.round(sum / selectedIndices.length);
      } else {
        currentPrice = 0;
      }
    } else {
      currentPrice = effectiveCustomizations.reduce(
        (sum, c, i) =>
          sum + (selectedOptions[i] ? parseFloat(c.option_price) || 0 : 0),
        0
      );
    }
  }

  // Apply discount on top of computed price
  const discountType = service.discount_type || "none";
  const discountValue = parseFloat(service.discount_value) || 0;
  const hasDiscount = discountType !== "none" && discountValue > 0;
  const baseForDiscount = parseFloat(currentPrice) || 0;
  let discountedPrice = baseForDiscount;
  if (hasDiscount) {
    if (discountType === "percentage") {
      discountedPrice = Math.max(
        0,
        baseForDiscount - (baseForDiscount * Math.min(discountValue, 100)) / 100
      );
    } else if (discountType === "fixed") {
      discountedPrice = Math.max(0, baseForDiscount - discountValue);
    }
  }
  const effectivePrice = hasDiscount ? discountedPrice : baseForDiscount;
  const badgeText = (service.badge_text || "").trim();
  const hasStockDefined =
    service.stock_quantity !== undefined &&
    service.stock_quantity !== null &&
    service.stock_quantity !== "" &&
    !isNaN(Number(service.stock_quantity));
  const stock = hasStockDefined ? parseFloat(service.stock_quantity) : Infinity;
  const displayUnit = service.unit || "unit";
  const isOnlyPickup = displayUnit.toLowerCase() === "trip" && !service.dual_unit;
  const isDualUnit = service.dual_unit === 1 || service.dual_unit === true;

  const isOutOfStock = !isOnlyPickup && !isRental && stock <= 0;
  const isQuantityExceeded =
    !isOnlyPickup && !isRental && stock !== Infinity && quantity > stock;

  const quickOptions =
    Array.isArray(service.weight_options) && service.weight_options.length > 0
      ? service.weight_options
      : [];
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
        item_name: item.item_name,
        price_per_kg: item.price_per_kg,
        ratio: mixRatios[idx] || 0,
      }))
      .filter((m) => m.ratio > 0);
  };

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error(t("This item is out of stock."));
      return;
    }
    if (!isOnlyPickup && !isRental && stock !== Infinity && quantity > stock) {
      toast.error(`${t("Only")} ${stock} ${isDualUnit ? "kg" : displayUnit} ${t("left")}!`);
      return;
    }

    if (isCustomMix) {
      const selectedMix = getSelectedMixItems();
      if (selectedMix.length === 0) {
        toast.error(t("Please select at least one ingredient ratio"));
        return;
      }

      const unitLabel = isDualUnit ? "kg" : displayUnit;
      addToCart(
        {
          ...service,
          price: parseFloat(effectivePrice),
          original_price: baseForDiscount,
          discount_type: discountType,
          discount_value: discountValue,
          unit: isDualUnit ? "kg" : service.unit,
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

    const selected = getSelectedCustomizations();
    if (hasCustomizations && selected.length === 0) {
      toast.error(t("Please select at least one service option"));
      return;
    }

    const isCleaning = selected.some((s) => s.option_name.toLowerCase().includes("clean"));
    const isGrinding = selected.some((s) => s.option_name.toLowerCase().includes("grind"));
    const unitLabel = isDualUnit ? "kg" : displayUnit;

    addToCart(
      {
        ...service,
        price: effectivePrice,
        original_price: baseForDiscount,
        discount_type: discountType,
        discount_value: discountValue,
        unit: isDualUnit ? "kg" : service.unit,
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
    if (isOutOfStock) {
      toast.error(t("This item is out of stock."));
      return;
    }
    if (!isOnlyPickup && !isRental && stock !== Infinity && presetQty > stock) {
      toast.error(`${t("Only")} ${stock} ${isDualUnit ? "kg" : displayUnit} ${t("left")}!`);
      return;
    }

    if (isCustomMix) {
      const selectedMix = getSelectedMixItems();
      if (selectedMix.length === 0) {
        toast.error(t("Please select at least one ingredient ratio"));
        return;
      }

      const unitLabel = isDualUnit ? "kg" : displayUnit;
      addToCart(
        {
          ...service,
          price: parseFloat(effectivePrice),
          original_price: baseForDiscount,
          discount_type: discountType,
          discount_value: discountValue,
          unit: isDualUnit ? "kg" : service.unit,
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

    const selected = getSelectedCustomizations();
    if (hasCustomizations && selected.length === 0) {
      toast.error(t("Please select at least one service option"));
      return;
    }

    const isCleaning = selected.some((s) => s.option_name.toLowerCase().includes("clean"));
    const isGrinding = selected.some((s) => s.option_name.toLowerCase().includes("grind"));
    const unitLabel = isDualUnit ? "kg" : displayUnit;

    addToCart(
      {
        ...service,
        price: effectivePrice,
        original_price: baseForDiscount,
        discount_type: discountType,
        discount_value: discountValue,
        unit: isDualUnit ? "kg" : service.unit,
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
    if (isCustomMix) {
      toast.error(t("Pickup request is not available for custom mixes directly."));
      return;
    }

    const selected = getSelectedCustomizations();
    if (hasCustomizations && selected.length === 0) {
      toast.error(t("Please select at least one service option"));
      return;
    }

    const isCleaning = selected.some((s) => s.option_name.toLowerCase().includes("clean"));
    const isGrinding = selected.some((s) => s.option_name.toLowerCase().includes("grind"));

    addToCart(
      {
        ...service,
        price: effectivePrice,
        original_price: baseForDiscount,
        discount_type: discountType,
        discount_value: discountValue,
        unit: "trip",
        is_cleaning: isCleaning,
        is_grinding: isGrinding,
        selected_customizations: selected,
      },
      quantity,
      true
    );
    toast.success(t("Pickup request added to cart."));
    setIsPickupRequested(true);
    setIsAddedToCart(false);
  };

  const submitCustomRequest = async () => {
    if (!customRequestData.name || !customRequestData.phone) {
      toast.error(t("Please enter your name and phone number."));
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
        selected_items: getSelectedMixItems(),
        custom_items: customRequestData.message,
        total_quantity: quantity,
        estimated_price: currentPrice,
      };

      const response = await fetch(`${API_BASE_URL}/submit_custom_mix_request.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t(data.message));
        setShowCustomRequest(false);
        setCustomRequestData({ name: "", phone: "", email: "", message: "" });
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      toast.error(err.message || t("Failed to submit request"));
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div className="h-full transition-transform duration-200 hover:-translate-y-1">
      <Card className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow h-full relative">
        <div className="relative w-full h-48 sm:h-52 md:h-56 overflow-hidden bg-muted">
          {service.image_url || service.imageUrl ? (
            <ImageWithFallback
              src={service.image_url || service.imageUrl}
              alt={service.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <svg
                  className="w-12 h-12 mx-auto mb-2 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16"
                  />
                </svg>
                <p className="text-xs">{t("No image")} </p>
              </div>
            </div>
          )}

          {/* Custom Badge / Rental Badge (top-left) */}
          {isRental ? (
            <span
              style={{
                position: "absolute",
                top: "12px",
                left: "12px",
                zIndex: 10,
                background: "linear-gradient(135deg, #2c251e 0%, #4a3f35 100%)",
                color: "#f5ede3",
                padding: "5px 12px",
                borderRadius: "8px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                border: "1px solid rgba(212,165,116,0.3)",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span style={{ fontSize: "11px" }}>🔄</span> {t("FOR RENT")}
            </span>
          ) : badgeText ? (
            <span
              style={{
                position: "absolute",
                top: "12px",
                left: "12px",
                zIndex: 10,
                background: "linear-gradient(135deg, #ba2d2d 0%, #991b1b 100%)",
                color: "#fff",
                padding: "5px 12px",
                borderRadius: "8px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                border: "1px solid rgba(255,255,255,0.2)",
                whiteSpace: "nowrap",
              }}
            >
              {tDynamic(badgeText)}
            </span>
          ) : null}

          {/* Discount Badge (top-right) */}
          {hasDiscount && (
            <span
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                zIndex: 10,
                background: "linear-gradient(135deg, #8b6f47 0%, #a0845c 100%)",
                color: "#fff",
                padding: "5px 12px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.03em",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                border: "1px solid rgba(255,255,255,0.2)",
                whiteSpace: "nowrap",
              }}
            >
              {discountType === "percentage"
                ? `-${Math.min(discountValue, 100)}%`
                : `-Rs.${discountValue}`}
            </span>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
              <span className="bg-red-600 text-white font-bold text-xs uppercase px-3 py-1.5 rounded-full shadow-md tracking-wider">
                {t("Out of Stock")}
              </span>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col gap-3 flex-1">
          <div className="flex-1">
            <h3 className="text-foreground mb-1 font-bold">{tDynamic(service.name)}</h3>
            {service.description && (
              <p className="text-muted-foreground text-sm mb-2">{tDynamic(service.description)}</p>
            )}

            {isRental ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-teal-700 font-extrabold text-xl leading-none">
                    Rs. {Math.round(parseFloat(service.rental_price_per_day) || 0)}
                  </p>
                  <span className="text-muted-foreground text-sm font-semibold">
                    / {t("day")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="inline-flex items-center text-[10px] text-teal-800 font-bold bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                    🛡️ {t("Deposit")}: Rs. {Math.round(parseFloat(service.security_deposit) || 0)}
                  </span>
                  <span className="inline-flex items-center text-[10px] text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    ⚠️ {t("Penalty")}: Rs. {Math.round(parseFloat(service.late_penalty_per_day) || 0)}/{t("day")}
                  </span>
                </div>
              </div>
            ) : hasDiscount ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-rose-700 font-extrabold text-xl leading-none">
                    Rs. {Math.round(effectivePrice)}
                  </p>
                  <span className="text-muted-foreground text-sm font-medium">
                    / {tDynamic(isDualUnit ? "kg" : displayUnit)}
                  </span>
                  <p
                    className="text-muted-foreground text-sm ml-1.5 font-medium"
                    style={{
                      textDecoration: "line-through",
                      textDecorationColor: "#ef4444",
                      textDecorationThickness: "2px",
                    }}
                  >
                    Rs. {Math.round(baseForDiscount)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-1 flex-wrap">
                <p className="text-primary font-bold text-xl leading-none">
                  Rs. {Math.round(currentPrice)}
                </p>
                <span className="text-muted-foreground text-sm font-medium">
                  / {tDynamic(isDualUnit ? "kg" : displayUnit)}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 mt-auto">
            {isRental ? (
              <Button
                className="w-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-bold shadow-md transition-all active:scale-[0.98] rounded-xl py-2.5"
                onClick={() => setShowRentalModal(true)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {t("Rent This Item")}
              </Button>
            ) : isCustomMix ? (
              <>
                <Button
                  variant="outline"
                  className="w-full border-primary/30 text-primary hover:bg-primary/10 font-bold text-xs h-9 rounded-xl flex items-center justify-between px-3 shadow-xs"
                  onClick={() => setShowMixModal(true)}
                >
                  <span className="truncate">{t("Customize Mix & Proportions")}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-primary/70 ml-1" />
                </Button>
                <QuantitySelector
                  hasQuickOptions={hasQuickOptions}
                  quickOptions={quickOptions}
                  unitLabel={isDualUnit ? "kg" : displayUnit}
                  quantity={quantity}
                  setQuantity={setQuantity}
                  isOutOfStock={isOutOfStock}
                  isExceeded={isQuantityExceeded}
                  isMaxReached={!isOnlyPickup && !isRental && stock !== Infinity && quantity >= stock}
                  isOnlyPickup={isOnlyPickup}
                  isRental={isRental}
                  stock={stock}
                  handleQuickAdd={handleQuickAdd}
                  handleAddToCart={handleAddToCart}
                  isAddedToCart={isAddedToCart}
                  isCustomMix={isCustomMix}
                  currentPrice={currentPrice}
                  t={t}
                />
              </>
            ) : hasCustomizations ? (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className={`w-full font-bold text-xs h-9 rounded-xl flex items-center justify-between px-3 shadow-xs transition-colors ${
                    service.customization_pricing_mode === "average"
                      ? "border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                      : "border-orange-300 text-orange-800 hover:bg-orange-50"
                  }`}
                  onClick={() => setShowCustomizationsModal(true)}
                >
                  <span className="truncate">
                    {service.customization_pricing_mode === "average"
                      ? `${t("Select Items")} (${Object.values(selectedOptions).filter(Boolean).length}/${effectiveCustomizations.length})`
                      : `${t("Customize Services")} (${Object.values(selectedOptions).filter(Boolean).length}/${effectiveCustomizations.length})`}
                  </span>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 ml-1 ${
                      service.customization_pricing_mode === "average"
                        ? "text-emerald-600"
                        : "text-orange-600"
                    }`}
                  />
                </Button>

                <QuantitySelector
                  hasQuickOptions={hasQuickOptions}
                  quickOptions={quickOptions}
                  unitLabel={isDualUnit ? "kg" : displayUnit}
                  quantity={quantity}
                  setQuantity={setQuantity}
                  isOutOfStock={isOutOfStock}
                  isExceeded={isQuantityExceeded}
                  isMaxReached={!isOnlyPickup && !isRental && stock !== Infinity && quantity >= stock}
                  isOnlyPickup={isOnlyPickup}
                  isRental={isRental}
                  stock={stock}
                  handleQuickAdd={handleQuickAdd}
                  handleAddToCart={handleAddToCart}
                  isAddedToCart={isAddedToCart}
                  isCustomMix={isCustomMix}
                  currentPrice={currentPrice}
                  t={t}
                />

                {(service.cleaning_price > 0 || service.grinding_price > 0) && (
                  <Button
                    variant="outline"
                    className="w-full text-xs font-semibold py-2 h-auto whitespace-normal"
                    onClick={handleAddPickupRequest}
                  >
                    {isPickupRequested ? t("Pickup Requested ✓") : t("Pickup & Bring Your Own Grains")}
                  </Button>
                )}
              </div>
            ) : (
              <QuantitySelector
                hasQuickOptions={hasQuickOptions}
                quickOptions={quickOptions}
                unitLabel={isDualUnit ? "kg" : displayUnit}
                quantity={quantity}
                setQuantity={setQuantity}
                isOutOfStock={isOutOfStock}
                isExceeded={isQuantityExceeded}
                isMaxReached={!isOnlyPickup && !isRental && stock !== Infinity && quantity >= stock}
                isOnlyPickup={isOnlyPickup}
                isRental={isRental}
                stock={stock}
                handleQuickAdd={handleQuickAdd}
                handleAddToCart={handleAddToCart}
                isAddedToCart={isAddedToCart}
                isCustomMix={isCustomMix}
                currentPrice={currentPrice}
                t={t}
              />
            )}
          </div>
        </div>
      </Card>

      {/* Modals */}
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
        mixItems={mixItems}
        mixRatios={mixRatios}
        handleRatioChange={handleRatioChange}
        currentPrice={currentPrice}
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
        effectiveCustomizations={effectiveCustomizations}
        selectedOptions={selectedOptions}
        toggleOption={toggleOption}
        currentPrice={currentPrice}
        isDualUnit={isDualUnit}
        displayUnit={displayUnit}
        t={t}
        tDynamic={tDynamic}
      />
    </div>
  );
});

export default ServiceCard;
