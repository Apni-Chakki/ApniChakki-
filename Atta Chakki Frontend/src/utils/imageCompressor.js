// shrinks image before upload so it doesn't timeout on slow network
export const compressImage = (file, maxWidth = 1024, maxHeight = 1024, quality = 0.75) => {
  return new Promise((resolve) => {
    // skip small files, not worth compressing
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
        // white bg so transparent png doesn't turn black in jpeg
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
