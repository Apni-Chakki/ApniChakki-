// Localhost Defaults:
// Frontend connects to local PHP backend and local Socket server by default.
// Production:
// - Socket Server is hosted on Render: https://apnichakki.onrender.com
// - PHP Backend is hosted on InfinityFree. Replace the domain below with your actual InfinityFree domain.
const PRODUCTION_API_URL = window.location.origin + "/Atta_Chakki_API";



export const API_BASE_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? "http://localhost/atta_chakki_api"
    : PRODUCTION_API_URL
);

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? "http://localhost:3001"
    : "https://apnichakki.onrender.com"
);
