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
      memoryCache[cacheKey] = data.translated;
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
          memoryCache[`${lang}:${text}`] = translated;
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

/**
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
        if (staticTrans && staticTrans !== text) return staticTrans;
      }

      const cacheKey = `${language}:${text}`;
      if (memoryCache[cacheKey]) return memoryCache[cacheKey];

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




