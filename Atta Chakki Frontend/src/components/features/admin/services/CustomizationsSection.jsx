import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../../../common/button';
import { Input } from '../../../common/input';
import { Label } from '../../../common/label';
import { Checkbox } from '../../../common/checkbox';
import { Plus, Trash2, GripVertical, AlertTriangle, Search, Package, ChevronDown } from 'lucide-react';
import { Textarea } from '../../../common/textarea';

/**
 * Searchable dropdown to select an existing inventory product.
 * When a product is selected, it auto-fills the name and price.
 */
function InventoryProductSelector({ allProducts, selectedProductId, currentName, onSelect, disabled, placeholder, colorScheme = 'purple' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = allProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Find selected product name for display
  const selectedProduct = selectedProductId
    ? allProducts.find(p => String(p.id) === String(selectedProductId))
    : null;
  const displayName = selectedProduct ? selectedProduct.name : currentName;

  const colors = colorScheme === 'purple'
    ? { border: 'border-purple-200', ring: 'ring-purple-400', bg: 'bg-purple-50', hoverBg: 'hover:bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' }
    : { border: 'border-blue-200', ring: 'ring-blue-400', bg: 'bg-blue-50', hoverBg: 'hover:bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
        disabled={disabled}
        className={`flex items-center justify-between w-full h-10 rounded-md border ${colors.border} bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 ${colors.ring} focus:ring-offset-1 disabled:opacity-50 ${!displayName ? 'text-muted-foreground' : ''}`}
      >
        <span className="truncate">
          {displayName || placeholder || 'Select from inventory...'}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 ml-1 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[240px] max-h-64 bg-white rounded-lg border shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1">
          {/* Search input */}
          <div className="flex items-center gap-2 p-2 border-b bg-gray-50/80">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search inventory products..."
              className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Product list */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-3 text-center">
                <Package className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">No inventory products found</p>
                <p className="text-[10px] text-amber-600 font-medium mt-1">
                  ⚠️ Pehle yeh product inventory mein add karein
                </p>
              </div>
            ) : (
              filtered.map(product => {
                const isSelected = String(product.id) === String(selectedProductId);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      onSelect(product);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${isSelected ? colors.bg + ' font-medium' : colors.hoverBg}`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="block truncate">{product.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        Rs. {product.price}/{product.unit || 'kg'} • Stock: {product.stock_quantity ?? 'N/A'}
                      </span>
                    </div>
                    {isSelected && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${colors.badge}`}>✓</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CustomizationsSection({
  formData,
  setFormData,
  isSaving,
  addCustomization,
  removeCustomization,
  updateCustomization,
  addMixItem,
  removeMixItem,
  updateMixItem,
  allProducts = [],
}) {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="has_customizations"
          checked={formData.has_customizations}
          onCheckedChange={(checked) => {
            setFormData(prev => ({
              ...prev,
              has_customizations: checked,
              is_custom_mix: checked ? false : prev.is_custom_mix,
              customizations: checked && prev.customizations.length === 0
                ? [{ linked_product_id: null, option_name: '', option_price: '', sort_order: 1 }]
                : prev.customizations
            }));
          }}
          disabled={isSaving}
        />
        <Label htmlFor="has_customizations" className="font-semibold text-primary">
          🌾 Enable Service Customizations (Customer can select options)
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_custom_mix"
          checked={formData.is_custom_mix}
          onCheckedChange={(checked) => {
            setFormData(prev => ({
              ...prev,
              is_custom_mix: checked,
              has_customizations: checked ? false : prev.has_customizations,
              mix_items: checked && prev.mix_items.length === 0
                ? [{ product_ingredient_id: null, item_name: '', price_per_kg: '', default_ratio: '1', sort_order: 1 }]
                : prev.mix_items
            }));
          }}
          disabled={isSaving}
        />
        <Label htmlFor="is_custom_mix" className="font-semibold text-purple-700">
          🥣 Custom Mix / Multigrain (Customer chooses proportions)
        </Label>
      </div>

      {formData.has_customizations && !formData.is_custom_mix && (
        <div className="p-4 bg-muted/40 rounded-lg border space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-foreground">Customization Options</p>
            <Button type="button" size="sm" variant="outline" className="w-full sm:w-auto" onClick={addCustomization} disabled={isSaving}>
              <Plus className="h-3 w-3 mr-1" /> Add Option
            </Button>
          </div>

          {/* Inventory link info — only for Average Rate mode */}
          {allProducts.length > 0 && formData.customization_pricing_mode === 'average' && (
            <div className="p-2 bg-blue-50/60 rounded-md border border-blue-200 text-[11px] text-blue-700">
              <Package className="h-3.5 w-3.5 inline-block mr-1 -mt-0.5" />
              Select an inventory product to link each option. Price will auto-fill and stock will be tracked.
            </div>
          )}

          {/* Customer Warning / Pre-Info Note */}
          <div className="p-3.5 bg-amber-50/90 rounded-lg border border-amber-300 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <Label htmlFor="customization_note" className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Customer Pre-Info Note / Warning (صارف کے لیے پیشگی اطلاع یا تنبیہ)</span>
              </Label>
              <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                Shown to Customer
              </span>
            </div>
            <Textarea
              id="customization_note"
              rows={2}
              placeholder="e.g. Note: Grinding process takes 2-3 hours. Minimum 5kg required for special sieve fine flour. (کسٹمر کو دکھانے کے لیے تنبیہ یا ہدایات لکھیں)"
              value={formData.customization_note || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, customization_note: e.target.value }))}
              disabled={isSaving}
              className="text-xs bg-white border-amber-300 text-amber-950 placeholder:text-amber-700/50 focus-visible:ring-amber-500"
            />
            <p className="text-[11px] text-amber-800 leading-tight">
              💡 Yeh note customer ko customization popup me as an important warning/pre-info box nazar aayega.
            </p>
          </div>

          <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200 space-y-2">
            <Label className="text-xs font-bold text-blue-900 block">Pricing Mode for Customizations</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className={`flex items-start gap-2 p-2 rounded-md border cursor-pointer transition-colors ${formData.customization_pricing_mode !== 'average' ? 'bg-white border-blue-400 shadow-sm' : 'bg-blue-50/50 border-blue-200'}`}>
                <input
                  type="radio"
                  name="customization_pricing_mode"
                  value="additive"
                  checked={formData.customization_pricing_mode !== 'average'}
                  onChange={() => setFormData(prev => ({ ...prev, customization_pricing_mode: 'additive' }))}
                  disabled={isSaving}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <span className="font-semibold text-blue-900 block">Additive (Sum of Add-ons)</span>
                  <span className="text-[11px] text-blue-700">Options are extra add-ons added on top of base price (e.g. Fine Flour + Cleaning + Delivery).</span>
                </div>
              </label>
              <label className={`flex items-start gap-2 p-2 rounded-md border cursor-pointer transition-colors ${formData.customization_pricing_mode === 'average' ? 'bg-white border-blue-400 shadow-sm' : 'bg-blue-50/50 border-blue-200'}`}>
                <input
                  type="radio"
                  name="customization_pricing_mode"
                  value="average"
                  checked={formData.customization_pricing_mode === 'average'}
                  onChange={() => setFormData(prev => ({ ...prev, customization_pricing_mode: 'average' }))}
                  disabled={isSaving}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <span className="font-semibold text-blue-900 block">Average Rate (Mix Proportion)</span>
                  <span className="text-[11px] text-blue-700">Each option represents an ingredient rate. Total rate is the average of items included by customer.</span>
                </div>
              </label>
            </div>
          </div>

          {formData.customizations.map((cust, idx) => (
            <div key={idx} className="flex items-end gap-2 p-3 bg-background rounded-lg border shadow-sm">
              <GripVertical className="hidden sm:block h-4 w-4 text-muted-foreground shrink-0 mb-2.5" />
              <div className="flex-1 min-w-0">
                <Label className="text-[10px] text-muted-foreground mb-1 block">
                  Option Name {allProducts.length > 0 && formData.customization_pricing_mode === 'average' ? '(Select from inventory)' : ''}
                </Label>
                {allProducts.length > 0 && formData.customization_pricing_mode === 'average' ? (
                  <InventoryProductSelector
                    allProducts={allProducts}
                    selectedProductId={cust.linked_product_id}
                    currentName={cust.option_name}
                    disabled={isSaving}
                    placeholder="Select inventory product..."
                    colorScheme="blue"
                    onSelect={(product) => {
                      updateCustomization(idx, 'option_name', product.name);
                      updateCustomization(idx, 'option_price', String(product.price || ''));
                      updateCustomization(idx, 'linked_product_id', product.id);
                    }}
                  />
                ) : (
                  <Input
                    placeholder="e.g. Fine Flour, Coarse Flour"
                    value={cust.option_name}
                    onChange={(e) => updateCustomization(idx, 'option_name', e.target.value)}
                    disabled={isSaving}
                    className="text-sm"
                  />
                )}
              </div>
              <div className="w-28 sm:w-32 shrink-0">
                <Label className="text-[10px] text-muted-foreground mb-1 block">
                  {formData.customization_pricing_mode === 'average' ? `Rate (Rs/${formData.unit || 'kg'})` : 'Price (Rs)'}
                </Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={cust.option_price}
                  onChange={(e) => updateCustomization(idx, 'option_price', e.target.value)}
                  disabled={isSaving}
                  className="text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removeCustomization(idx)}
                disabled={isSaving}
                title="Delete option"
                className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer disabled:opacity-50 mb-0.5"
              >
                <Trash2 className="h-4 w-4 text-red-600 shrink-0 stroke-[2.5]" />
              </button>
            </div>
          ))}

          {formData.customization_pricing_mode === 'average' ? (
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
              <div>
                <span className="font-bold text-emerald-800">🥣 Overall Product Rate (all items included):</span>
                <p className="text-[11px] text-emerald-600 mt-0.5">
                  When a customer orders, the rate is calculated based on the items they include in their mix.
                </p>
              </div>
              <span className="text-sm font-extrabold text-emerald-800 shrink-0 bg-white px-3 py-1 rounded-md border border-emerald-300">
                Rs. {(() => {
                  const valid = formData.customizations.filter(c => parseFloat(c.option_price) > 0);
                  return valid.length > 0 ? Math.round(valid.reduce((sum, c) => sum + parseFloat(c.option_price), 0) / valid.length) : 0;
                })()} / {formData.unit || 'kg'}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Total Price (all options selected): Rs. {formData.customizations.reduce((sum, c) => sum + (parseFloat(c.option_price) || 0), 0)}
            </p>
          )}
        </div>
      )}

      {formData.is_custom_mix && (
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 animate-in fade-in slide-in-from-top-2 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-purple-800">Mix Ingredients</p>
            <Button type="button" size="sm" variant="outline" className="w-full sm:w-auto border-purple-300 text-purple-700 hover:bg-purple-100" onClick={addMixItem} disabled={isSaving}>
              <Plus className="h-3 w-3 mr-1" /> Add Ingredient
            </Button>
          </div>

          {/* Inventory-only enforcement notice */}
          {allProducts.length > 0 ? (
            <div className="p-2 bg-purple-100/60 rounded-md border border-purple-200 text-[11px] text-purple-700">
              <Package className="h-3.5 w-3.5 inline-block mr-1 -mt-0.5" />
              <strong>Sirf inventory products:</strong> Mix ingredients inventory se select karen. Naya item add karne ke liye pehle inventory mein product add karein.
            </div>
          ) : (
            <div className="p-2 bg-amber-50 rounded-md border border-amber-300 text-[11px] text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5 inline-block mr-1 -mt-0.5" />
              <strong>⚠️ No inventory products loaded.</strong> Pehle inventory mein products add karein, phir yahan ingredients select hon ge.
            </div>
          )}

          {formData.mix_items.map((item, idx) => (
            <div key={idx} className="flex items-end gap-2 p-3 bg-white rounded-lg border border-purple-100 shadow-sm">
              <GripVertical className="hidden sm:block h-4 w-4 text-purple-300 shrink-0 mb-2.5" />
              <div className="flex-1 min-w-0">
                <Label className="text-[10px] text-purple-600 mb-1 block">
                  Ingredient {allProducts.length > 0 ? '(Select from inventory)' : 'Name'}
                </Label>
                {allProducts.length > 0 ? (
                  <InventoryProductSelector
                    allProducts={allProducts}
                    selectedProductId={item.product_ingredient_id}
                    currentName={item.item_name}
                    disabled={isSaving}
                    placeholder="Select ingredient from inventory..."
                    colorScheme="purple"
                    onSelect={(product) => {
                      updateMixItem(idx, 'item_name', product.name);
                      updateMixItem(idx, 'price_per_kg', String(product.price || ''));
                      updateMixItem(idx, 'product_ingredient_id', product.id);
                    }}
                  />
                ) : (
                  <Input
                    placeholder="e.g. Wheat, Chana, Bajra"
                    value={item.item_name}
                    onChange={(e) => updateMixItem(idx, 'item_name', e.target.value)}
                    disabled={isSaving}
                    className="text-sm border-purple-100 focus-visible:ring-purple-400"
                  />
                )}
              </div>
              <div className="w-24 sm:w-28 shrink-0">
                <Label className="text-[10px] text-purple-600 mb-1 block">Price / kg</Label>
                <Input
                  type="number"
                  placeholder="Rs."
                  value={item.price_per_kg}
                  onChange={(e) => updateMixItem(idx, 'price_per_kg', e.target.value)}
                  disabled={isSaving}
                  className="text-sm border-purple-100 focus-visible:ring-purple-400"
                />
              </div>
              <div className="w-16 sm:w-20 shrink-0">
                <Label className="text-[10px] text-purple-600 mb-1 block">Ratio</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 1"
                  value={item.default_ratio}
                  onChange={(e) => updateMixItem(idx, 'default_ratio', e.target.value)}
                  disabled={isSaving}
                  className="text-sm border-purple-100 focus-visible:ring-purple-400"
                />
              </div>
              <button
                type="button"
                onClick={() => removeMixItem(idx)}
                disabled={isSaving}
                title="Delete ingredient"
                className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer disabled:opacity-50 mb-0.5"
              >
                <Trash2 className="h-4 w-4 text-red-600 shrink-0 stroke-[2.5]" />
              </button>
            </div>
          ))}
          
          <p className="text-[10px] text-purple-600 italic">
            Note: Price is automatically calculated on the frontend based on user's selected proportions. Stock will be deducted proportionally from each ingredient's inventory.
          </p>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Checkbox
          id="trackInventory"
          checked={formData.track_inventory}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, track_inventory: !!checked }))}
          disabled={isSaving}
        />
        <Label htmlFor="trackInventory" className="text-muted-foreground cursor-pointer">
          Track stock for this service in Inventory Management
        </Label>
      </div>

      {formData.track_inventory && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-3 sm:pl-6 border-l-2 border-primary/20">
          <div>
            <Label htmlFor="stock_quantity" className="text-xs font-semibold text-primary">Initial Stock Quantity</Label>
            <Input
              id="stock_quantity"
              type="number"
              placeholder="e.g., 100"
              value={formData.stock_quantity || ''}
              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              disabled={isSaving}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="min_stock_level" className="text-xs font-semibold text-primary">Low Stock Threshold (Alert Level)</Label>
            <Input
              id="min_stock_level"
              type="number"
              placeholder="e.g., 10"
              value={formData.min_stock_level || ''}
              onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
              disabled={isSaving}
              className="mt-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}