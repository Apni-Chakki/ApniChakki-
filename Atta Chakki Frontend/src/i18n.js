import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// i18n setup for language switching
const savedLang = localStorage.getItem('apni_chakki_lang') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: {} },
      ur: { translation: {} }
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, 
    },
    parseMissingKeyHandler: (key) => {
      return key;
    }
  });

// saving language preference
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('apni_chakki_lang', lng);
});

export default i18n;
