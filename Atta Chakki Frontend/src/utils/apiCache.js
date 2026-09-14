
const CACHE_PREFIX = 'ac_cache_';

/**
 * Get cached data for a key if still fresh.
 * @param {string} key - Unique cache key
 * @param {number} ttlSeconds - Time to live in seconds (default 5 min)
 * @returns {any|null} Parsed data or null if expired/missing
 */
export function getCached(key, ttlSeconds = 300) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    const ageSeconds = (Date.now() - timestamp) / 1000;
    if (ageSeconds < ttlSeconds) return data;
    localStorage.removeItem(CACHE_PREFIX + key);
    return null;
  } catch {
    return null;
  }
}

/**
 * Save data to localStorage cache.
 * @param {string} key - Unique cache key
 * @param {any} data - Data to cache
 */
export function setCache(key, data) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

/**
 * Invalidate (delete) a specific cache entry.
 * Call this after a mutation (add/edit/delete product etc.)
 * @param {string} key - Cache key to invalidate
 */
export function invalidateCache(key) {
  localStorage.removeItem(CACHE_PREFIX + key);
}

/**
 * Clear ALL ac_cache_ entries from localStorage.
 * Use on logout or major data updates.
 */
export function clearAllCache() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
}

/**
 * Cached fetch wrapper — drop-in replacement for plain fetch.
 * Checks localStorage first. On miss, fetches from API and caches.
 *
 * @param {string} cacheKey - Unique identifier for this data
 * @param {string} url - Full API URL to fetch
 * @param {RequestInit} fetchOptions - Optional fetch options (headers, etc.)
 * @param {number} ttlSeconds - How long to cache (default 5 min)
 * @returns {Promise<any>} - Parsed JSON response
 *
 * @example
 * import { cachedFetch, invalidateCache } from '../utils/apiCache';
 *
 * // Fetch with 10 minute cache
 * const data = await cachedFetch('all_products', `${API_BASE_URL}/get_all_products.php`, {}, 600);
 *
 * // After adding a product, invalidate so next load is fresh
 * invalidateCache('all_products');
 */
export async function cachedFetch(cacheKey, url, fetchOptions = {}, ttlSeconds = 300) {
  const cached = getCached(cacheKey, ttlSeconds);
  if (cached !== null) return cached;

  const res = await fetch(url, fetchOptions);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();

  if (json.success !== false) {
    setCache(cacheKey, json);
  }

  return json;
}
