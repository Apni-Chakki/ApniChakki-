// safe json parse helper
export function safeJSONParse(value, defaultValue = null, storageKey = null) {
  if (value === null || value === undefined || value === 'undefined' || value === 'null' || value === '') {
    return defaultValue;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn(`Corrupted JSON detected${storageKey ? ` in localStorage key "${storageKey}"` : ''}. Resetting to default.`, error);
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {
      }
    }
    return defaultValue;
  }
}

// local storage se safe get karna
export function safeGetStorage(key, defaultValue = null) {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    return safeJSONParse(raw, defaultValue, key);
  } catch (error) {
    console.warn(`Unable to access localStorage for key "${key}":`, error);
    return defaultValue;
  }
}

// global error handler to prevent crashing
export function initGlobalErrorProtection() {
  if (typeof window === 'undefined') return;

  // third-party script errors handle kar rahe
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
      event.preventDefault();
      return true;
    }
  }, true);

  // unhandled promise rejections handle karna
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
      event.preventDefault();
    }
  });
}
