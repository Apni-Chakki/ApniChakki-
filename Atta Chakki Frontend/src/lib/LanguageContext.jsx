import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

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

  const t = (key) => {
    return i18nInstance.t(key);
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      toggleLanguage, 
      t,
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