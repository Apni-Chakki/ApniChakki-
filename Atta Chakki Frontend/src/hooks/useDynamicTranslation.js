import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';

const CACHE_STORAGE_KEY = 'apni_chakki_trans_cache';

// Module-level shared state — survives across re-renders and components
let memoryCache = {};
const pendingRequests = new Set();
const updateListeners = new Set();

try {
  const stored = localStorage.getItem(CACHE_STORAGE_KEY);
  if (stored) memoryCache = JSON.parse(stored);
} catch (e) {}

function saveCache() {
  try {
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(memoryCache));
  } catch (e) {}
}

function notifyAll() {
  updateListeners.forEach(fn => fn());
}

function applyGlossaryCorrection(str, lang) {
  if (!str || typeof str !== 'string' || lang === 'en') return str;
  if (lang === 'ur') {
    return str
      .replace(/اپنی چاکی/g, 'اپنی چکی')
      .replace(/اپنے چاکی/g, 'اپنی چکی')
      .replace(/چاکی/g, 'چکی')
      .replace(/Apni Chakki/gi, 'سچی چکی')
      .replace(/Suchi Chakki/gi, 'سچی چکی')
      .replace(/G3 Apni Chakki/gi, 'جی تھری سچی چکی')
      .replace(/G3 Suchi Chakki/gi, 'جی تھری سچی چکی')
      .replace(/Atta Chakki/gi, 'آٹا چکی')
      .replace(/\bChakki\b/gi, 'چکی');
  }
  return str;
}

async function fetchSingle(text, lang) {
  const cacheKey = `${lang}:${text}`;
  if (pendingRequests.has(cacheKey)) return;
  pendingRequests.add(cacheKey);
  try {
    const res = await fetch(`${API_BASE_URL}/utils/translate.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, from: 'en', to: lang }),
    });
    const data = await res.json();
    if (data.success && data.translated && data.translated !== text) {
      memoryCache[cacheKey] = applyGlossaryCorrection(data.translated, lang);
      saveCache();
      notifyAll();
    }
  } catch (e) {
    // API unavailable — silently keep original text
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

async function fetchBatch(texts, lang) {
  if (!texts?.length || lang === 'en') return;

  const toFetch = texts.filter(text => {
    if (!text || typeof text !== 'string' || !text.trim()) return false;
    const key = `${lang}:${text}`;
    return !memoryCache[key] && !pendingRequests.has(key);
  });

  if (!toFetch.length) return;
  toFetch.forEach(t => pendingRequests.add(`${lang}:${t}`));

  try {
    const res = await fetch(`${API_BASE_URL}/utils/translate.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: toFetch, from: 'en', to: lang }),
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.translations)) {
      let changed = false;
      toFetch.forEach((text, i) => {
        const translated = data.translations[i];
        if (translated && translated !== text) {
          memoryCache[`${lang}:${text}`] = applyGlossaryCorrection(translated, lang);
          changed = true;
        }
      });
      if (changed) {
        saveCache();
        notifyAll();
      }
    }
  } catch (e) {
    // Silent fail
  } finally {
    toFetch.forEach(t => pendingRequests.delete(`${lang}:${t}`));
  }
}

/* 
 * Drop-in replacement for useTranslation that also handles dynamic DB content.
 *
 * - t(key)        → static i18n dictionary (UI labels, buttons, etc.)
 * - tDynamic(text) → static dict first, then translate API for unknown DB content
 * - translateBatch(texts) → pre-fetch a list of strings in one API call
 */
export function useDynamicTranslation() {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onLangChange = (lng) => setLanguage(lng);
    i18n.on('languageChanged', onLangChange);
    return () => i18n.off('languageChanged', onLangChange);
  }, [i18n]);

  useEffect(() => {
    const update = () => setTick(n => n + 1);
    updateListeners.add(update);
    return () => updateListeners.delete(update);
  }, []);

  const tDynamic = useCallback(
    (text) => {
      if (!text || typeof text !== 'string' || !text.trim()) return text ?? '';
      if (language === 'en') return text;

      // Static dictionary first
      if (i18n.exists(text)) {
        const staticTrans = t(text);
        if (staticTrans && staticTrans !== text) return applyGlossaryCorrection(staticTrans, language);
      }

      const glossaryTrans = applyGlossaryCorrection(text, language);
      if (glossaryTrans !== text) return glossaryTrans;

      const cacheKey = `${language}:${text}`;
      if (memoryCache[cacheKey]) {
        const corrected = applyGlossaryCorrection(memoryCache[cacheKey], language);
        if (corrected !== memoryCache[cacheKey]) {
          memoryCache[cacheKey] = corrected;
          saveCache();
        }
        return corrected;
      }

      // Trigger async fetch — won't duplicate for same key
      fetchSingle(text, language);

      return text; // show original while loading
    },
    // tick re-creates this function after cache updates, causing re-renders to pick up new translations
    [t, i18n, language, tick]
  );

  const translateBatch = useCallback(
    (texts) => fetchBatch(texts, language),
    [language]
  );

  return { t, tDynamic, translateBatch, language };
}




