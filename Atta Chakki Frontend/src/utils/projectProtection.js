/* 
 * Global Project Protection & Crash Prevention Shield
 * Prevents third-party script failures, storage corruption, unhandled promise rejections,
 * and JSON parse errors from breaking the Apni Chakki frontend.
 */

// 1. Safe JSON Parse Helper with Auto-Sanitization
export function safeJSONParse(value, defaultValue = null, storageKey = null) {
  if (value === null || value === undefined || value === 'undefined' || value === 'null' || value === '') {
    return defaultValue;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn(`⚠️ Corrupted JSON detected${storageKey ? ` in localStorage key "${storageKey}"` : ''}. Resetting to default.`, error);
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {
        // Ignore storage removal errors
      }
    }
    return defaultValue;
  }
}

// 2. Safe LocalStorage Get Helper
export function safeGetStorage(key, defaultValue = null) {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    return safeJSONParse(raw, defaultValue, key);
  } catch (error) {
    console.warn(`⚠️ Unable to access localStorage for key "${key}":`, error);
    return defaultValue;
  }
}

// 3. Global Unhandled Error & Promise Rejection Interceptor
export function initGlobalErrorProtection() {
  if (typeof window === 'undefined') return;

  // Prevent third-party external scripts (OneSignal, Meta Pixel, browser extensions, ads) from crashing React
  window.addEventListener('error', (event) => {
    const errorSource = event.filename || event.message || '';
    if (
      errorSource.includes('onesignal') ||
      errorSource.includes('fbevents') ||
      errorSource.includes('connect.facebook.net') ||
      errorSource.includes('extension') ||
      errorSource.includes('leaflet') ||
      errorSource.includes('google-analytics') ||
      errorSource.includes('doubleclick') ||
      errorSource.includes('Script error')
    ) {
      console.warn('🛡️ Shielded external script error from crashing app:', event.message || event);
      event.preventDefault(); // Stop propagating
      return true;
    }
  }, true);

  // Prevent unhandled promise rejections (network failures, aborted fetches, WebSocket timeouts) from freezing UI
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason && (event.reason.message || event.reason.toString() || '');
    if (
      reason.includes('Failed to fetch') ||
      reason.includes('NetworkError') ||
      reason.includes('Load failed') ||
      reason.includes('aborted') ||
      reason.includes('OneSignal') ||
      reason.includes('Socket') ||
      reason.includes('timeout')
    ) {
      console.warn('🛡️ Shielded unhandled network/promise rejection:', reason);
      event.preventDefault(); // Silently handle common transient network glitches
    }
  });

  console.log('🛡️ Suchi Chakki Global Crash Protection Shield initialized.');
}
