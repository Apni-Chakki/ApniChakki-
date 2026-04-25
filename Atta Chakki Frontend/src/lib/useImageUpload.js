/**
 * Image Upload Hook for React
 * Handles image uploads to Cloudinary via backend
 */

import { useState } from 'react';
import { UPLOAD_ENDPOINT, ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from '../config/cloudinary';

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
      formData.append('image', file);
      formData.append('folder', folder);

      const response = await fetch(UPLOAD_ENDPOINT, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Upload failed');
      }

      setProgress(100);
      return data;

    } catch (err) {
      setError(err.message || 'Upload failed');
      console.error('Image upload error:', err);
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
