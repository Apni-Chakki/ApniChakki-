import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Save, X, Loader2, UploadCloud, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/common/button';
import { Input } from '../../components/common/input';
import { Label } from '../../components/common/label';
import { Card } from '../../components/common/card';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import { compressImage } from '../../utils/imageCompressor';
import { useTranslation } from 'react-i18next';

export function ManageCategories() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    imageUrl: '',
    priority: 0
  });

  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  const fileInputRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (isAdding || editingId) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [isAdding, editingId]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/get_categories.php?admin=1`);
      const data = await response.json();

      if (data.success) {
        setCategories(data.categories);
      } else {
        toast.error(data.message || 'Failed to load categories');
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
    setUploadFailed(false);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', 'categories');

    try {
      const response = await fetch(`${API_BASE_URL}/products/upload_image.php`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      if (data.success) {
        setFormData(prev => ({ ...prev, imageUrl: data.url }));
        setUploadFailed(false);
        toast.success('Image uploaded successfully!');
        return data.url;
      } else {
        setUploadFailed(true);
        toast.error(data.message || 'Image upload failed');
        return null;
      }
    } catch (error) {
      console.error("Upload Error:", error);
      setUploadFailed(true);
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
      // Reset input value taa ke same file dobara select ho sake
      e.target.value = '';
      await uploadToCloudinary(compressedFile);
    }
  };

  const retryUpload = async () => {
    if (imageFile) {
      await uploadToCloudinary(imageFile);
    }
  };

  const saveCategory = async () => {
    if (!formData.name) {
      toast.error('Category name is required');
      return;
    }

    setIsSaving(true);
    
    const endpoint = editingId ? 'update_category.php' : 'add_category.php';
    const payload = {
      name: formData.name,
      image_url: formData.imageUrl,
      priority: parseInt(formData.priority) || 0
    };
    if (editingId) {
      payload.id = editingId;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(editingId ? 'Category updated successfully!' : 'Category added successfully!');
        resetForm();
        setIsAdding(false);
        fetchCategories();
        // Emit event to notify Homepage to refresh categories
        window.dispatchEvent(new Event('categoriesUpdated'));
      } else {
        toast.error(result.message || 'Failed to save category');
      }
    } catch (error) {
      toast.error('Network error while saving');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setFormData({
      name: cat.name,
      imageUrl: cat.image_url || '',
      priority: cat.priority || 0
    });
    setImageFile(null);
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/update_category_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id, is_active: Number(currentStatus) === 1 ? 0 : 1 })
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        fetchCategories();
        window.dispatchEvent(new Event('categoriesUpdated'));
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Network error while toggling status');
    }
  };

  const handleDelete = async (id) => {
    const deleteCategory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/delete_category.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id })
        });
        
        const result = await response.json();
        
        if (result.success) {
          toast.success('Category deleted successfully!');
          fetchCategories();
          // Emit event to notify Homepage to refresh categories
          window.dispatchEvent(new Event('categoriesUpdated'));
        } else {
          toast.error(result.message || 'Failed to delete category');
        }
      } catch (error) {
        toast.error('Network error while deleting');
      }
    };

    toast.custom((toastId) => (
      <div className="bg-primary border border-primary-foreground/20 rounded-lg p-4 shadow-xl flex flex-col gap-3 max-w-sm">
        <p className="text-primary-foreground font-medium">{t('Delete this category?')}</p>
        <div className="flex gap-2 justify-end">
          <Button
            onClick={() => toast.dismiss(toastId)}
            variant="outline"
            size="sm"
            className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 border-transparent"
          >
            {t('Cancel')}
          </Button>
          <Button
            onClick={() => {
              toast.dismiss(toastId);
              deleteCategory();
            }}
            size="sm"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent"
          >
            {t('Delete')}
          </Button>
        </div>
      </div>
    ));
  };

  const resetForm = () => {
    setFormData({ name: '', imageUrl: '', priority: 0 });
    setImageFile(null);
    setEditingId(null);
    setUploadFailed(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancel = () => {
    setIsAdding(false);
    resetForm();
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{t('Loading Categories...')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">{t('Manage Categories')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t('Add, edit, or remove categories')}</p>
        </div>
        {!isAdding && !editingId && (
          <Button onClick={() => setIsAdding(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2 shrink-0" />
            {t('Add New Category')}
          </Button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div ref={formRef}>
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">{editingId ? t('Edit Category') : t('Add New Category')}</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t('Category Name *')}</Label>
                <Input
                  id="name"
                  placeholder="e.g., Wheat & Flour"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isSaving}
                />
              </div>

              <div>
                <Label htmlFor="priority">{t('Priority (Lower numbers show first)')}</Label>
                <Input
                  id="priority"
                  type="number"
                  placeholder="e.g., 1"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  disabled={isSaving}
                />
              </div>
              
              <div>
                <Label>{t('Category Image')}</Label>
                <div className="flex flex-col sm:flex-row gap-4 items-start mt-2">
                  <div className={`relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center w-full max-w-sm hover:bg-muted/50 transition-colors ${uploadFailed ? 'border-red-400' : ''}`}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isUploading || isSaving}
                    />
                    {isUploading ? (
                       <div className="flex flex-col items-center">
                          <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                          <p className="text-sm">{t('Uploading...')}</p>
                       </div>
                    ) : uploadFailed ? (
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-sm text-red-500 font-medium">⚠ {t('Upload failed')}</p>
                        <p className="text-xs text-muted-foreground">{imageFile?.name}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); retryUpload(); }}
                          className="relative z-10 mt-1"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" /> {t('Retry Upload')}
                        </Button>
                        <p className="text-xs text-muted-foreground">{t('or click to choose another file')}</p>
                      </div>
                    ) : formData.imageUrl ? (
                       <img src={formData.imageUrl} alt="Category image" className="h-32 object-contain" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
                        <p className="font-medium text-sm">{t('Click to upload or drag & drop')}</p>
                        <p className="text-xs text-muted-foreground">{t('PNG, JPG, WebP up to 10MB')}</p>
                      </div>
                    )}
                  </div>
                  {formData.imageUrl && (
                    <div className="flex-1">
                      <p className="text-sm font-medium text-success mb-2">✓ {t('Image uploaded successfully')}</p>
                      <Input value={formData.imageUrl} readOnly className="text-xs" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  disabled={isSaving || isUploading}
                  className="w-full sm:w-auto"
                >
                  <X className="h-4 w-4 mr-2 shrink-0" /> {t('Cancel')}
                </Button>
                <Button
                  onClick={saveCategory}
                  variant="outline"
                  disabled={isSaving || isUploading}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground border-primary hover:border-primary"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" /> : <Save className="h-4 w-4 mr-2 shrink-0" />}
                  {editingId ? t('Update Category') : t('Save Category')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        {categories.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">{t('No categories yet')}</p>
          </Card>
        ) : (
          categories.map((cat) => (
            <Card key={cat.id} className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                {/* Image + text */}
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="w-14 h-14 sm:w-24 sm:h-24 rounded bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-muted-foreground text-[10px] sm:text-xs text-center px-1">{t('No image')}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="mb-1 text-base sm:text-lg font-bold flex flex-wrap items-center gap-2 break-words">
                      <span className="break-words">{cat.name}</span>
                      {Number(cat.is_active) === 0 && <span className="text-[10px] sm:text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded border shrink-0">Disabled</span>}
                    </h3>
                    <div className="flex gap-3 sm:gap-4 flex-wrap">
                      <p className="text-[11px] sm:text-xs text-muted-foreground">ID: {cat.id}</p>
                      <p className="text-[11px] sm:text-xs font-semibold text-primary">{t('Priority')}: {cat.priority || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Actions — full-width grid on mobile, stacked column on desktop */}
                <div className="grid grid-cols-3 sm:flex sm:flex-col gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-border shrink-0">
                  <Button onClick={() => handleToggleActive(cat.id, cat.is_active)} variant="outline" size="sm" disabled={isAdding || editingId !== null} className="w-full sm:w-auto">
                    {Number(cat.is_active) === 1 ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button onClick={() => handleEdit(cat)} variant="outline" size="sm" disabled={isAdding || editingId !== null} className="w-full sm:w-auto">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => handleDelete(cat.id)} variant="destructive" size="sm" disabled={isAdding || editingId !== null} className="w-full sm:w-auto sm:px-4">
                    <Trash2 className="h-4 w-4 text-white" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}





