// Dynamic environment configuration loader for Atta Chakki Frontend
// Reads environment variables from .env or falls back to domain-based detection

const DEFAULT_LOCAL_API = "http://localhost/Atta_Chakki_API";
const DEFAULT_PROD_API = "https://suchi-chakki-d602cf9262ad.herokuapp.com";

const DEFAULT_LOCAL_SOCKET = "http://localhost:3001";
const DEFAULT_PROD_SOCKET = "https://socket-server-9b9f3ddbe629.herokuapp.com";

// Resolve API URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? DEFAULT_LOCAL_API
    : DEFAULT_PROD_API
);

// Resolve Socket URL
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? DEFAULT_LOCAL_SOCKET
    : DEFAULT_PROD_SOCKET
);

// Third-party API credentials
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
export const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || "";
