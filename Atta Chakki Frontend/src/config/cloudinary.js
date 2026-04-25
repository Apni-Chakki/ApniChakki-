// cloudinary config for frontend
export const CLOUDINARY_CLOUD_NAME = 'dufhxkm7e';
export const CLOUDINARY_UPLOAD_PRESET = 'apni_chakki';
export const UPLOAD_ENDPOINT = 'http://localhost/atta_chakki_api/upload_image.php';

// file restrictions
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// image transformation helper
export const transformImage = (url, transformation = 'w_400,h_400,c_fill,q_auto,f_auto') => {
  if (!url) return '';
  return url.replace('/upload/', `/upload/${transformation}/`);
};

// common image sizes
export const IMAGE_TRANSFORMS = {
  thumbnail: 'w_150,h_150,c_fill,q_auto,f_auto',
  small: 'w_300,h_300,c_fill,q_auto,f_auto',
  medium: 'w_500,h_500,c_fill,q_auto,f_auto',
  large: 'w_800,h_800,c_fit,q_auto,f_auto',
  fullWidth: 'w_1200,h_auto,q_auto,f_auto'
};
