import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../store/LanguageContext';
import { translateText, getCachedTranslation } from '../../utils/translateService';

/**
 * AutoTranslateText Component
 * Renders static translation if available in i18n dictionary.
 * Otherwise, falls back to API translation (cached in localStorage).
 * 
 * Usage: <AutoTranslateText text={product.name} />
 */
export default function AutoTranslateText({ text, className = '', as: Component = 'span', ...props }) {
  const { language, t } = useLanguage();
  
  // 1. Static check
  const staticResult = t(text);
  const hasStatic = staticResult && staticResult !== text;

  // 2. State for dynamic API translation
  const [displayText, setDisplayText] = useState(() => {
    if (language === 'en' || hasStatic) {
      return hasStatic ? staticResult : text;
    }
    // Check if already in cache
    const cached = getCachedTranslation(text, language);
    return cached || text;
  });

  useEffect(() => {
    let isMounted = true;

    if (language === 'en') {
      setDisplayText(text);
      return;
    }

    if (hasStatic) {
      setDisplayText(staticResult);
      return;
    }

    // Check cache
    const cached = getCachedTranslation(text, language);
    if (cached) {
      setDisplayText(cached);
      return;
    }

    // Fallback to API translation
    translateText(text, language).then(translated => {
      if (isMounted && translated) {
        setDisplayText(translated);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [text, language, hasStatic, staticResult]);

  return (
    <Component className={className} {...props}>
      {displayText}
    </Component>
  );
}
