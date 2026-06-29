import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Save, X, Loader2, UploadCloud, GripVertical, Truck, Weight, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/common/button';
import { Input } from '../../components/common/input';
import { Label } from '../../components/common/label';
import { Textarea } from '../../components/common/textarea';
import { Card } from '../../components/common/card';
import { toast } from 'sonner';
import { Checkbox } from '../../components/common/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/common/select';
import { API_BASE_URL } from '../../config';
import { compressImage } from '../../utils/imageCompressor';

export function ManageServices() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    unit: 'kg',
    description: '',
    imageUrl: '',
    category: '',
    has_customizations: false,
    customizations: [],
    track_inventory: true,
    stock_quantity: '100',
    min_stock_level: '10',
    dual_unit: false,
    weight_options: [],
    is_custom_mix: false,
    mix_items: [],
    discount_type: 'none',
    discount_value: '',
    badge_text: '',
    is_rental: false,
    rental_price_per_day: '',
    security_deposit: '',
    late_penalty_per_day: '',
    rental_available_qty: '',
    priority: '0'
  });
  const [weightInput, setWeightInput] = useState('');

  // Compute discounted price for live preview
  const computeDiscountedPrice = (price, dType, dValue) => {
    const p = parseFloat(price) || 0;
    const v = parseFloat(dValue) || 0;
    if (!p || dType === 'none' || v <= 0) return p;
    if (dType === 'percentage') return Math.max(0, p - (p * Math.min(v, 100) / 100));
    if (dType === 'fixed') return Math.max(0, p - v);
    return p;
  };

  // Auto-calculate total price from customizations
  useEffect(() => {
    if (formData.has_customizations && formData.customizations.length > 0) {
      const total = formData.customizations.reduce((sum, c) => sum + (parseFloat(c.option_price) || 0), 0);
      setFormData(prev => ({ ...prev, price: total.toString() }));
    }
  }, [formData.customizations, formData.has_customizations]);

  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    if (isAdding || editingId) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [isAdding, editingId]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const [servicesRes, categoriesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/get_all_products.php`),
        fetch(`${API_BASE_URL}/get_categories.php`)
      ]);
      const data = await servicesRes.json();
      const catsData = await categoriesRes.json();

      if (catsData.success) {
        setCategories(catsData.categories);
        if (!formData.category && catsData.categories.length > 0) {
          setFormData(prev => ({ ...prev, category: catsData.categories[0].name }));
        }
      }

      if (data.success) {
        setServices(data.products);
      } else {
        toast.error(data.message || 'Failed to load services');
      }
    } catch (error) {
      console.error("Network Error:", error);
      toast.error('Network Error: Could not connect to database');
    } finally {
      setLoading(false);
    }
  };

  const uploadToCloudinary = async (file) => {
    setIsUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('image', file);
    formDataUpload.append('folder', 'products');

    try {
      const response = await fetch(`${API_BASE_URL}/products/upload_image.php`, {
        method: 'POST',
        body: formDataUpload,
      });
      const data = await response.json();
      
      if (data.success) {
        setFormData(prev => ({ ...prev, imageUrl: data.url }));
        toast.success('Image uploaded successfully!');
        return data.url;
      } else {
        toast.error(data.message || 'Image upload failed');
        return null;
      }
    } catch (error) {
      console.error("Upload Error:", error);
      toast.error('Network error during upload');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const compressedFile = await compressImage(file);
      setImageFile(compressedFile);
      await uploadToCloudinary(compressedFile);
    }
  };

  const isTracked = formData.category !== 'service';

  // --- Customization helpers ---
  const addCustomization = () => {
    setFormData(prev => ({
      ...prev,
      customizations: [...prev.customizations, { option_name: '', option_price: '', sort_order: prev.customizations.length + 1 }]
    }));
  };

  const updateCustomization = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.customizations];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, customizations: updated };
    });
  };

  const removeCustomization = (index) => {
    setFormData(prev => ({
      ...prev,
      customizations: prev.customizations.filter((_, i) => i !== index)
    }));
  };

  // --- Mix Items helpers ---
  const addMixItem = () => {
    setFormData(prev => ({
      ...prev,
      mix_items: [...prev.mix_items, { item_name: '', price_per_kg: '', default_ratio: '1', sort_order: prev.mix_items.length + 1 }]
    }));
  };

  const updateMixItem = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.mix_items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, mix_items: updated };
    });
  };

  const removeMixItem = (index) => {
    setFormData(prev => ({
      ...prev,
      mix_items: prev.mix_items.filter((_, i) => i !== index)
    }));
  };

  // --- Build payload for API ---
  const buildPayload = () => {
    const payload = {
      name: formData.name,
      price: parseFloat(formData.price),
      unit: formData.unit,
      description: formData.description,
      image: formData.imageUrl,
      category: formData.category,
      is_grinding_service: formData.has_customizations ? 1 : 0,
      cleaning_price: 0,
      grinding_price: 0,
      track_inventory: formData.track_inventory ? 1 : 0,
      stock_quantity: parseFloat(formData.stock_quantity) || 0,
      min_stock_level: parseFloat(formData.min_stock_level) || 0,
      dual_unit: formData.dual_unit ? 1 : 0,
      weight_options: formData.weight_options.length > 0 ? formData.weight_options : [],
      is_custom_mix: formData.is_custom_mix ? 1 : 0,
      customizations: formData.has_customizations && !formData.is_custom_mix
        ? formData.customizations.map((c, i) => ({
            option_name: c.option_name,
            option_price: parseFloat(c.option_price) || 0,
            sort_order: i + 1
          }))
        : [],
      mix_items: formData.is_custom_mix
        ? formData.mix_items.map((m, i) => ({
            item_name: m.item_name,
            price_per_kg: parseFloat(m.price_per_kg) || 0,
            default_ratio: parseFloat(m.default_ratio) || 1,
            sort_order: i + 1
          }))
        : [],
      discount_type: formData.discount_type || 'none',
      discount_value: formData.discount_type === 'none' ? 0 : (parseFloat(formData.discount_value) || 0),
      badge_text: (formData.badge_text || '').trim(),
      is_rental: formData.is_rental ? 1 : 0,
      rental_price_per_day: parseFloat(formData.rental_price_per_day) || 0,
      security_deposit: parseFloat(formData.security_deposit) || 0,
      late_penalty_per_day: parseFloat(formData.late_penalty_per_day) || 0,
      rental_available_qty: parseInt(formData.rental_available_qty) || 0,
      priority: parseInt(formData.priority) || 0
    };
    return payload;
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (formData.has_customizations) {
      const invalid = formData.customizations.some(c => !c.option_name || !c.option_price);
      if (invalid || formData.customizations.length === 0) {
        toast.error('Please add at least one customization with name and price');
        return;
      }
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/add_product.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload())
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Service added successfully!');
        resetForm();
        setIsAdding(false);
        fetchServices();
      } else {
        toast.error(result.message || 'Failed to add service');
      }
    } catch (error) {
      toast.error('Network error while saving');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (service) => {
    const custs = service.customizations && service.customizations.length > 0
      ? service.customizations.map(c => ({ option_name: c.option_name, option_price: c.option_price.toString(), sort_order: c.sort_order }))
      : [];
    
    const hasCust = custs.length > 0 || service.is_grinding_service === 1 || service.is_grinding_service === true;

    // Fallback: if old product with is_grinding_service but no dynamic customizations, create from old fields
    const fallbackCusts = (hasCust && custs.length === 0)
      ? [
          { option_name: 'Cleaning', option_price: (service.cleaning_price || 0).toString(), sort_order: 1 },
          { option_name: 'Grinding', option_price: (service.grinding_price || 0).toString(), sort_order: 2 }
        ]
      : custs;

    const mixItems = service.mix_items && service.mix_items.length > 0
      ? service.mix_items.map(m => ({ item_name: m.item_name, price_per_kg: m.price_per_kg.toString(), default_ratio: m.default_ratio.toString(), sort_order: m.sort_order }))
      : [];

    setEditingId(service.id);
    setFormData({
      name: service.name,
      price: service.price.toString(),
      unit: service.unit,
      description: service.description || '',
      imageUrl: service.image || service.image_url || service.imageUrl || '',
      category: service.category || service.category_name || (categories.length > 0 ? categories[0].name : ''),
      has_customizations: hasCust && !(service.is_custom_mix === 1 || service.is_custom_mix === '1' || service.is_custom_mix === true),
      customizations: fallbackCusts,
      track_inventory: service.track_inventory === 1 || service.track_inventory === true,
      stock_quantity: (service.stock_quantity ?? 100).toString(),
      min_stock_level: (service.min_stock_level ?? 10).toString(),
      dual_unit: service.dual_unit === 1 || service.dual_unit === true,
      weight_options: Array.isArray(service.weight_options) ? service.weight_options : [],
      is_custom_mix: service.is_custom_mix === 1 || service.is_custom_mix === '1' || service.is_custom_mix === true,
      mix_items: mixItems,
      discount_type: service.discount_type || 'none',
      discount_value: service.discount_value && parseFloat(service.discount_value) > 0 ? service.discount_value.toString() : '',
      badge_text: service.badge_text || '',
      is_rental: service.is_rental === 1 || service.is_rental === true,
      rental_price_per_day: service.rental_price_per_day && parseFloat(service.rental_price_per_day) > 0 ? service.rental_price_per_day.toString() : '',
      security_deposit: service.security_deposit && parseFloat(service.security_deposit) > 0 ? service.security_deposit.toString() : '',
      late_penalty_per_day: service.late_penalty_per_day && parseFloat(service.late_penalty_per_day) > 0 ? service.late_penalty_per_day.toString() : '',
      rental_available_qty: service.rental_available_qty ? service.rental_available_qty.toString() : '',
      priority: (service.priority ?? 0).toString()
    });
    setWeightInput('');
    setImageFile(null);
  };

  const handleUpdate = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const payload = { ...buildPayload(), id: editingId };
      const response = await fetch(`${API_BASE_URL}/update_product.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const rawText = await response.text();
      console.log("Raw API Response:", rawText);
      const result = JSON.parse(rawText);
      if (result.success) {
        toast.success('Service updated successfully!');
        setEditingId(null);
        resetForm();
        fetchServices();
      } else {
        toast.error(result.message || 'Failed to update service');
      }
    } catch (error) {
      console.error("Network Error Details:", error);
      toast.error('Network error while updating - Check Console F12');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/update_product_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id, is_active: Number(currentStatus) === 1 ? 0 : 1 })
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        fetchServices();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Network error while toggling status');
    }
  };

  const handleDelete = async (id) => {
    const deleteService = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/delete_product.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id })
        });
        const result = await response.json();
        if (result.success) {
          toast.success('Service deleted successfully!');
          fetchServices();
        } else {
          toast.error(result.message || 'Failed to delete service.');
        }
      } catch (error) {
        toast.error('Network error while deleting');
      }
    };

    toast.custom((toastId) => (
      <div className="bg-primary border border-primary-foreground/20 rounded-lg p-4 shadow-xl flex flex-col gap-3 max-w-sm">
        <p className="text-primary-foreground font-medium">Are you sure you want to delete this service?</p>
        <div className="flex gap-2 justify-end">
          <Button 
            onClick={() => toast.dismiss(toastId)} 
            variant="outline" 
            size="sm"
            className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 border-transparent"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              toast.dismiss(toastId);
              deleteService();
            }} 
            size="sm"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent"
          >
            Delete
          </Button>
        </div>
      </div>
    ));
  };

  const resetForm = () => {
    setFormData({
      name: '', price: '', unit: 'kg', description: '', imageUrl: '',
      category: categories.length > 0 ? categories[0].name : '',
      has_customizations: false,
      customizations: [],
      track_inventory: true,
      stock_quantity: '100',
      min_stock_level: '10',
      dual_unit: false,
      weight_options: [],
      is_custom_mix: false,
      mix_items: [],
      discount_type: 'none',
      discount_value: '',
      badge_text: '',
      is_rental: false,
      rental_price_per_day: '',
      security_deposit: '',
      late_penalty_per_day: '',
      rental_available_qty: '',
      priority: '0'
    });
    setWeightInput('');
    setImageFile(null);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
  };

  if (loading && services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading Services...</p>
      </div>
    );
  }

  // Grouping services by category
  const groupedServices = services.reduce((groups, service) => {
    const category = service.category || service.category_name || 'Uncategorized';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(service);
    return groups;
  }, {});

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Manage Services</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Add, edit, or remove services from your catalog</p>
        </div>
        {!isAdding && !editingId && (
          <Button onClick={() => setIsAdding(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2 shrink-0" />
            Add New Service
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div ref={formRef}>
          <Card className="p-4 sm:p-6">
          <h2 className="mb-4 text-lg sm:text-xl font-semibold">{editingId ? 'Edit Service' : 'Add New Service'}</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Service Name *</Label>
                <Input id="name" placeholder="e.g., Wheat Grinding" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={isSaving} />
              </div>
              <div>
                <Label htmlFor="price">Price (Rs) *</Label>
                <Input id="price" type="number" step="0.01" placeholder="e.g., 10" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} disabled={isSaving || formData.has_customizations} />
                {formData.has_customizations && <p className="text-[10px] text-muted-foreground mt-1">⚡ Auto-calculated from customizations</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="unit">Unit</Label>
                <select id="unit" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 text-sm" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} disabled={isSaving}>
                  <option value="kg">kg</option>
                  <option value="bag">bag</option>
                  <option value="liter">liter</option>
                  <option value="piece">piece</option>
                  <option value="trip">trip</option>
                </select>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })} disabled={isSaving}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.length > 0 ? categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name} className="text-sm">{cat.name}</SelectItem>
                    )) : (
                      <SelectItem value="service" className="text-sm">Convenience Services</SelectItem>
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
                    setFormData(prev => ({
                      ...prev,
                      dual_unit: !!checked,
                      unit: checked ? 'kg' : prev.unit
                    }));
                  }}
                  disabled={isSaving}
                />
                <Label htmlFor="dual_unit" className="font-semibold text-blue-700 cursor-pointer">
                  🚚 Enable Dual Mode (Pickup Request + Per KG)
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
                <Label className="font-semibold text-emerald-700 mb-2 block">⚖️ Quick {formData.unit?.toUpperCase() || 'QTY'} Options (e.g. 5, 10, 20)</Label>
                <p className="text-[10px] text-emerald-600 mb-2">Customer will see these as quick-select buttons along with +/- manual selector.</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.weight_options.map((w, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-300">
                      {w} {formData.unit || 'unit'}
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, weight_options: prev.weight_options.filter((_, i) => i !== idx) }))} className="text-emerald-500 hover:text-red-500 ml-1 font-bold" disabled={isSaving}>
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
                           setFormData(prev => ({ ...prev, weight_options: [...prev.weight_options, val].sort((a, b) => a - b) }));
                          setWeightInput('');
                        }
                      }
                    }}
                    className="flex-1"
                    disabled={isSaving}
                  />
                  <Button type="button" variant="outline" size="sm" className="border-emerald-400 text-emerald-700 hover:bg-emerald-100" disabled={isSaving} onClick={() => {
                    const val = parseFloat(weightInput);
                    if (val > 0 && !formData.weight_options.includes(val)) {
                      setFormData(prev => ({ ...prev, weight_options: [...prev.weight_options, val].sort((a, b) => a - b) }));
                      setWeightInput('');
                    }
                  }}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Brief description of the service" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} disabled={isSaving} />
            </div>

            <div>
              <Label>Product Image</Label>
              <div className="flex flex-col sm:flex-row gap-4 items-start mt-2">
                <div className="relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center w-full max-w-sm hover:bg-muted/50 transition-colors">
                  <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isUploading || isSaving} />
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
                    <p className="text-sm font-medium text-success mb-2">✓ Image uploaded successfully</p>
                    <Input value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} className="text-xs" />
                  </div>
                )}
              </div>
            </div>

            {/* ===== DYNAMIC SERVICE CUSTOMIZATIONS ===== */}
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
                        ? [{ option_name: '', option_price: '', sort_order: 1 }]
                        : prev.customizations
                    }));
                  }}
                  disabled={isSaving}
                />
                <Label htmlFor="has_customizations" className="font-semibold text-primary">
                  ⚙️ Enable Service Customizations (Customer can select options)
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
                        ? [{ item_name: '', price_per_kg: '', default_ratio: '1', sort_order: 1 }]
                        : prev.mix_items
                    }));
                  }}
                  disabled={isSaving}
                />
                <Label htmlFor="is_custom_mix" className="font-semibold text-purple-700">
                  🌾 Custom Mix / Multigrain (Customer chooses proportions)
                </Label>
              </div>

              {formData.has_customizations && !formData.is_custom_mix && (
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-top-2 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-bold text-primary">Customization Options</p>
                    <Button type="button" size="sm" variant="outline" onClick={addCustomization} disabled={isSaving} className="w-full sm:w-auto">
                      <Plus className="h-3 w-3 mr-1" /> Add Option
                    </Button>
                  </div>

                  {formData.customizations.map((cust, idx) => (
                    <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-center p-3 bg-white rounded-lg border border-border shadow-sm">
                      <div className="flex items-center gap-2 sm:contents">
                        <GripVertical className="hidden sm:block h-4 w-4 text-muted-foreground shrink-0" />
                        <Input
                          placeholder="Option name (e.g. Cleaning, Grinding, Roasting...)"
                          value={cust.option_name}
                          onChange={(e) => updateCustomization(idx, 'option_name', e.target.value)}
                          disabled={isSaving}
                          className="text-sm flex-1 min-w-0 sm:flex-1"
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomization(idx)} disabled={isSaving} className="sm:hidden shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        type="number"
                        placeholder="Rs."
                        value={cust.option_price}
                        onChange={(e) => updateCustomization(idx, 'option_price', e.target.value)}
                        disabled={isSaving}
                        className="text-sm w-full sm:w-28"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomization(idx)} disabled={isSaving} className="hidden sm:flex shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <p className="text-xs text-muted-foreground">
                    Total Price (all options selected): Rs. {formData.customizations.reduce((sum, c) => sum + (parseFloat(c.option_price) || 0), 0)}
                  </p>
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

                  {formData.mix_items.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-end p-3 bg-white rounded-lg border border-purple-100 shadow-sm">
                      <div className="flex items-end gap-2 sm:contents">
                        <GripVertical className="hidden sm:block h-4 w-4 text-purple-300 shrink-0 mb-2.5" />
                        <div className="flex-1 min-w-0 sm:flex-1">
                          <Label className="text-[10px] text-purple-600 mb-1 block">Ingredient Name</Label>
                          <Input
                            placeholder="e.g. Wheat, Chana, Bajra"
                            value={item.item_name}
                            onChange={(e) => updateMixItem(idx, 'item_name', e.target.value)}
                            disabled={isSaving}
                            className="text-sm border-purple-100 focus-visible:ring-purple-400"
                          />
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeMixItem(idx)} disabled={isSaving} className="sm:hidden shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 mb-1">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:contents">
                        <div className="min-w-0 sm:w-24">
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
                        <div className="min-w-0 sm:w-24">
                          <Label className="text-[10px] text-purple-600 mb-1 block">Default Ratio</Label>
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
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeMixItem(idx)} disabled={isSaving} className="hidden sm:flex shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 mb-1">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <p className="text-[10px] text-purple-600 italic">
                    Note: Price is automatically calculated on the frontend based on user's selected proportions.
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

              {/* ===== RENTAL TOGGLE ===== */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_rental"
                  checked={formData.is_rental}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_rental: !!checked }))}
                  disabled={isSaving}
                />
                <Label htmlFor="is_rental" className="font-semibold text-teal-700 cursor-pointer">
                  🔄 Enable Rental (Rent this item to customers per day)
                </Label>
              </div>

              {formData.is_rental && (
                <div className="p-4 bg-teal-50/50 rounded-lg border border-teal-200 animate-in fade-in slide-in-from-top-2 space-y-3">
                  <p className="text-sm font-bold text-teal-800">🔄 Rental Configuration</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rental_price_per_day" className="text-xs font-semibold text-teal-700">Rental Price / Day (Rs.) *</Label>
                      <Input
                        id="rental_price_per_day"
                        type="number"
                        step="1"
                        placeholder="e.g., 500"
                        value={formData.rental_price_per_day}
                        onChange={(e) => setFormData({ ...formData, rental_price_per_day: e.target.value })}
                        disabled={isSaving}
                        className="mt-1 border-teal-200 focus-visible:ring-teal-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="security_deposit" className="text-xs font-semibold text-teal-700">Security Deposit (Rs.) *</Label>
                      <Input
                        id="security_deposit"
                        type="number"
                        step="1"
                        placeholder="e.g., 5000"
                        value={formData.security_deposit}
                        onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
                        disabled={isSaving}
                        className="mt-1 border-teal-200 focus-visible:ring-teal-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="late_penalty_per_day" className="text-xs font-semibold text-teal-700">Late Return Penalty / Day (Rs.)</Label>
                      <Input
                        id="late_penalty_per_day"
                        type="number"
                        step="1"
                        placeholder="e.g., 200"
                        value={formData.late_penalty_per_day}
                        onChange={(e) => setFormData({ ...formData, late_penalty_per_day: e.target.value })}
                        disabled={isSaving}
                        className="mt-1 border-teal-200 focus-visible:ring-teal-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rental_available_qty" className="text-xs font-semibold text-teal-700">Available Qty for Rental *</Label>
                      <Input
                        id="rental_available_qty"
                        type="number"
                        step="1"
                        placeholder="e.g., 5"
                        value={formData.rental_available_qty}
                        onChange={(e) => setFormData({ ...formData, rental_available_qty: e.target.value })}
                        disabled={isSaving}
                        className="mt-1 border-teal-200 focus-visible:ring-teal-400"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-teal-600 italic">
                    Note: When a customer rents this item, Available Qty will auto-decrement. On return it will increment back.
                  </p>
                </div>
              )}
            </div>

            {/* ===== DISCOUNT & BADGE ===== */}
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

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button onClick={editingId ? handleUpdate : handleAdd} size="lg" disabled={isSaving || isUploading} className="w-full sm:w-auto">
                {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                {editingId ? 'Update Service' : 'Add Service'}
              </Button>
              <Button onClick={handleCancel} variant="outline" size="lg" disabled={isSaving || isUploading} className="w-full sm:w-auto">
                <X className="h-5 w-5 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      </div>
      )}

      {/* Services List Grouped by Category */}
      <div className="space-y-8 animate-in fade-in duration-500">
        {services.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No services available. Add your first service!</p>
          </Card>
        ) : (
          Object.keys(groupedServices).map((categoryName) => {
            const categoryItems = groupedServices[categoryName];
            return (
              <div key={categoryName} className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-1">
                  <div className="inline-flex self-start items-center gap-2 bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-sm uppercase tracking-wider">
                    <span>{categoryName.toLowerCase() === 'service' || categoryName.toLowerCase() === 'services' ? '💼' : '🌾'}</span>
                    <span className="break-words">{categoryName}</span>
                  </div>
                  <div className="hidden sm:block flex-1 h-[1px] bg-gradient-to-r from-slate-200 to-transparent" />
                  <span className="text-[11px] sm:text-xs text-slate-500 font-semibold">
                    {categoryItems.length} Item(s)
                  </span>
                </div>

                <div className="space-y-4">
                  {categoryItems.map((service) => {
                    const custs = service.customizations || [];
                    const hasCusts = custs.length > 0 || service.is_grinding_service === 1 || service.is_grinding_service === true;
                    return (
                      <Card key={service.id} className="p-3 sm:p-6 transition-all duration-300 hover:shadow-lg border border-border/50 hover:border-primary/20 bg-white relative overflow-hidden group">
                        {/* Priority Badge */}
                        <div className="absolute top-0 right-0 bg-primary/10 text-primary text-[9px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-bl border-l border-b border-primary/10 transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                          ⭐ {service.priority ?? 0}
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:gap-4 mt-4 sm:mt-0">
                          {service.image && (
                            <div className="w-full sm:w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-muted border border-border shadow-inner">
                              <img src={service.image} alt={service.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="mb-1.5 sm:mb-2 text-base sm:text-lg font-bold text-slate-800 flex flex-wrap items-center gap-2 break-words">
                              <span className="break-words">{service.name}</span>
                              {Number(service.is_active) === 0 && <span className="text-[10px] sm:text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded border shrink-0">Disabled</span>}
                            </h3>
                            <p className="text-muted-foreground mb-2 sm:mb-3 text-xs sm:text-sm line-clamp-2">{service.description || 'No description provided'}</p>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <span className="bg-primary/10 text-primary px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium border border-primary/20 break-words">
                                Rs. {service.price} per {service.unit}
                              </span>
                              <span className="bg-slate-100 text-slate-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm capitalize border break-words">
                                {service.category || service.category_name || 'Uncategorized'}
                              </span>

                              {hasCusts ? (
                                <span className="bg-amber-500/10 text-amber-600 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border border-amber-500/20 break-words">
                                  ⚙️ {custs.length > 0 ? custs.map(c => `${c.option_name}: Rs.${c.option_price}`).join(' + ') : `Cleaning: ${service.cleaning_price} + Grinding: ${service.grinding_price}`}
                                </span>
                              ) : service.is_custom_mix ? (
                                <span className="bg-purple-500/10 text-purple-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border border-purple-300 break-words">
                                  🌾 Custom Mix: {(service.mix_items || []).map(m => m.item_name).join(', ')}
                                </span>
                              ) : (
                                <span className="bg-gray-100 text-gray-500 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border">
                                  Standard Product
                                </span>
                              )}

                              {(service.category === 'service' || service.category_name === 'service') ? (
                                <span className="bg-green-500/10 text-green-600 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border border-green-500/20">Active Service</span>
                              ) : (service.track_inventory == 1 || service.track_inventory === true) ? (
                                <span className="bg-blue-500/10 text-blue-600 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border border-blue-500/20">✓ Tracked</span>
                              ) : (
                                <span className="bg-gray-100 text-gray-500 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border border-gray-200">Not Tracked</span>
                              )}

                              {(service.dual_unit === 1 || service.dual_unit === true) && (
                                <span className="bg-blue-600/10 text-blue-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border border-blue-300/30">
                                  🚚 Dual Mode
                                </span>
                              )}

                              {service.discount_type && service.discount_type !== 'none' && parseFloat(service.discount_value) > 0 && (
                                <span className="bg-emerald-600/10 text-emerald-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border border-emerald-300">
                                  {service.discount_type === 'percentage'
                                    ? `🏷️ ${parseFloat(service.discount_value)}% OFF`
                                    : `🏷️ Rs.${parseFloat(service.discount_value)} OFF`}
                                </span>
                              )}

                              {service.badge_text && service.badge_text.trim() && (
                                <span className="bg-rose-600/10 text-rose-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border border-rose-300 uppercase">
                                  {service.badge_text.trim()}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Actions — full-width 3-col grid on mobile, vertical stack on desktop */}
                          <div className="grid grid-cols-3 sm:flex sm:flex-col gap-2 pt-3 sm:pt-0 sm:self-start border-t sm:border-t-0 border-border shrink-0">
                            <Button onClick={() => handleToggleActive(service.id, service.is_active)} variant="outline" size="sm" disabled={isAdding || editingId !== null} className="w-full sm:w-auto">
                              {Number(service.is_active) === 1 ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                            </Button>
                            <Button onClick={() => handleEdit(service)} variant="outline" size="sm" disabled={isAdding || editingId !== null} className="w-full sm:w-auto">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button onClick={() => handleDelete(service.id)} variant="destructive" size="sm" disabled={isAdding || editingId !== null} className="w-full sm:w-auto sm:px-4">
                              <Trash2 className="h-4 w-4 text-white" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
