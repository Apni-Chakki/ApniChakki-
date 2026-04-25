/**
 * Example Usage: Product Management with Image Upload
 */

import { useState } from 'react';
import ImageUploadInput from '../ImageUploadInput';
import { API_URL } from '../../config';

export const AddProductForm = () => {
  const [data, setData] = useState({
    name: '',
    description: '',
    price: '',
    unit: 'kg',
    category_id: '',
    image_url: '',
    stock_quantity: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [categories, setCategories] = useState([]);

  // Fetch categories on component mount
  React.useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/products/get_categories.php`);
      const result = await response.json();
      if (result.success && Array.isArray(result.categories)) {
        setCategories(result.categories);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

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
      const response = await fetch(`${API_URL}/products/add_product.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Product added successfully!' });
        setData({
          name: '',
          description: '',
          price: '',
          unit: 'kg',
          category_id: '',
          image_url: '',
          stock_quantity: ''
        });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add product' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-product-form">
      <h2>Add New Product</h2>

      <div className="form-group">
        <label htmlFor="name">Product Name *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={data.name}
          onChange={handleInputChange}
          placeholder="e.g., Premium Wheat Atta"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={data.description}
          onChange={handleInputChange}
          placeholder="Product description"
          rows="3"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="category_id">Category *</label>
          <select
            id="category_id"
            name="category_id"
            value={data.category_id}
            onChange={handleInputChange}
            required
          >
            <option value="">Select a category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="price">Price (₹) *</label>
          <input
            type="number"
            id="price"
            name="price"
            value={data.price}
            onChange={handleInputChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="unit">Unit *</label>
          <select
            id="unit"
            name="unit"
            value={data.unit}
            onChange={handleInputChange}
            required
          >
            <option value="kg">Kilogram (kg)</option>
            <option value="g">Gram (g)</option>
            <option value="l">Liter (l)</option>
            <option value="ml">Milliliter (ml)</option>
            <option value="piece">Piece</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="stock_quantity">Stock Quantity *</label>
          <input
            type="number"
            id="stock_quantity"
            name="stock_quantity"
            value={data.stock_quantity}
            onChange={handleInputChange}
            placeholder="0"
            step="0.01"
            min="0"
            required
          />
        </div>
      </div>

      <ImageUploadInput
        onImageUpload={handleImageUpload}
        folder="products"
        label="Product Image"
        hint="Upload a product image (JPG, PNG, WebP, GIF - max 10MB)"
        previewUrl={data.image_url}
        required
      />

      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <button type="submit" disabled={loading || !data.name || !data.price || !data.image_url}>
        {loading ? 'Adding Product...' : 'Add Product'}
      </button>
    </form>
  );
};

export default AddProductForm;
