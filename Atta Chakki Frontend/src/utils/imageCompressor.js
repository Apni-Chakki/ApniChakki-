/**
 * Compresses an image file before uploading to keep file sizes small
 * and avoid HTTP timeouts/network failures.
 * 
 * @param {File} file - The original Image file object.
 * @param {number} maxWidth - Maximum width of the compressed image. Default is 1024.
 * @param {number} maxHeight - Maximum height of the compressed image. Default is 1024.
 * @param {number} quality - Compression quality between 0.0 and 1.0. Default is 0.75.
 * @returns {Promise<File>} A Promise that resolves to the compressed File object.
 */
export const compressImage = (file, maxWidth = 1024, maxHeight = 1024, quality = 0.75) => {
  return new Promise((resolve) => {
    // If the file is not an image or is already small (e.g. less than 200KB), don't compress
    if (!file.type.startsWith('image/') || file.size < 200 * 1024) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Fill white background (useful if transparent PNG is converted to JPEG to avoid black background)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              
              console.log(`[Image Compressor] Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB | Compressed size: ${(compressedFile.size / 1024).toFixed(1)} KB`);
              resolve(compressedFile);
            } else {
              resolve(file); // Fallback to original on error
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file); // Fallback to original
    };
    reader.onerror = () => resolve(file); // Fallback to original
  });
};
