import { API_BASE_URL } from '../config';

const originalFetch = window.fetch;

window.fetch = async function (...args) {
  let [resource, config] = args;
  
  if (typeof resource === 'string' && resource.includes(API_BASE_URL)) {
    const token = localStorage.getItem('token');
    if (token) {
      config = config || {};
      
      // Prevent overriding FormData headers, let browser set boundary
      const isFormData = config.body instanceof FormData;
      
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      };
      
      args[1] = config;
    }
  }
  const response = await originalFetch.apply(this, args);
  
  if (response.status === 401) {
    // Token is invalid or missing, clear session
    const hadToken = localStorage.getItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('auth-change'));
    // Only redirect if a token was present and we aren't already on the homepage or login page
    if (hadToken && window.location.pathname !== '/' && !window.location.pathname.includes('/login')) {
      window.location.href = '/';
    }
  }
  
  // Wrap response.json to safely catch HTML / ModSecurity / InfinityFree error pages
  const originalJson = response.json;
  response.json = async function () {
    try {
      const text = await response.clone().text();
      // If server returned HTML (like 403 Forbidden, 502 Gateway, or InfinityFree security challenge)
      if (text.trim().startsWith('<') || text.includes('<html>') || text.includes('<!DOCTYPE')) {
        console.warn('⚠️ Server returned HTML instead of JSON! (Likely WAF/ModSecurity or Free Hosting Challenge)', text.substring(0, 200));
        return {
          success: false,
          message: 'Server blocked this request (WAF/Security Challenge). Received HTML instead of JSON.',
          rawHtml: text
        };
      }
      return JSON.parse(text);
    } catch (e) {
      console.error('⚠️ JSON parse error in API response:', e);
      // Fallback to original json if text cloning failed
      try {
        return await originalJson.call(response);
      } catch (err) {
        return {
          success: false,
          message: 'Invalid JSON response from server'
        };
      }
    }
  };
  
  return response;
};
