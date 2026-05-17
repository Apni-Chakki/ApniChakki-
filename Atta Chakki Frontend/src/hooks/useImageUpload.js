/**
 * Image Upload Hook for React
 * Handles direct image uploads to Cloudinary (unsigned)
 */

import { useState } from 'react';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from '../config/cloudinary';

export const useImageUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const uploadImage = async (file, folder = 'products') => {
    setError(null);
    setProgress(0);

    // Validate file
    if (!file) {
      setError('No file selected');
      return null;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Invalid file type. Allowed: JPG, PNG, WebP, GIF');
      return null;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return null;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', folder); // apni-chakki/products or apni-chakki/categories

      // Direct upload to Cloudinary (no backend needed)
      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
      
      const response = await fetch(cloudinaryUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();

      if (!data.secure_url) {
        throw new Error('No URL returned from Cloudinary');
      }

      setProgress(100);
      console.log('Cloudinary upload successful:', data.secure_url);
      
      return {
        success: true,
        url: data.secure_url,
        public_id: data.public_id,
        width: data.width,
        height: data.height,
        message: 'Image uploaded successfully'
      };

    } catch (err) {
      const errorMsg = err.message || 'Upload failed';
      setError(errorMsg);
      console.error('Image upload error:', errorMsg);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadMultiple = async (files, folder = 'products') => {
    const results = [];
    for (const file of files) {
      const result = await uploadImage(file, folder);
      if (result) {
        results.push(result);
      }
    }
    return results;
  };

  return {
    uploadImage,
    uploadMultiple,
    uploading,
    error,
    progress
  };
};




