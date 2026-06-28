import { createRoot } from "react-dom/client";
import App from "./App";
import { GoogleOAuthProvider } from '@react-oauth/google';
import "./index.css";
import "./App.css";
import "./i18n";
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New version available. Reload to update?')) {
      updateSW(true);
    }
  },
});

createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "342629945290-s5jp9bljd9s4sardqeemtnrv3crorsa0.apps.googleusercontent.com"}>
    <App />
  </GoogleOAuthProvider>
);




