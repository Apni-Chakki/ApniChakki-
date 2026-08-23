import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translateText, getCachedTranslation } from '../utils/translateService';

const LanguageContext = createContext(undefined);

export function LanguageProvider({ children }) {
  const { i18n: i18nInstance } = useTranslation();
  
  const [language, setLanguage] = useState(() => {
    return i18nInstance.language || 'en';
  });

  // syncing language with i18n
  useEffect(() => {
    i18nInstance.changeLanguage(language);
    document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, i18nInstance]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ur' : 'en');
  };

  /**
   * Synchronous static lookup (i18next dictionary)
   */
  const t = (key) => {
    return i18nInstance.t(key);
  };

  /**
   * Hybrid lookup: Checks static dictionary first; if missing, falls back to API translation.
   */
  const tAsync = async (text) => {
    if (!text) return text;
    const staticResult = i18nInstance.t(text);
    if (staticResult && staticResult !== text) {
      return staticResult;
    }
    if (language === 'en') return text;
    return await translateText(text, language);
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      toggleLanguage, 
      t,
      tAsync,
      translateText: (text) => translateText(text, language),
      getCachedTranslation: (text) => getCachedTranslation(text, language),
      isRTL: language === 'ur'
    }}>
      <div className={language === 'ur' ? 'font-[System-ui] text-right' : ''}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}




