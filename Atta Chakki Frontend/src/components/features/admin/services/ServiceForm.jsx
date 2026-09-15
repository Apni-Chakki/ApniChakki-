import React from 'react';
import { Card } from '../../../common/card';
import { Button } from '../../../common/button';
import { Input } from '../../../common/input';
import { Label } from '../../../common/label';
import { Textarea } from '../../../common/textarea';
import { Checkbox } from '../../../common/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../common/select';
import { Loader2, UploadCloud, Plus, X, Save } from 'lucide-react';
import { CustomizationsSection } from './CustomizationsSection';
import { RentalSection } from './RentalSection';
import { DiscountBadgeSection } from './DiscountBadgeSection';

export function ServiceForm({
  editingId,
  formData,
  setFormData,
  categories,
  weightInput,
  setWeightInput,
  isSaving,
  isUploading,
  formRef,
  handleImageChange,
  handleAdd,
  handleUpdate,
  handleCancel,
  addCustomization,
  removeCustomization,
  updateCustomization,
  addMixItem,
  removeMixItem,
  updateMixItem,
  computeDiscountedPrice,
}) {
  return (
    <div ref={formRef}>
      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 text-lg sm:text-xl font-semibold">{editingId ? 'Edit Service' : 'Add New Service'}</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Wheat Grinding"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSaving}
              />
            </div>
            <div>
              <Label htmlFor="price">Price (Rs) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="e.g., 10"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                disabled={isSaving || formData.has_customizations}
              />
              {formData.has_customizations && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  💡 {formData.customization_pricing_mode === 'average'
                    ? `Auto-calculated average rate: Rs. ${formData.price || 0} / ${formData.unit || 'kg'}`
                    : 'Auto-calculated sum from customizations'}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="unit">Unit</Label>
              <select
                id="unit"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 text-sm"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                disabled={isSaving}
              >
                <option value="kg">kg</option>
                <option value="bag">bag</option>
                <option value="liter">liter</option>
                <option value="piece">piece</option>
                <option value="trip">trip</option>
              </select>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
                disabled={isSaving}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name} className="text-sm">
                        {cat.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="service" className="text-sm">
                      Convenience Services
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Display Priority</Label>
              <Input
                id="priority"
                type="number"
                placeholder="e.g., 10 (Highest first)"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                disabled={isSaving}
                className="text-sm animate-in fade-in"
              />
            </div>
          </div>

          {/* Dual Unit Toggle (Pickup + KG) */}
          <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dual_unit"
                checked={formData.dual_unit}
                onCheckedChange={(checked) => {
                  setFormData((prev) => ({
                    ...prev,
                    dual_unit: !!checked,
                    unit: checked ? 'kg' : prev.unit,
                  }));
                }}
                disabled={isSaving}
              />
              <Label htmlFor="dual_unit" className="font-semibold text-blue-700 cursor-pointer">
                🔄 Enable Dual Mode (Pickup Request + Per KG)
              </Label>
            </div>
            {formData.dual_unit && (
              <p className="text-[10px] text-blue-600 mt-1 ml-6">
                Card will show both "Add Pickup Request" (unit=trip, weight TBD) and "Add to Cart" (unit=kg) buttons.
              </p>
            )}
          </div>

          {/* Quick Quantity Options (All Units) */}
          {formData.unit !== 'trip' && (
            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200">
              <Label className="font-semibold text-emerald-700 mb-2 block">
                ⚡ Quick {formData.unit?.toUpperCase() || 'QTY'} Options (e.g. 5, 10, 20)
              </Label>
              <p className="text-[10px] text-emerald-600 mb-2">
                Customer will see these as quick-select buttons along with +/- manual selector.
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.weight_options.map((w, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-300"
                  >
                    {w} {formData.unit || 'unit'}
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          weight_options: prev.weight_options.filter((_, i) => i !== idx),
                        }))
                      }
                      className="text-emerald-500 hover:text-red-500 ml-1 font-bold"
                      disabled={isSaving}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={`Enter ${formData.unit || 'qty'} value...`}
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = parseFloat(weightInput);
                      if (val > 0 && !formData.weight_options.includes(val)) {
                        setFormData((prev) => ({
                          ...prev,
                          weight_options: [...prev.weight_options, val].sort((a, b) => a - b),
                        }));
                        setWeightInput('');
                      }
                    }
                  }}
                  className="flex-1"
                  disabled={isSaving}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-emerald-400 text-emerald-700 hover:bg-emerald-100"
                  disabled={isSaving}
                  onClick={() => {
                    const val = parseFloat(weightInput);
                    if (val > 0 && !formData.weight_options.includes(val)) {
                      setFormData((prev) => ({
                        ...prev,
                        weight_options: [...prev.weight_options, val].sort((a, b) => a - b),
                      }));
                      setWeightInput('');
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the service"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              disabled={isSaving}
            />
          </div>

          <div>
            <Label>Product Image</Label>
            <div className="flex flex-col sm:flex-row gap-4 items-start mt-2">
              <div className="relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center w-full max-w-sm hover:bg-muted/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading || isSaving}
                />
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                    <p className="text-sm">Uploading...</p>
                  </div>
                ) : formData.imageUrl ? (
                  <img src={formData.imageUrl} alt="Product image" className="h-32 object-contain" />
                ) : (
                  <div className="flex flex-col items-center">
                    <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="font-medium text-sm">Click to upload or drag & drop</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WebP up to 10MB</p>
                  </div>
                )}
              </div>
              {formData.imageUrl && (
                <div className="flex-1">
                  <p className="text-sm font-medium text-success mb-2">✅ Image uploaded successfully</p>
                  <Input
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* DYNAMIC SERVICE CUSTOMIZATIONS & MIX */}
          <CustomizationsSection
            formData={formData}
            setFormData={setFormData}
            isSaving={isSaving}
            addCustomization={addCustomization}
            removeCustomization={removeCustomization}
            updateCustomization={updateCustomization}
            addMixItem={addMixItem}
            removeMixItem={removeMixItem}
            updateMixItem={updateMixItem}
          />

          {/* RENTAL TOGGLE & CONFIGURATION */}
          <RentalSection formData={formData} setFormData={setFormData} isSaving={isSaving} />

          {/* DISCOUNT & BADGE CONFIGURATION & LIVE PREVIEW */}
          <DiscountBadgeSection
            formData={formData}
            setFormData={setFormData}
            isSaving={isSaving}
            computeDiscountedPrice={computeDiscountedPrice}
          />

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={editingId ? handleUpdate : handleAdd}
              size="lg"
              disabled={isSaving || isUploading}
              className="w-full sm:w-auto"
            >
              {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
              {editingId ? 'Update Service' : 'Add Service'}
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              size="lg"
              disabled={isSaving || isUploading}
              className="w-full sm:w-auto"
            >
              <X className="h-5 w-5 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}