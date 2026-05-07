import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Loader2, UploadCloud, GripVertical } from 'lucide-react';
import { Button } from '../../components/common/button';
import { Input } from '../../components/common/input';
import { Label } from '../../components/common/label';
import { Textarea } from '../../components/common/textarea';
import { Card } from '../../components/common/card';
import { toast } from 'sonner';
import { Checkbox } from '../../components/common/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/common/select';
import { API_BASE_URL } from '../../config';

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
    track_inventory: true
  });

  // Auto-calculate total price from customizations
  useEffect(() => {
    if (formData.has_customizations && formData.customizations.length > 0) {
      const total = formData.customizations.reduce((sum, c) => sum + (parseFloat(c.option_price) || 0), 0);
      setFormData(prev => ({ ...prev, price: total.toString() }));
    }
  }, [formData.customizations, formData.has_customizations]);

  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

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
      const response = await fetch(`${API_BASE_URL}/upload_image.php`, {
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
      setImageFile(file);
      await uploadToCloudinary(file);
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
      customizations: formData.has_customizations
        ? formData.customizations.map((c, i) => ({
            option_name: c.option_name,
            option_price: parseFloat(c.option_price) || 0,
            sort_order: i + 1
          }))
        : []
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

    setEditingId(service.id);
    setFormData({
      name: service.name,
      price: service.price.toString(),
      unit: service.unit,
      description: service.description || '',
      imageUrl: service.image || '',
      category: service.category || service.category_name || (categories.length > 0 ? categories[0].name : ''),
      has_customizations: hasCust,
      customizations: fallbackCusts,
      track_inventory: service.track_inventory === 1 || service.track_inventory === true
    });
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

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this service?')) {
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
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', price: '', unit: 'kg', description: '', imageUrl: '',
      category: categories.length > 0 ? categories[0].name : '',
      has_customizations: false,
      customizations: [],
      track_inventory: true
    });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Services</h1>
          <p className="text-muted-foreground">Add, edit, or remove services from your catalog</p>
        </div>
        {!isAdding && !editingId && (
          <Button onClick={() => setIsAdding(true)} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Add New Service
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">{editingId ? 'Edit Service' : 'Add New Service'}</h2>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unit">Unit</Label>
                <select id="unit" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} disabled={isSaving}>
                  <option value="kg">kg</option>
                  <option value="bag">bag</option>
                  <option value="pack">pack</option>
                  <option value="piece">piece</option>
                  <option value="trip">trip</option>
                </select>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })} disabled={isSaving}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.length > 0 ? categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    )) : (
                      <SelectItem value="service">Convenience Services</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

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

              {formData.has_customizations && (
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-top-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-primary">Customization Options</p>
                    <Button type="button" size="sm" variant="outline" onClick={addCustomization} disabled={isSaving}>
                      <Plus className="h-3 w-3 mr-1" /> Add Option
                    </Button>
                  </div>

                  {formData.customizations.map((cust, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-white rounded-lg border border-border shadow-sm">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <Input
                          placeholder="Option name (e.g. Cleaning, Grinding, Roasting...)"
                          value={cust.option_name}
                          onChange={(e) => updateCustomization(idx, 'option_name', e.target.value)}
                          disabled={isSaving}
                          className="text-sm"
                        />
                      </div>
                      <div className="w-28">
                        <Input
                          type="number"
                          placeholder="Rs."
                          value={cust.option_price}
                          onChange={(e) => updateCustomization(idx, 'option_price', e.target.value)}
                          disabled={isSaving}
                          className="text-sm"
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomization(idx)} disabled={isSaving} className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <p className="text-xs text-muted-foreground">
                    Total Price (all options selected): Rs. {formData.customizations.reduce((sum, c) => sum + (parseFloat(c.option_price) || 0), 0)}
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
            </div>

            <div className="flex gap-2">
              <Button onClick={editingId ? handleUpdate : handleAdd} size="lg" disabled={isSaving || isUploading}>
                {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                {editingId ? 'Update Service' : 'Add Service'}
              </Button>
              <Button onClick={handleCancel} variant="outline" size="lg" disabled={isSaving || isUploading}>
                <X className="h-5 w-5 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Services List */}
      <div className="space-y-4">
        {services.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No services available. Add your first service!</p>
          </Card>
        ) : (
          services.map((service) => {
            const custs = service.customizations || [];
            const hasCusts = custs.length > 0 || service.is_grinding_service;
            return (
              <Card key={service.id} className="p-6">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {service.image && (
                    <div className="w-full sm:w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                      <img src={service.image} alt={service.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="mb-2 text-lg font-bold">{service.name}</h3>
                    <p className="text-muted-foreground mb-2 text-sm">{service.description || 'No description provided'}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                        Rs. {service.price} per {service.unit}
                      </span>
                      <span className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm capitalize">
                        {service.category || service.category_name || 'Uncategorized'}
                      </span>
                      
                      {hasCusts ? (
                        <span className="bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/20">
                          ⚙️ {custs.length > 0 ? custs.map(c => `${c.option_name}: Rs.${c.option_price}`).join(' + ') : `Cleaning: ${service.cleaning_price} + Grinding: ${service.grinding_price}`}
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-medium">
                          Standard Product
                        </span>
                      )}

                      {service.category !== 'service' && service.category_name !== 'service' ? (
                        <span className="bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full text-xs font-medium">✓ Inventory Tracked</span>
                      ) : (
                        <span className="bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-xs font-medium">Active Service</span>
                      )}
                    </div>
                  </div>
                  <div className="flex sm:flex-col gap-2 self-start mt-4 sm:mt-0">
                    <Button onClick={() => handleEdit(service)} variant="outline" size="sm" disabled={isAdding || editingId !== null}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleDelete(service.id)} variant="destructive" size="sm" disabled={isAdding || editingId !== null} className="px-4">
                      <Trash2 className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
