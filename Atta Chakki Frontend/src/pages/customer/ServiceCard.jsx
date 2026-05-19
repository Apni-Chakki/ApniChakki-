import { useState } from 'react';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '../../components/common/button';
import { Card } from '../../components/common/card';
import { useCart } from '../../store/CartContext';
import { toast } from 'sonner';
import { ImageWithFallback } from '../../components/common/ImageWithFallback';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '../../components/common/checkbox';
import { Label } from '../../components/common/label';
import { useDynamicTranslation } from '../../hooks/useDynamicTranslation';
import { API_BASE_URL } from '../../config';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function ServiceCard({ service }) {
  const [quantity, setQuantity] = useState(1);
  const [isPickupRequested, setIsPickupRequested] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const { addToCart } = useCart();
  const { t, tDynamic } = useDynamicTranslation();

  // Dynamic customizations from API
  const customizations = service.customizations || [];
  const hasCustomizations = customizations.length > 0 || service.is_grinding_service == 1;

  // Add states for Custom Mix
  const isCustomMix = service.is_custom_mix === 1 || service.is_custom_mix === true;
  const mixItems = service.mix_items || [];
  
  // Custom Mix states
  const [mixRatios, setMixRatios] = useState(() => {
    if (!isCustomMix) return {};
    const ratios = {};
    mixItems.forEach((item, idx) => {
      ratios[idx] = parseFloat(item.default_ratio) || 0;
    });
    return ratios;
  });
  
  const [showCustomRequest, setShowCustomRequest] = useState(false);
  const [customRequestData, setCustomRequestData] = useState({
    name: '',
    phone: '',
    email: '',
    message: ''
  });
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Fallback to old cleaning/grinding if no dynamic customizations exist
  const effectiveCustomizations = customizations.length > 0
    ? customizations
    : (service.is_grinding_service == 1 && !isCustomMix
      ? [
          { id: 'legacy-clean', option_name: 'Cleaning', option_price: service.cleaning_price || 0 },
          { id: 'legacy-grind', option_name: 'Grinding', option_price: service.grinding_price || 0 }
        ]
      : []);

  // Track which customizations are selected (all selected by default)
  const [selectedOptions, setSelectedOptions] = useState(() =>
    effectiveCustomizations.reduce((acc, c, i) => ({ ...acc, [i]: true }), {})
  );

  const toggleOption = (index) => {
    setSelectedOptions(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleRatioChange = (index, value) => {
    const newRatio = parseFloat(value) || 0;
    setMixRatios(prev => ({ ...prev, [index]: newRatio }));
  };

  // Calculate current price
  let currentPrice = service.price;
  
  if (isCustomMix) {
    // Weighted average price per kg for Custom Mix
    let totalPrice = 0;
    let totalRatio = 0;
    
    mixItems.forEach((item, idx) => {
      const ratio = mixRatios[idx] || 0;
      totalPrice += ratio * parseFloat(item.price_per_kg || 0);
      totalRatio += ratio;
    });
    
    // Scale price to 1 unit (1kg) if total ratio > 0
    if (totalRatio > 0) {
      currentPrice = Math.round(totalPrice / totalRatio);
    } else {
      currentPrice = 0;
    }
  } else if (hasCustomizations) {
    currentPrice = effectiveCustomizations.reduce((sum, c, i) => sum + (selectedOptions[i] ? parseFloat(c.option_price) || 0 : 0), 0);
  }

  // Apply discount on top of computed price
  const discountType = service.discount_type || 'none';
  const discountValue = parseFloat(service.discount_value) || 0;
  const hasDiscount = discountType !== 'none' && discountValue > 0;
  const baseForDiscount = parseFloat(currentPrice) || 0;
  let discountedPrice = baseForDiscount;
  if (hasDiscount) {
    if (discountType === 'percentage') {
      discountedPrice = Math.max(0, baseForDiscount - (baseForDiscount * Math.min(discountValue, 100) / 100));
    } else if (discountType === 'fixed') {
      discountedPrice = Math.max(0, baseForDiscount - discountValue);
    }
  }
  const effectivePrice = hasDiscount ? discountedPrice : baseForDiscount;
  const badgeText = (service.badge_text || '').trim();

  const stock = service.stock_quantity ? parseFloat(service.stock_quantity) : Infinity;
  const displayUnit = service.unit || 'unit';
  // Only treat as "trip-only" if unit is trip AND dual_unit is NOT enabled
  const isOnlyPickup = displayUnit.toLowerCase() === 'trip' && !service.dual_unit;
  // dual_unit products support both pickup (trip) and kg modes from one card
  const isDualUnit = service.dual_unit === 1 || service.dual_unit === true;
  const isPickupEligible = isDualUnit || isOnlyPickup;
  // Trip waly products out of stock nahi hoty kabhi bhi
  const isOutOfStock = isPickupEligible ? false : stock <= 0;

  // Quick quantity options from admin (works for ALL units)
  const quickOptions = Array.isArray(service.weight_options) && service.weight_options.length > 0
    ? service.weight_options
    : [];
  const hasQuickOptions = quickOptions.length > 0;

  const getSelectedCustomizations = () => {
    return effectiveCustomizations
      .filter((_, i) => selectedOptions[i])
      .map(c => ({ option_name: c.option_name, option_price: parseFloat(c.option_price) || 0 }));
  };
  
  const getSelectedMixItems = () => {
    if (!isCustomMix) return null;
    return mixItems.map((item, idx) => ({
      item_name: item.item_name,
      price_per_kg: item.price_per_kg,
      ratio: mixRatios[idx] || 0
    })).filter(m => m.ratio > 0);
  };

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error(t("This item is out of stock."));
      return;
    }
    
    if (isCustomMix) {
      const selectedMix = getSelectedMixItems();
      if (selectedMix.length === 0) {
        toast.error(t("Please select at least one ingredient ratio"));
        return;
      }
      
      const unitLabel = isDualUnit ? 'kg' : displayUnit;
      addToCart({
        ...service,
        price: parseFloat(effectivePrice),
        original_price: baseForDiscount,
        discount_type: discountType,
        discount_value: discountValue,
        unit: isDualUnit ? 'kg' : service.unit,
        is_cleaning: false,
        is_grinding: false,
        selected_customizations: [],
        selected_mix_items: selectedMix,
        is_custom_mix: true
      }, quantity, false); 
      
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

    const isCleaning = selected.some(s => s.option_name.toLowerCase().includes('clean'));
    const isGrinding = selected.some(s => s.option_name.toLowerCase().includes('grind'));

    const unitLabel = isDualUnit ? 'kg' : displayUnit;

    addToCart({
      ...service,
      price: effectivePrice,
      original_price: baseForDiscount,
      discount_type: discountType,
      discount_value: discountValue,
      unit: isDualUnit ? 'kg' : service.unit,
      is_cleaning: isCleaning,
      is_grinding: isGrinding,
      selected_customizations: selected
    }, quantity, false); 
    toast.success(t(`Added ${quantity} ${unitLabel} of ${service.name} to cart`));
    setQuantity(1);
    setIsAddedToCart(true);
    setIsPickupRequested(false);
  };

  // Quick add: directly add a preset quantity to cart
  const handleQuickAdd = (presetQty) => {
    if (isOutOfStock) {
      toast.error(t("This item is out of stock."));
      return;
    }
    
    if (isCustomMix) {
      const selectedMix = getSelectedMixItems();
      if (selectedMix.length === 0) {
        toast.error(t("Please select at least one ingredient ratio"));
        return;
      }
      
      const unitLabel = isDualUnit ? 'kg' : displayUnit;
      addToCart({
        ...service,
        price: parseFloat(effectivePrice),
        original_price: baseForDiscount,
        discount_type: discountType,
        discount_value: discountValue,
        unit: isDualUnit ? 'kg' : service.unit,
        is_cleaning: false,
        is_grinding: false,
        selected_customizations: [],
        selected_mix_items: selectedMix,
        is_custom_mix: true
      }, presetQty, false); 
      
      toast.success(t(`Added ${presetQty} ${unitLabel} of Custom Mix to cart`));
      setIsAddedToCart(true);
      return;
    }
    
    const selected = getSelectedCustomizations();
    if (hasCustomizations && selected.length === 0) {
      toast.error(t("Please select at least one service option"));
      return;
    }

    const isCleaning = selected.some(s => s.option_name.toLowerCase().includes('clean'));
    const isGrinding = selected.some(s => s.option_name.toLowerCase().includes('grind'));

    const unitLabel = isDualUnit ? 'kg' : displayUnit;

    addToCart({
      ...service,
      price: effectivePrice,
      original_price: baseForDiscount,
      discount_type: discountType,
      discount_value: discountValue,
      unit: isDualUnit ? 'kg' : service.unit,
      is_cleaning: isCleaning,
      is_grinding: isGrinding,
      selected_customizations: selected
    }, presetQty, false); 
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

    const isCleaning = selected.some(s => s.option_name.toLowerCase().includes('clean'));
    const isGrinding = selected.some(s => s.option_name.toLowerCase().includes('grind'));

    addToCart({
      ...service,
      price: effectivePrice,
      original_price: baseForDiscount,
      discount_type: discountType,
      discount_value: discountValue,
      unit: 'trip',
      is_cleaning: isCleaning,
      is_grinding: isGrinding,
      selected_customizations: selected
    }, quantity, true); 
    toast.success(t('Pickup request added to cart.'));
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
        estimated_price: currentPrice
      };
      
      const response = await fetch(`${API_BASE_URL}/api/Controllers/Products/submit_custom_mix_request.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
      toast.error(err.message || t("Failed to submit request"));
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Quick-select chips + manual +/- quantity combined
  const QuantitySelector = ({ disabled = false }) => {
    const unitLabel = isDualUnit ? 'kg' : displayUnit;
    return (
      <div className="flex flex-col gap-2">
        {/* Quick-select preset chips */}
        {hasQuickOptions && (
          <div className="flex flex-wrap gap-1.5">
            {quickOptions.map((qty) => (
              <button
                key={qty}
                type="button"
                disabled={disabled || isOutOfStock}
                onClick={() => handleQuickAdd(qty)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all duration-200
                  bg-background text-foreground border-border hover:border-primary hover:bg-primary/10 hover:scale-105 active:scale-95
                  ${disabled || isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {qty} {unitLabel}
              </button>
            ))}
          </div>
        )}
        {/* Manual +/- quantity selector */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center border border-border rounded-md">
            <Button variant="outline" size="icon" className="h-8 w-8 bg-gray-200 hover:bg-gray-300 text-black border-gray-400 flex items-center justify-center px-0 py-0" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={isOutOfStock || disabled}>
              <Minus className="h-4 w-4" strokeWidth={3} />
            </Button>
            <span className="w-auto min-w-[3rem] px-1 sm:px-2 text-center text-sm sm:text-base font-bold">{quantity} <span className="text-xs text-muted-foreground font-medium">{unitLabel}</span></span>
            <Button variant="outline" size="icon" className="h-8 w-8 bg-gray-200 hover:bg-gray-300 text-black border-gray-400 flex items-center justify-center px-0 py-0" onClick={() => setQuantity(quantity + 1)} disabled={isOutOfStock || disabled}>
              <Plus className="h-4 w-4" strokeWidth={3} />
            </Button>
          </div>
          <Button className="flex-1 bg-success hover:bg-success/90 text-success-foreground text-sm sm:text-base" onClick={handleAddToCart} disabled={isOutOfStock || disabled || (isCustomMix && currentPrice == 0)}>
            {isOutOfStock ? t("Out of Stock") : isAddedToCart ? t("Added ✓") : t("Add to Cart")}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      variants={cardVariants} 
      whileHover={{ y: -5 }} 
      className="h-full"
    >
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
                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16" />
                </svg>
                <p className="text-xs">{t('No image')} </p>
              </div>
            </div>
          )}

          {/* Custom Badge (top-left) */}
          {badgeText && (
            <span
              style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                zIndex: 50,
                background: 'linear-gradient(90deg, #e11d48, #db2777)',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
                border: '2px solid rgba(255,255,255,0.5)',
                whiteSpace: 'nowrap'
              }}
            >
              {tDynamic(badgeText)}
            </span>
          )}

          {/* Discount Badge (top-right) */}
          {hasDiscount && (
            <span
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                zIndex: 50,
                background: 'linear-gradient(135deg, #10b981, #047857)',
                color: '#fff',
                padding: '5px 11px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 800,
                boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
                border: '2px solid rgba(255,255,255,0.5)',
                whiteSpace: 'nowrap'
              }}
            >
              {discountType === 'percentage'
                ? `-${Math.min(discountValue, 100)}%`
                : `-Rs.${discountValue}`}
            </span>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
              <span className="text-white font-bold">{t('Out of Stock')}</span>
            </div>
          )}
        </div>
        
        <div className="p-4 flex flex-col gap-3 flex-1">
          <div className="flex-1">
            <h3 className="text-foreground mb-1 font-bold">{tDynamic(service.name)}</h3>
            {service.description && (
              <p className="text-muted-foreground text-sm mb-2">{tDynamic(service.description)}</p>
            )}
            
            {hasDiscount ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-rose-700 font-extrabold text-xl leading-none">
                    Rs. {Math.round(effectivePrice)}
                  </p>
                  <span className="text-muted-foreground text-sm font-medium">
                    / {tDynamic(isDualUnit ? 'kg' : displayUnit)}
                  </span>
                  <p 
                    className="text-muted-foreground text-sm ml-1.5 font-medium" 
                    style={{ textDecoration: 'line-through', textDecorationColor: '#ef4444', textDecorationThickness: '2px' }}
                  >
                    Rs. {Math.round(baseForDiscount)}
                  </p>
                </div>
                <span className="inline-flex items-center w-fit text-[10px] text-emerald-800 font-bold bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                  🏷️ {discountType === 'percentage'
                    ? `${Math.min(discountValue, 100)}% OFF`
                    : `Save Rs. ${discountValue}`}
                </span>
              </div>
            ) : (
              <p className="text-primary font-bold text-lg">
                Rs. {Math.round(parseFloat(currentPrice) || 0)} <span className="text-sm font-medium text-muted-foreground">/ {tDynamic(isDualUnit ? 'kg' : displayUnit)}</span>
              </p>
            )}

            {/* Custom Mix Options */}
            {isCustomMix && mixItems.length > 0 && (
              <div className="mt-3 p-3.5 bg-[#fcfaf7] border border-primary/20 rounded-2xl space-y-3 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                <div className="border-b border-primary/10 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[11px] font-black text-primary uppercase tracking-wider">{t("Create Your Mix")}</span>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-0.5 leading-none">
                    {t("Price updates automatically")}
                  </p>
                </div>
                
                <div className="space-y-2">
                  {mixItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-primary/10 shadow-sm gap-2">
                      <div className="flex flex-col min-w-0 text-left items-start">
                         <span className="text-xs text-slate-900 truncate leading-tight text-left" style={{ fontWeight: '800' }}>{tDynamic(item.item_name)}</span>
                         <span className="text-[10px] text-slate-500 mt-1 leading-none text-left" style={{ fontWeight: '400' }}>Rs. {item.price_per_kg}/kg</span>
                      </div>
                      
                      <div className="flex items-center border border-primary/20 rounded-lg overflow-hidden bg-white shadow-sm h-7 shrink-0">
                         <button 
                           type="button"
                           className="w-7 h-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors select-none" 
                           onClick={() => {
                             const currentVal = parseFloat(mixRatios[idx] !== undefined ? mixRatios[idx] : 0);
                             const newVal = Math.max(0, currentVal - 0.1).toFixed(1);
                             handleRatioChange(idx, parseFloat(newVal));
                           }}
                         >
                           -
                         </button>
                         <span className="w-9 text-center text-xs font-black text-slate-800 select-none">
                           {mixRatios[idx] !== undefined ? parseFloat(mixRatios[idx]).toFixed(1) : '0.0'}
                         </span>
                         <button 
                           type="button"
                           className="w-7 h-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors select-none" 
                           onClick={() => {
                             const currentVal = parseFloat(mixRatios[idx] !== undefined ? mixRatios[idx] : 0);
                             const newVal = (currentVal + 0.1).toFixed(1);
                             handleRatioChange(idx, parseFloat(newVal));
                           }}
                         >
                           +
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="pt-1 flex justify-center w-full">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs h-8 border-primary/30 text-primary hover:bg-primary hover:text-white font-bold rounded-xl transition-all shadow-sm"
                    onClick={() => setShowCustomRequest(!showCustomRequest)}
                  >
                    {showCustomRequest ? t("Cancel Custom Request") : t("Want something else? Custom Request")}
                  </Button>
                </div>
              </div>
            )}
            
            {/* Custom Request Form Dropdown */}
            {showCustomRequest && isCustomMix && (
              <div className="mt-3 p-3.5 bg-[#fcfaf7] border border-primary/20 rounded-2xl space-y-3.5 shadow-sm animate-in slide-in-from-top-2 fade-in duration-300">
                <div className="border-b border-primary/10 pb-1.5">
                  <p className="text-xs font-extrabold text-primary uppercase tracking-wider">{t("Send a Custom Request")}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5 leading-normal">{t("Tell us what ingredients and proportions you want, and we'll contact you!")}</p>
                </div>
                
                <div className="space-y-2">
                  <input 
                    type="text" 
                    placeholder={t("Your Name")} 
                    className="w-full text-xs p-2 rounded-xl border border-primary/15 bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm transition-all" 
                    value={customRequestData.name} 
                    onChange={e => setCustomRequestData({...customRequestData, name: e.target.value})} 
                  />
                  <input 
                    type="text" 
                    placeholder={t("Phone Number")} 
                    className="w-full text-xs p-2 rounded-xl border border-primary/15 bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm transition-all" 
                    value={customRequestData.phone} 
                    onChange={e => setCustomRequestData({...customRequestData, phone: e.target.value})} 
                  />
                  <textarea 
                    placeholder={t("Describe your custom mix (e.g., 50% Wheat, 30% Chana, 20% Oats)")} 
                    className="w-full text-xs p-2 rounded-xl border border-primary/15 bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm transition-all min-h-[60px]" 
                    value={customRequestData.message} 
                    onChange={e => setCustomRequestData({...customRequestData, message: e.target.value})} 
                  />
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 active:scale-[0.98] h-8 text-xs text-white font-bold rounded-xl transition-all shadow-md" 
                    onClick={submitCustomRequest}
                    disabled={isSubmittingRequest}
                  >
                    {isSubmittingRequest ? t("Sending...") : t("Send Request")}
                  </Button>
                </div>
              </div>
            )}

            {/* Dynamic Customization Options (Legacy) */}
            {hasCustomizations && effectiveCustomizations.length > 0 && !isCustomMix && (
               <div className="mt-3 p-4 bg-orange-50/40 border border-orange-100 rounded-xl space-y-3 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-2 border-b border-orange-100/50 pb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                    <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest">{t("Service Customization")}</p>
                  </div>
                  <div className="space-y-2.5">
                    {effectiveCustomizations.map((cust, idx) => (
                      <div key={cust.id || idx} className={`flex items-center justify-between p-2 rounded-lg transition-colors ${selectedOptions[idx] ? 'bg-orange-100/50' : 'bg-transparent'}`}>
                         <div className="flex items-center space-x-3">
                            <Checkbox 
                              id={`cust-${service.id}-${idx}`} 
                              checked={!!selectedOptions[idx]}
                              onCheckedChange={() => toggleOption(idx)}
                              className="checkbox-orange border-orange-500 bg-white"
                            />
                            <Label htmlFor={`cust-${service.id}-${idx}`} className="text-xs font-bold text-orange-900 cursor-pointer select-none">{t(cust.option_name)}</Label>
                         </div>
                         <span className="text-[10px] font-bold text-orange-700 bg-white px-2 py-0.5 rounded-full border border-orange-100">Rs. {cust.option_price}</span>
                      </div>
                    ))}
                  </div>
                  {Object.values(selectedOptions).every(v => !v) && (
                    <p className="text-[9px] text-red-500 font-bold animate-bounce text-center italic mt-1">
                      ⚠ {t("Please select at least one service")}
                    </p>
                  )}
               </div>
            )}
            {stock < 10 && stock > 0 && !isOnlyPickup && !isDualUnit && (
                 <p className="text-xs text-red-500 mt-1">{t('Only')} {stock} {t('left')}!</p>
            )}
          </div>
          
          {isOnlyPickup && !isCustomMix ? (
            /* Trip-only products: just show pickup button */
            <div className="flex flex-col gap-2">
              <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleAddPickupRequest} disabled={isAddedToCart}>
                {isPickupRequested ? t('Pickup Request Added ✓') : t('Add Pickup Request')}
              </Button>
            </div>
          ) : isDualUnit && !isCustomMix ? (
            /* Dual Unit products: pickup + quantity selector with quick chips */
            <div className="flex flex-col gap-2">
              <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleAddPickupRequest} disabled={isPickupRequested}>
                {isPickupRequested ? t('Pickup Request Added ✓') : t('Add Pickup Request')}
              </Button>
              <p className="text-xs text-muted-foreground text-center">-- {t('OR')} --</p>
              <QuantitySelector disabled={isPickupRequested} />
            </div>
          ) : (
            /* Regular products: quick chips + manual qty */
            <QuantitySelector />
          )}
        </div>
      </Card>
    </motion.div>
  );
}
