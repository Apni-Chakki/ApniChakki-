import React, { useState } from 'react';

export const ImageWithFallback = ({ src, alt, fallbackSrc, className, loading = "lazy", decoding = "async", ...props }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      // Default fallback image if none provided
      setImgSrc(fallbackSrc || 'https://images.unsplash.com/photo-1565607052745-35f8c6ba59b1?w=800&auto=format&fit=crop&q=60');
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      onError={handleError}
      {...props}
    />
  );
};
