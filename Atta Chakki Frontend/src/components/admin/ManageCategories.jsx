import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Loader2, UploadCloud } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';

export function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    imageUrl: ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/get_categories.php`);
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
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', 'categories');

    try {
      const response = await fetch(`${API_BASE_URL}/upload_image.php`, {
        method: 'POST',
        body: formData,
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

  const saveCategory = async () => {
    if (!formData.name) {
      toast.error('Category name is required');
      return;
    }

    setIsSaving(true);
    
    const endpoint = editingId ? 'update_category.php' : 'add_category.php';
    const payload = {
      name: formData.name,
      image_url: formData.imageUrl
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
      imageUrl: cat.image_url || ''
    });
    setImageFile(null);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this category?')) {
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
    }
  };

  const resetForm = () => {
    setFormData({ name: '', imageUrl: '' });
    setImageFile(null);
    setEditingId(null);
  };

  const handleCancel = () => {
    setIsAdding(false);
    resetForm();
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading Categories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Categories</h1>
          <p className="text-muted-foreground">Add, edit, or remove categories</p>
        </div>
        {!isAdding && !editingId && (
          <Button onClick={() => setIsAdding(true)} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Add New Category
          </Button>
        )}
      </div>

      {(isAdding || editingId) && (
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">{editingId ? 'Edit Category' : 'Add New Category'}</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Wheat & Flour"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSaving}
              />
            </div>
            
            <div>
              <Label>Category Image</Label>
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
                     <img src={formData.imageUrl} alt="Category image" className="h-32 object-contain" />
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
                    <Input value={formData.imageUrl} readOnly className="text-xs" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={saveCategory} size="lg" disabled={isSaving || isUploading}>
                {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                {editingId ? 'Update Category' : 'Save Category'}
              </Button>
              <Button onClick={handleCancel} variant="outline" size="lg" disabled={isSaving || isUploading}>
                <X className="h-5 w-5 mr-2" /> Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {categories.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No categories available. Add your first category!</p>
          </Card>
        ) : (
          categories.map((cat) => (
            <Card key={cat.id} className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {cat.image_url ? (
                    <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-muted-foreground text-xs">No image</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="mb-1 text-lg font-bold">{cat.name}</h3>
                  <p className="text-xs text-muted-foreground">ID: {cat.id}</p>
                </div>
                <div className="flex sm:flex-col gap-2">
                  <Button onClick={() => handleEdit(cat)} variant="outline" size="sm" disabled={isAdding || editingId !== null}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => handleDelete(cat.id)} variant="outline" size="sm" disabled={isAdding || editingId !== null}>
                    <Trash2 className="h-4 w-4 text-destructive" />
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
