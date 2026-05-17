import { createRoot } from "react-dom/client";
import App from "./App";
import { GoogleOAuthProvider } from '@react-oauth/google';
import "./index.css";
import "./App.css";
import "./i18n";

createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "342629945290-s5jp9bljd9s4sardqeemtnrv3crorsa0.apps.googleusercontent.com"}>
    <App />
  </GoogleOAuthProvider>
);




