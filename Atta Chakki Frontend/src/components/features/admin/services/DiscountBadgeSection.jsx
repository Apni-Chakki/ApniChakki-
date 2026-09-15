import React from 'react';
import { Input } from '../../../common/input';
import { Label } from '../../../common/label';

export function DiscountBadgeSection({
  formData,
  setFormData,
  isSaving,
  computeDiscountedPrice,
}) {
  return (
    <div className="p-4 bg-rose-50/50 rounded-lg border border-rose-200 space-y-3">
      <p className="text-sm font-bold text-rose-700">🏷️ Discount & Badge (Optional)</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label htmlFor="discount_type" className="text-xs font-semibold text-rose-700">Discount Type</Label>
          <select
            id="discount_type"
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.discount_type}
            onChange={(e) => setFormData({ ...formData, discount_type: e.target.value, discount_value: e.target.value === 'none' ? '' : formData.discount_value })}
            disabled={isSaving}
          >
            <option value="none">No Discount</option>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount (Rs.)</option>
          </select>
        </div>

        <div>
          <Label htmlFor="discount_value" className="text-xs font-semibold text-rose-700">
            Discount Value {formData.discount_type === 'percentage' ? '(%)' : formData.discount_type === 'fixed' ? '(Rs.)' : ''}
          </Label>
          <Input
            id="discount_value"
            type="number"
            step="0.01"
            min="0"
            max={formData.discount_type === 'percentage' ? 100 : undefined}
            placeholder={formData.discount_type === 'percentage' ? 'e.g., 10' : 'e.g., 50'}
            value={formData.discount_value}
            onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
            disabled={isSaving || formData.discount_type === 'none'}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="badge_text" className="text-xs font-semibold text-rose-700">Badge Text (max 50)</Label>
          <Input
            id="badge_text"
            type="text"
            maxLength={50}
            placeholder="e.g., New, Hot Deal, Best Seller"
            value={formData.badge_text}
            onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
            disabled={isSaving}
            className="mt-1"
          />
        </div>
      </div>

      {/* Live Preview */}
      {(formData.name || formData.price) && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Live Preview</p>
          <div className="relative w-full max-w-xs bg-white rounded-xl border border-border shadow-md overflow-hidden">
            {/* Badge */}
            {formData.badge_text && formData.badge_text.trim() && (
              <span className="absolute top-2 left-2 z-10 bg-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md uppercase tracking-wide">
                {formData.badge_text.trim()}
              </span>
            )}
            {/* Discount badge */}
            {formData.discount_type !== 'none' && parseFloat(formData.discount_value) > 0 && (
              <span className="absolute top-2 right-2 z-10 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
                {formData.discount_type === 'percentage'
                  ? `-${Math.min(parseFloat(formData.discount_value), 100)}%`
                  : `-Rs.${parseFloat(formData.discount_value)}`}
              </span>
            )}

            <div className="h-32 bg-muted flex items-center justify-center overflow-hidden">
              {formData.imageUrl ? (
                <img src={formData.imageUrl} alt="preview" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">No image</span>
              )}
            </div>

            <div className="p-3 space-y-1">
              <p className="font-bold text-sm truncate">{formData.name || 'Product Name'}</p>
              <p className="text-[11px] text-muted-foreground truncate">{formData.description || 'Short description...'}</p>
              <div className="flex items-baseline gap-2 pt-1">
                {formData.discount_type !== 'none' && parseFloat(formData.discount_value) > 0 ? (
                  <>
                    <span className="text-base font-bold text-rose-700">
                      Rs. {computeDiscountedPrice(formData.price, formData.discount_type, formData.discount_value).toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground line-through">
                      Rs. {parseFloat(formData.price || 0).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      / {formData.unit}
                    </span>
                  </>
                ) : (
                  <span className="text-base font-bold text-primary">
                    Rs. {parseFloat(formData.price || 0).toFixed(2)} <span className="text-[10px] text-muted-foreground font-normal">/ {formData.unit}</span>
                  </span>
                )}
              </div>
              {formData.discount_type !== 'none' && parseFloat(formData.discount_value) > 0 && (
                <p className="text-[10px] text-emerald-700 font-semibold">
                  You save Rs. {(parseFloat(formData.price || 0) - computeDiscountedPrice(formData.price, formData.discount_type, formData.discount_value)).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}