import { useState, useRef } from 'react';
import { useImageUpload } from '../lib/useImageUpload';
import { transformImage, IMAGE_TRANSFORMS } from '../config/cloudinary';
import './ImageUploadInput.css';

/**
 * Image Upload Component
 * Provides file input and preview for image uploads
 */
export const ImageUploadInput = ({
  onImageUpload,
  folder = 'products',
  previewUrl = null,
  maxWidth = 300,
  label = 'Upload Image',
  hint = 'JPG, PNG, WebP, GIF (max 10MB)',
  required = false,
  disabled = false
}) => {
  const fileInputRef = useRef(null);
  const [localPreview, setLocalPreview] = useState(previewUrl);
  const [selectedFile, setSelectedFile] = useState(null);
  const { uploadImage, uploading, error, progress } = useImageUpload();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Show local preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setLocalPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const result = await uploadImage(selectedFile, folder);
    if (result?.success) {
      setSelectedFile(null);
      setLocalPreview(result.url);
      if (onImageUpload) {
        onImageUpload({
          url: result.url,
          publicId: result.public_id,
          width: result.width,
          height: result.height
        });
      }
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setLocalPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onImageUpload) {
      onImageUpload(null);
    }
  };

  return (
    <div className="image-upload-container">
      <label className="upload-label">
        {label}
        {required && <span className="required">*</span>}
      </label>

      <div className="upload-input-wrapper">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={disabled || uploading}
          className="file-input"
        />

        {localPreview && (
          <div className="preview-container">
            <img
              src={localPreview}
              alt="Preview"
              className="preview-image"
              style={{ maxWidth: `${maxWidth}px` }}
            />
          </div>
        )}

        {!localPreview && (
          <div className="upload-placeholder">
            <div className="upload-icon">📤</div>
            <p>Click to select image or drag and drop</p>
            <small>{hint}</small>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {uploading && (
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
            <span className="progress-text">{progress}%</span>
          </div>
        )}
      </div>

      {selectedFile && !uploading && !localPreview?.startsWith('blob') && (
        <button
          onClick={handleUpload}
          disabled={uploading || !selectedFile}
          className="upload-button"
        >
          Upload Image
        </button>
      )}

      {localPreview && (
        <button
          onClick={handleRemove}
          disabled={uploading}
          className="remove-button"
        >
          Remove Image
        </button>
      )}
    </div>
  );
};

export default ImageUploadInput;
