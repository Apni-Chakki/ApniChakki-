/**
 * Example Usage: Category Management with Image Upload
 */

import { useState } from 'react';
import ImageUploadInput from './ImageUploadInput';
import { API_URL } from '../config';

export const AddCategoryForm = () => {
  const [data, setData] = useState({
    name: '',
    image_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleImageUpload = (imageData) => {
    if (imageData) {
      setData(prev => ({
        ...prev,
        image_url: imageData.url
      }));
      setMessage({ type: 'success', text: 'Image uploaded successfully!' });
    } else {
      setData(prev => ({
        ...prev,
        image_url: ''
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_URL}/products/add_category.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Category added successfully!' });
        setData({ name: '', image_url: '' });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add category' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-category-form">
      <h2>Add New Category</h2>

      <div className="form-group">
        <label htmlFor="name">Category Name *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={data.name}
          onChange={handleInputChange}
          placeholder="e.g., Wheat, Rice, Spices"
          required
        />
      </div>

      <ImageUploadInput
        onImageUpload={handleImageUpload}
        folder="categories"
        label="Category Image"
        hint="Upload a category image (JPG, PNG, WebP, GIF - max 10MB)"
        previewUrl={data.image_url}
        required
      />

      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <button type="submit" disabled={loading || !data.name || !data.image_url}>
        {loading ? 'Adding Category...' : 'Add Category'}
      </button>
    </form>
  );
};

export default AddCategoryForm;
