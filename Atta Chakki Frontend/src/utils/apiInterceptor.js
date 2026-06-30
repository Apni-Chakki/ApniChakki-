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
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    // Dispatch an event so React can update state if needed, or just reload
    window.location.href = '/';
  }
  
  return response;
};
