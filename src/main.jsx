import { createRoot } from "react-dom/client";
import App from "./App";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { SpeedInsights } from "@vercel/speed-insights/react";
import "./index.css";
import "./App.css";
import "./i18n";
import "./utils/apiInterceptor";
import { registerSW } from 'virtual:pwa-register';
import { initGlobalErrorProtection } from "./utils/projectProtection";

// Initialize global crash & third-party error shield
initGlobalErrorProtection();

// EMERGENCY SAFEGUARD AGAINST INFINITE AUTO-REFRESH LOOPS ON LIVE SITE
try {
  const RELOAD_KEY = 'apni_chakki_reload_count';
  const TIME_KEY = 'apni_chakki_reload_time';
  const now = Date.now();
  const lastTime = parseInt(sessionStorage.getItem(TIME_KEY) || '0', 10);
  const count = parseInt(sessionStorage.getItem(RELOAD_KEY) || '0', 10);

  // If page reloads more than 2 times within 6 seconds, we are in an infinite loop
  if (now - lastTime < 6000 && count >= 2) {
    console.warn('⚠️ Detected auto-refresh loop! Emergency unregistering Service Workers and clearing caches...');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
          console.log('🧹 Emergency unregistered SW:', reg);
        }
      });
    }
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name);
        }
      });
    }
    sessionStorage.setItem(RELOAD_KEY, '0');
  } else {
    if (now - lastTime < 6000) {
      sessionStorage.setItem(RELOAD_KEY, (count + 1).toString());
    } else {
      sessionStorage.setItem(RELOAD_KEY, '1');
    }
    sessionStorage.setItem(TIME_KEY, now.toString());
  }
} catch (e) {
  console.error('Reload loop check error:', e);
}

// In development or localhost, unregister any existing service workers to prevent infinite auto-refresh loops
if (import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
        console.log('🧹 Unregistered Service Worker in development mode:', registration);
      }
    });
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          if (name.includes('workbox') || name.includes('pwa') || name.includes('onesignal')) {
            caches.delete(name);
          }
        }
      });
    }
  }
} else {
  // Only register PWA service worker in production build
  registerSW({
    immediate: true,
    onNeedRefresh() {
      // Do NOT auto-reload. Just log it. User can manually refresh.
      console.log('New content available. Refresh manually when ready.');
    },
    onOfflineReady() {
      console.log('App is ready to work offline.');
    }
  });
}

createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "342629945290-s5jp9bljd9s4sardqeemtnrv3crorsa0.apps.googleusercontent.com"}>
    <App />
    <SpeedInsights />
  </GoogleOAuthProvider>
);




