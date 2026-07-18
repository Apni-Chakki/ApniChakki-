// Localhost Defaults:
// Frontend connects to local PHP backend and local Socket server by default.
// Production:
// Socket Server is hosted on Heroku: https://socket-server-9b9f3ddbe629.herokuapp.com
// PHP Backend is hosted on Heroku: https://suchi-chakki-d602cf9262ad.herokuapp.com

const PRODUCTION_API_URL = "https://suchi-chakki-d602cf9262ad.herokuapp.com";

export const API_BASE_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? "http://localhost/atta_chakki_api"
    : PRODUCTION_API_URL
);

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? "http://localhost:3001"
    : "https://socket-server-9b9f3ddbe629.herokuapp.com"
);
