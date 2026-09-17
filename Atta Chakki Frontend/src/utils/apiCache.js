
const CACHE_PREFIX = 'ac_cache_';

// return cached data if not expired yet
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

// save data in cache
export function setCache(key, data) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // storage full, just skip
  }
}

// delete one cache entry, call after add/edit/delete product
export function invalidateCache(key) {
  localStorage.removeItem(CACHE_PREFIX + key);
}

// clear all cache, use on logout
export function clearAllCache() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
}

// fetch wrapper, checks cache first then calls api on miss
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
