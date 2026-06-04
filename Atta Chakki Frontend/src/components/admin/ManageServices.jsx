import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Loader2, UploadCloud } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card } from '../ui/card';
import { toast } from 'sonner';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { API_BASE_URL } from '../../config'; // <-- NEW: API Config
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
    is_grinding_service: false,
    cleaning_price: '',
    grinding_price: '',
    priority: '0'
  });

  useEffect(() => {
    if (formData.is_grinding_service) {
      const cleaning = parseFloat(formData.cleaning_price) || 0;
      const grinding = parseFloat(formData.grinding_price) || 0;
      setFormData(prev => ({ ...prev, price: (cleaning + grinding).toString() }));
    }
  }, [formData.cleaning_price, formData.grinding_price, formData.is_grinding_service]);

  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  // --- NEW: FETCH FROM API ---
  const fetchServices = async () => {
    try {
      setLoading(true);
      const [servicesRes, categoriesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/Manage_Services/get_all_products.php`),
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

  // Automatically check/uncheck the Inventory Tracking box based on Category
  const isTracked = formData.category !== 'service';

  // --- NEW: ADD VIA API ---
  const handleAdd = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/Manage_Services/add_product.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          price: parseFloat(formData.price),
          unit: formData.unit,
          description: formData.description,
          image: formData.imageUrl, // DB uses 'image', React uses 'imageUrl'
          category: formData.category,
          is_grinding_service: formData.is_grinding_service ? 1 : 0,
          cleaning_price: parseFloat(formData.cleaning_price) || 0,
          grinding_price: parseFloat(formData.grinding_price) || 0,
          priority: parseInt(formData.priority) || 0
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Service added successfully!');
        resetForm();
        setIsAdding(false);
        fetchServices(); // Reload list
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
    setEditingId(service.id);
    setFormData({
      name: service.name,
      price: service.price.toString(),
      unit: service.unit,
      description: service.description || '',
      imageUrl: service.image || '', 
      category: service.category || (categories.length > 0 ? categories[0].name : ''),
      is_grinding_service: service.is_grinding_service === 1 || service.is_grinding_service === true,
      cleaning_price: service.cleaning_price?.toString() || '',
      grinding_price: service.grinding_price?.toString() || '',
      priority: (service.priority ?? 0).toString()
    });
    setImageFile(null);
  };

  // --- NEW: UPDATE VIA API ---
 const handleUpdate = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/Manage_Services/update_product.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          name: formData.name,
          price: parseFloat(formData.price),
          unit: formData.unit,
          description: formData.description,
          image: formData.imageUrl,
          category: formData.category,
          is_grinding_service: formData.is_grinding_service ? 1 : 0,
          cleaning_price: parseFloat(formData.cleaning_price) || 0,
          grinding_price: parseFloat(formData.grinding_price) || 0,
          priority: parseInt(formData.priority) || 0
        })
      });
      
      // SPY CODE: Read the raw text before trying to parse JSON
      const rawText = await response.text();
      console.log("Raw API Response:", rawText);

      const result = JSON.parse(rawText);
      
      if (result.success) {
        toast.success('Service updated successfully!');
        setEditingId(null);
        resetForm();
        fetchServices(); 
      } else {
        // Now it will show the EXACT database error in the toast!
        toast.error(result.message || 'Failed to update service');
      }
    } catch (error) {
      console.error("Network Error Details:", error);
      toast.error('Network error while updating - Check Console F12');
    } finally {
      setIsSaving(false);
    }
  };

  // --- NEW: DELETE VIA API ---
  const handleDelete = async (id) => {
    const deleteService = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/Manage_Services/delete_product.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id })
        });
        
        const result = await response.json();
        
        if (result.success) {
          toast.success('Service deleted successfully!');
          fetchServices(); // Reload list
        } else {
          toast.error(result.message || 'Failed to delete service. It might be linked to past orders.');
        }
      } catch (error) {
        toast.error('Network error while deleting');
      }
    };

    toast.custom((t) => (
      <div className="bg-primary border border-primary-foreground/20 rounded-lg p-4 shadow-xl flex flex-col gap-3 max-w-sm">
        <p className="text-primary-foreground font-medium">Are you sure you want to delete this service?</p>
        <div className="flex gap-2 justify-end">
          <Button 
            onClick={() => toast.dismiss(t)} 
            variant="outline" 
            size="sm"
            className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 border-transparent"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              toast.dismiss(t);
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
      name: '', 
      price: '', 
      unit: 'kg', 
      description: '', 
      imageUrl: '', 
      category: categories.length > 0 ? categories[0].name : '',
      is_grinding_service: false,
      cleaning_price: '',
      grinding_price: '',
      priority: '0'
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
                  disabled={isSaving}
                />
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
                  className="text-sm"
                />
              </div>
            </div>

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
                    <p className="text-sm font-medium text-success mb-2">✓ Image uploaded successfully</p>
                    <Input value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} className="text-xs" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_grinding_service"
                  checked={formData.is_grinding_service}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_grinding_service: checked })}
                  disabled={isSaving}
                />
                <Label htmlFor="is_grinding_service" className="font-semibold text-primary">This is a Grinding Service (with Cleaning & Grinding options)</Label>
              </div>

              {formData.is_grinding_service && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <Label htmlFor="cleaning_price">Cleaning Price (Rs) *</Label>
                    <Input
                      id="cleaning_price"
                      type="number"
                      placeholder="e.g., 2"
                      value={formData.cleaning_price}
                      onChange={(e) => setFormData({ ...formData, cleaning_price: e.target.value })}
                      disabled={isSaving}
                    />
                  </div>
                  <div>
                    <Label htmlFor="grinding_price">Grinding Price (Rs) *</Label>
                    <Input
                      id="grinding_price"
                      type="number"
                      placeholder="e.g., 8"
                      value={formData.grinding_price}
                      onChange={(e) => setFormData({ ...formData, grinding_price: e.target.value })}
                      disabled={isSaving}
                    />
                  </div>
                  <p className="col-span-full text-xs text-muted-foreground">
                    Total Price will be automatically set to: Rs. {(parseFloat(formData.cleaning_price) || 0) + (parseFloat(formData.grinding_price) || 0)}
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="trackInventory"
                  checked={isTracked}
                  disabled={true} // Controlled automatically by the category dropdown now!
                />
                <Label htmlFor="trackInventory" className="text-muted-foreground">
                  Track stock for this service in Inventory Management <span className="text-xs ml-1">(Determined by category)</span>
                </Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={editingId ? handleUpdate : handleAdd}
                size="lg"
                disabled={isSaving || isUploading}
              >
                {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                {editingId ? 'Update Service' : 'Add Service'}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                size="lg"
                disabled={isSaving || isUploading}
              >
                <X className="h-5 w-5 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </Card>
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
              <div key={categoryName} className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                  <div className="flex items-center gap-2 bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20 px-4 py-2 rounded-full text-sm font-bold shadow-sm uppercase tracking-wider">
                    {categoryName.toLowerCase() === 'service' || categoryName.toLowerCase() === 'services' ? '💼' : '🌾'} {categoryName}
                  </div>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-slate-200 to-transparent" />
                  <span className="text-xs text-slate-500 font-semibold">
                    {categoryItems.length} Item(s)
                  </span>
                </div>

                <div className="space-y-4">
                  {categoryItems.map((service) => {
                    const custs = service.customizations || [];
                    const hasCusts = custs.length > 0 || service.is_grinding_service === 1 || service.is_grinding_service === true;
                    return (
                      <Card key={service.id} className="p-6 transition-all duration-300 hover:shadow-lg border border-border/50 hover:border-primary/20 bg-white relative overflow-hidden group">
                        {/* Priority Badge */}
                        <div className="absolute top-0 right-0 bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-bl border-l border-b border-primary/10 transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                          ⭐ Priority: {service.priority ?? 0}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                          {service.image && (
                            <div className="w-full sm:w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-muted border border-border shadow-inner">
                              <img src={service.image} alt={service.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 pr-4">
                            <h3 className="mb-2 text-lg font-bold text-slate-800">{service.name}</h3>
                            <p className="text-muted-foreground mb-3 text-sm line-clamp-2">{service.description || 'No description provided'}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium border border-primary/20">
                                Rs. {service.price} per {service.unit}
                              </span>
                              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm capitalize border">
                                {service.category || service.category_name || 'Uncategorized'}
                              </span>
                              
                              {hasCusts ? (
                                <span className="bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/20">
                                  ⚙️ {custs.length > 0 ? custs.map(c => `${c.option_name}: Rs.${c.option_price}`).join(' + ') : `Cleaning: ${service.cleaning_price} + Grinding: ${service.grinding_price}`}
                                </span>
                              ) : service.is_custom_mix ? (
                                <span className="bg-purple-500/10 text-purple-700 px-3 py-1 rounded-full text-xs font-bold border border-purple-300">
                                  🌾 Custom Mix: {(service.mix_items || []).map(m => m.item_name).join(', ')}
                                </span>
                              ) : (
                                <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-medium border">
                                  Standard Product
                                </span>
                              )}

                              {service.category !== 'service' && service.category_name !== 'service' ? (
                                <span className="bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full text-xs font-medium border border-blue-500/20">✓ Inventory Tracked</span>
                              ) : (
                                <span className="bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-xs font-medium border border-green-500/20">Active Service</span>
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