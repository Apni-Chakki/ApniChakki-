/**
 * Updated ManageCategories Component
 * Using the new ImageUploadInput component with Cloudinary integration
 * 
 * Features:
 * - Upload category images to Cloudinary
 * - Add, edit, and delete categories
 * - Optimized image loading with transformations
 */

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { toast } from 'sonner';
import ImageUploadInput from '../ImageUploadInput';
import { transformImage, IMAGE_TRANSFORMS } from '../../config/cloudinary';
import { API_BASE_URL } from '../../config';

export function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    image_url: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/products/get_categories.php`);
      const data = await response.json();

      if (data.success) {
        setCategories(data.categories);
      } else {
        toast.error(data.message || 'Failed to load categories');
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({ name: '', image_url: '' });
  };

  const handleStartEdit = (category) => {
    setIsAdding(false);
    setEditingId(category.id);
    setFormData({
      name: category.name,
      image_url: category.image_url || ''
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', image_url: '' });
  };

  const handleImageUpload = (imageData) => {
    if (imageData) {
      setFormData(prev => ({
        ...prev,
        image_url: imageData.url
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        image_url: ''
      }));
    }
  };

  const handleNameChange = (e) => {
    setFormData(prev => ({
      ...prev,
      name: e.target.value
    }));
  };

  const saveCategory = async () => {
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    if (!formData.image_url) {
      toast.error('Please upload an image');
      return;
    }

    setIsSaving(true);

    try {
      const endpoint = editingId 
        ? `${API_BASE_URL}/products/update_category.php`
        : `${API_BASE_URL}/products/add_category.php`;

      const payload = {
        name: formData.name,
        image_url: formData.image_url
      };

      if (editingId) {
        payload.id = editingId;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          editingId ? 'Category updated successfully!' : 'Category added successfully!'
        );
        await fetchCategories();
        handleCancel();
      } else {
        toast.error(data.message || 'Failed to save category');
      }
    } catch (error) {
      console.error("Save Error:", error);
      toast.error('Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/products/delete_category.php`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Category deleted successfully!');
        await fetchCategories();
      } else {
        toast.error(data.message || 'Failed to delete category');
      }
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error('Failed to delete category');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Categories</h1>
        {!isAdding && !editingId && (
          <Button onClick={handleStartAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">
            {editingId ? 'Edit Category' : 'Add New Category'}
          </h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g., Wheat, Rice, Spices"
                value={formData.name}
                onChange={handleNameChange}
              />
            </div>

            <ImageUploadInput
              onImageUpload={handleImageUpload}
              folder="categories"
              label="Category Image"
              previewUrl={formData.image_url}
              required
            />

            <div className="flex gap-2">
              <Button
                onClick={saveCategory}
                disabled={isSaving || !formData.name || !formData.image_url}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingId ? 'Update' : 'Add'} Category
                  </>
                )}
              </Button>

              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(category => (
          <Card key={category.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-square overflow-hidden bg-gray-200">
              {category.image_url ? (
                <img
                  src={transformImage(category.image_url, IMAGE_TRANSFORMS.medium)}
                  alt={category.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-300">
                  <span className="text-gray-500">No Image</span>
                </div>
              )}
            </div>

            <div className="p-4">
              <h3 className="font-bold text-lg mb-3">{category.name}</h3>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStartEdit(category)}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteCategory(category.id)}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {categories.length === 0 && !isAdding && (
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">No categories yet</p>
          <Button onClick={handleStartAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Create First Category
          </Button>
        </Card>
      )}
    </div>
  );
}

export default ManageCategories;
