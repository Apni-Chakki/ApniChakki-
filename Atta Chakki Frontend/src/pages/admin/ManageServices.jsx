import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Save, X, Loader2, Truck, Weight } from 'lucide-react';
import { Button } from '../../components/common/button';
import { Card } from '../../components/common/card';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import { compressImage } from '../../utils/imageCompressor';
import { ServiceListItem } from '../../components/features/admin/services/ServiceListItem';
import { ServiceForm } from '../../components/features/admin/services/ServiceForm';

export function ManageServices() {
  const { t } = useTranslation();
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
    customization_pricing_mode: 'average',
    customizations: [],
    track_inventory: true,
    stock_quantity: '100',
    min_stock_level: '10',
    dual_unit: false,
    weight_options: [],
    is_custom_mix: false,
    mix_items: [],
    is_rental: false,
    rental_price_per_day: '',
    security_deposit: '',
    late_penalty_per_day: '',
    rental_available_qty: '',
    discount_type: 'none',
    discount_value: '',
    badge_text: '',
    priority: '0',
  });
  
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [weightInput, setWeightInput] = useState('');
  const formRef = useRef(null);

  // Auto-scroll to form when opening Add/Edit
  useEffect(() => {
    if (isAdding || editingId) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [isAdding, editingId]);

  // Recalculate price when customizations change
  useEffect(() => {
    if (formData.has_customizations && formData.customizations.length > 0) {
      if (formData.customization_pricing_mode === 'average') {
        const validOptions = formData.customizations.filter(c => parseFloat(c.option_price) > 0);
        if (validOptions.length > 0) {
          const sum = validOptions.reduce((acc, c) => acc + parseFloat(c.option_price || 0), 0);
          const avg = Math.round(sum / validOptions.length);
          setFormData(prev => ({ ...prev, price: avg.toString() }));
        } else {
          setFormData(prev => ({ ...prev, price: '0' }));
        }
      } else {
        const sum = formData.customizations.reduce((acc, c) => acc + (parseFloat(c.option_price) || 0), 0);
        setFormData(prev => ({ ...prev, price: sum.toString() }));
      }
    }
  }, [formData.customizations, formData.has_customizations, formData.customization_pricing_mode]);

  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/get_all_products.php?include_all=1&refresh=1`);
      const data = await res.json();
      const list = data.data || data.products || [];
      if ((data.status === 'success' || data.success) && Array.isArray(list)) {
        setServices(list);
      } else {
        toast.error(data.message || t('Failed to load services'));
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error(t('Network error while loading services'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/get_categories.php`);
      const data = await res.json();
      const list = data.data || data.categories || [];
      if ((data.status === 'success' || data.success) && Array.isArray(list)) {
        setCategories(list);
        if (list.length > 0 && !formData.category) {
          setFormData(prev => ({ ...prev, category: list[0].name }));
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('Please select an image file'));
      return;
    }

    try {
      setIsUploading(true);
      const compressedBase64 = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8,
        maxSizeMB: 0.5,
      });

      setFormData(prev => ({ ...prev, imageUrl: compressedBase64 }));
      toast.success(t('Image processed successfully'));
    } catch (error) {
      console.error('Image compression error:', error);
      toast.error(t('Failed to process image'));
    } finally {
      setIsUploading(false);
    }
  };

  const addCustomization = () => {
    setFormData(prev => ({
      ...prev,
      customizations: [
        ...prev.customizations,
        { option_name: '', option_price: '', sort_order: prev.customizations.length + 1 }
      ]
    }));
  };

  const removeCustomization = (index) => {
    setFormData(prev => ({
      ...prev,
      customizations: prev.customizations.filter((_, i) => i !== index)
    }));
  };

  const updateCustomization = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.customizations];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, customizations: updated };
    });
  };

  const addMixItem = () => {
    setFormData(prev => ({
      ...prev,
      mix_items: [
        ...prev.mix_items,
        { item_name: '', price_per_kg: '', default_ratio: '1', sort_order: prev.mix_items.length + 1 }
      ]
    }));
  };

  const removeMixItem = (index) => {
    setFormData(prev => ({
      ...prev,
      mix_items: prev.mix_items.filter((_, i) => i !== index)
    }));
  };

  const updateMixItem = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.mix_items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, mix_items: updated };
    });
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.price) {
      toast.error(t('Please fill all required fields'));
      return;
    }

    if (formData.is_rental) {
      if (!formData.rental_price_per_day || parseFloat(formData.rental_price_per_day) <= 0) {
        toast.error(t('Rental price per day is required for rental items'));
        return;
      }
      if (!formData.rental_available_qty || parseInt(formData.rental_available_qty) <= 0) {
        toast.error(t('Available quantity for rental is required'));
        return;
      }
    }

    try {
      setIsSaving(true);
      const selectedCat = categories.find(c => c.name === formData.category);
      const categoryId = selectedCat ? selectedCat.id : null;

      const payload = {
        name: formData.name,
        price: parseFloat(formData.price),
        unit: formData.unit,
        category_id: categoryId,
        description: formData.description,
        image_url: formData.imageUrl,
        is_grinding_service: formData.has_customizations ? 1 : 0,
        customization_pricing_mode: formData.customization_pricing_mode || 'average',
        track_inventory: formData.track_inventory ? 1 : 0,
        stock_quantity: formData.track_inventory ? (parseFloat(formData.stock_quantity) || 100) : 100,
        min_stock_level: formData.track_inventory ? (parseFloat(formData.min_stock_level) || 10) : 10,
        dual_unit: formData.dual_unit ? 1 : 0,
        weight_options: formData.weight_options && formData.weight_options.length > 0
          ? JSON.stringify(formData.weight_options)
          : null,
        is_custom_mix: formData.is_custom_mix ? 1 : 0,
        customizations: formData.has_customizations
          ? formData.customizations.filter(c => c.option_name.trim() !== '')
          : [],
        mix_items: formData.is_custom_mix
          ? formData.mix_items.filter(m => m.item_name.trim() !== '')
          : [],
        is_rental: formData.is_rental ? 1 : 0,
        rental_price_per_day: formData.is_rental ? (parseFloat(formData.rental_price_per_day) || 0) : 0,
        security_deposit: formData.is_rental ? (parseFloat(formData.security_deposit) || 0) : 0,
        late_penalty_per_day: formData.is_rental ? (parseFloat(formData.late_penalty_per_day) || 0) : 0,
        rental_available_qty: formData.is_rental ? (parseInt(formData.rental_available_qty) || 0) : 0,
        discount_type: formData.discount_type || 'none',
        discount_value: formData.discount_type !== 'none' ? (parseFloat(formData.discount_value) || 0) : 0,
        badge_text: formData.badge_text ? formData.badge_text.trim() : null,
        priority: parseInt(formData.priority) || 0,
      };

      const res = await fetch(`${API_BASE_URL}/add_product.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.status === 'success' || data.success) {
        toast.success(t('Service added successfully'));
        setIsAdding(false);
        resetForm();
        fetchServices();
      } else {
        toast.error(data.message || t('Failed to add service'));
      }
    } catch (error) {
      console.error('Error adding service:', error);
      toast.error(t('Network error while adding service'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (service) => {
    setEditingId(service.id);
    setIsAdding(false);
    
    let parsedWeights = [];
    if (service.weight_options) {
      try {
        parsedWeights = typeof service.weight_options === 'string'
          ? JSON.parse(service.weight_options)
          : service.weight_options;
      } catch (e) {
        parsedWeights = [];
      }
    }

    setFormData({
      name: service.name,
      price: service.price.toString(),
      unit: service.unit,
      description: service.description || '',
      imageUrl: service.image_url || '',
      category: service.category_name || (categories[0]?.name || ''),
      has_customizations: Boolean(service.is_grinding_service),
      customization_pricing_mode: service.customization_pricing_mode || 'average',
      customizations: service.customizations ? service.customizations.map(c => ({
        option_name: c.option_name,
        option_price: c.option_price.toString(),
        sort_order: c.sort_order
      })) : [],
      track_inventory: service.track_inventory !== undefined ? Boolean(service.track_inventory) : true,
      stock_quantity: service.stock_quantity ? service.stock_quantity.toString() : '100',
      min_stock_level: service.min_stock_level ? service.min_stock_level.toString() : '10',
      dual_unit: Boolean(service.dual_unit),
      weight_options: Array.isArray(parsedWeights) ? parsedWeights : [],
      is_custom_mix: Boolean(service.is_custom_mix),
      mix_items: service.mix_items ? service.mix_items.map(m => ({
        item_name: m.item_name,
        price_per_kg: m.price_per_kg.toString(),
        default_ratio: (m.default_ratio || 1).toString(),
        sort_order: m.sort_order
      })) : [],
      is_rental: Boolean(service.is_rental),
      rental_price_per_day: service.rental_price_per_day ? service.rental_price_per_day.toString() : '',
      security_deposit: service.security_deposit ? service.security_deposit.toString() : '',
      late_penalty_per_day: service.late_penalty_per_day ? service.late_penalty_per_day.toString() : '',
      rental_available_qty: service.rental_available_qty !== undefined ? service.rental_available_qty.toString() : '',
      discount_type: service.discount_type || 'none',
      discount_value: service.discount_value ? service.discount_value.toString() : '',
      badge_text: service.badge_text || '',
      priority: (service.priority !== undefined && service.priority !== null) ? service.priority.toString() : '0',
    });
  };

  const handleUpdate = async () => {
    if (!formData.name || !formData.price) {
      toast.error(t('Please fill all required fields'));
      return;
    }

    if (formData.is_rental) {
      if (!formData.rental_price_per_day || parseFloat(formData.rental_price_per_day) <= 0) {
        toast.error(t('Rental price per day is required for rental items'));
        return;
      }
      if (!formData.rental_available_qty || parseInt(formData.rental_available_qty) <= 0) {
        toast.error(t('Available quantity for rental is required'));
        return;
      }
    }

    try {
      setIsSaving(true);
      const selectedCat = categories.find(c => c.name === formData.category);
      const categoryId = selectedCat ? selectedCat.id : null;

      const payload = {
        id: editingId,
        name: formData.name,
        price: parseFloat(formData.price),
        unit: formData.unit,
        category_id: categoryId,
        description: formData.description,
        image_url: formData.imageUrl,
        is_grinding_service: formData.has_customizations ? 1 : 0,
        customization_pricing_mode: formData.customization_pricing_mode || 'average',
        track_inventory: formData.track_inventory ? 1 : 0,
        stock_quantity: formData.track_inventory ? (parseFloat(formData.stock_quantity) || 100) : 100,
        min_stock_level: formData.track_inventory ? (parseFloat(formData.min_stock_level) || 10) : 10,
        dual_unit: formData.dual_unit ? 1 : 0,
        weight_options: formData.weight_options && formData.weight_options.length > 0
          ? JSON.stringify(formData.weight_options)
          : null,
        is_custom_mix: formData.is_custom_mix ? 1 : 0,
        customizations: formData.has_customizations
          ? formData.customizations.filter(c => c.option_name.trim() !== '')
          : [],
        mix_items: formData.is_custom_mix
          ? formData.mix_items.filter(m => m.item_name.trim() !== '')
          : [],
        is_rental: formData.is_rental ? 1 : 0,
        rental_price_per_day: formData.is_rental ? (parseFloat(formData.rental_price_per_day) || 0) : 0,
        security_deposit: formData.is_rental ? (parseFloat(formData.security_deposit) || 0) : 0,
        late_penalty_per_day: formData.is_rental ? (parseFloat(formData.late_penalty_per_day) || 0) : 0,
        rental_available_qty: formData.is_rental ? (parseInt(formData.rental_available_qty) || 0) : 0,
        discount_type: formData.discount_type || 'none',
        discount_value: formData.discount_type !== 'none' ? (parseFloat(formData.discount_value) || 0) : 0,
        badge_text: formData.badge_text ? formData.badge_text.trim() : null,
        priority: parseInt(formData.priority) || 0,
      };

      const res = await fetch(`${API_BASE_URL}/update_product.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.status === 'success' || data.success) {
        toast.success(t('Service updated successfully'));
        setEditingId(null);
        resetForm();
        fetchServices();
      } else {
        toast.error(data.message || t('Failed to update service'));
      }
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error(t('Network error while updating service'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('Are you sure you want to delete this service?'))) return;

    try {
      setDeletingId(id);
      const res = await fetch(`${API_BASE_URL}/delete_product.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      const data = await res.json();
      if (data.status === 'success' || data.success) {
        toast.success(t('Service deleted successfully'));
        fetchServices();
      } else {
        toast.error(data.message || t('Failed to delete service'));
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error(t('Network error while deleting service'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 1 || currentStatus === '1' ? 0 : 1;
    const previousServices = [...services];

    setServices(prevServices =>
      prevServices.map(s => s.id === id ? { ...s, status: newStatus } : s)
    );

    try {
      const res = await fetch(`${API_BASE_URL}/update_product.php_status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, is_active: newStatus })
      });

      const data = await res.json();
      if (data.status === 'success' || data.success) {
        toast.success(newStatus === 1 ? t('Service is now visible to customers') : t('Service is now hidden from customers'));
        fetchServices();
      } else {
        setServices(previousServices);
        toast.error(data.message || t('Failed to update service status'));
      }
    } catch (error) {
      console.error('Error updating service status:', error);
      setServices(previousServices);
      toast.error(t('Network error while updating service status'));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      unit: 'kg',
      description: '',
      imageUrl: '',
      category: categories[0]?.name || '',
      has_customizations: false,
      customization_pricing_mode: 'average',
      customizations: [],
      track_inventory: true,
      stock_quantity: '100',
      min_stock_level: '10',
      dual_unit: false,
      weight_options: [],
      is_custom_mix: false,
      mix_items: [],
      is_rental: false,
      rental_price_per_day: '',
      security_deposit: '',
      late_penalty_per_day: '',
      rental_available_qty: '',
      discount_type: 'none',
      discount_value: '',
      badge_text: '',
      priority: '0',
    });
    setWeightInput('');
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
  };

  const computeDiscountedPrice = (origPrice, type, val) => {
    const p = parseFloat(origPrice) || 0;
    const v = parseFloat(val) || 0;
    if (type === 'percentage') {
      return Math.max(0, p - (p * (v / 100)));
    } else if (type === 'fixed') {
      return Math.max(0, p - v);
    }
    return p;
  };

  // Group services by category
  const groupedServices = services
    .slice()
    .sort((a, b) => (parseInt(b.priority || 0) - parseInt(a.priority || 0)))
    .reduce((acc, service) => {
      const catName = service.category_name || 'Other Services';
      if (!acc[catName]) acc[catName] = [];
      acc[catName].push(service);
      return acc;
    }, {});

  if (loading && services.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">{t("Manage Services")}</h1>
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
        <ServiceForm
          editingId={editingId}
          formData={formData}
          setFormData={setFormData}
          categories={categories}
          weightInput={weightInput}
          setWeightInput={setWeightInput}
          isSaving={isSaving}
          isUploading={isUploading}
          formRef={formRef}
          handleImageChange={handleImageChange}
          handleAdd={handleAdd}
          handleUpdate={handleUpdate}
          handleCancel={handleCancel}
          addCustomization={addCustomization}
          removeCustomization={removeCustomization}
          updateCustomization={updateCustomization}
          addMixItem={addMixItem}
          removeMixItem={removeMixItem}
          updateMixItem={updateMixItem}
          computeDiscountedPrice={computeDiscountedPrice}
        />
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
                <div className="flex items-center justify-between gap-2 px-1 mb-3">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fbf6ee] text-[#8c6d3d] border border-[#ecd9be] font-bold text-xs uppercase tracking-wider shadow-xs">
                    <span className="text-sm">🌾</span>
                    <span>{categoryName}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {categoryItems.length} {categoryItems.length === 1 ? 'Item' : 'Item(s)'}
                  </span>
                </div>
                <div className="space-y-4">
                  {categoryItems.map((service) => (
                    <ServiceListItem
                      key={service.id}
                      service={service}
                      isAdding={isAdding}
                      editingId={editingId}
                      onToggleActive={handleToggleStatus}
                      onToggleStatus={handleToggleStatus}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      deletingId={deletingId}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}