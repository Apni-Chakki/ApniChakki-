/**
 * Hybrid Translation Utility Service
 * Provides dynamic translation fallback using free Google Translate endpoint
 * with local caching in localStorage to prevent redundant network requests.
 */

const CACHE_PREFIX = 'apni_chakki_trans_';

/**
 * Translates text asynchronously if not available statically.
 * @param {string} text - The text to translate
 * @param {string} targetLang - Target language code ('ur', 'en', etc.)
 * @param {string} sourceLang - Source language code ('auto' or 'en')
 * @returns {Promise<string>} Translated text or original text as fallback
 */
export async function translateText(text, targetLang = 'ur', sourceLang = 'auto') {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return text;
  }

  // Do not translate pure numbers or short codes/IDs
  const trimmed = text.trim();
  if (!isNaN(trimmed) || trimmed.length <= 1) {
    return text;
  }

  // If target language is english and text is already english, return as is
  if (targetLang === 'en' && sourceLang === 'en') {
    return text;
  }

  const cacheKey = `${CACHE_PREFIX}${targetLang}_${trimmed}`;

  // 1. Check local storage cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (e) {
    console.warn('LocalStorage read error in translateService:', e);
  }

  // 2. Fetch from Google Free Translate API (GTX)
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Translation API HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (data && Array.isArray(data[0])) {
      const translated = data[0].map(segment => segment[0]).filter(Boolean).join('');
      
      if (translated) {
        // Cache result
        try {
          localStorage.setItem(cacheKey, translated);
        } catch (e) {
          console.warn('LocalStorage write error in translateService:', e);
        }
        return translated;
      }
    }
  } catch (err) {
    console.warn(`Dynamic translation failed for "${text}":`, err);
  }

  // 3. Fallback to original text if API fails or offline
  return text;
}

/**
 * Synchronously checks if a translation exists in localStorage cache
 * @param {string} text 
 * @param {string} targetLang 
 * @returns {string|null}
 */
export function getCachedTranslation(text, targetLang = 'ur') {
  if (!text || typeof text !== 'string') return null;
  const cacheKey = `${CACHE_PREFIX}${targetLang}_${text.trim()}`;
  try {
    return localStorage.getItem(cacheKey);
  } catch {
    return null;
  }
}
