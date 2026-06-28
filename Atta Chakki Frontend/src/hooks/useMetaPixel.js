import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useMetaPixel = () => {
  const location = useLocation();

  useEffect(() => {
    // Fire PageView event on every route change
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [location]);
};
