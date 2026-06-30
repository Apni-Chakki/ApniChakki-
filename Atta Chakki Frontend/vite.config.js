import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      filename: 'OneSignalSDKWorker.js',
      workbox: {
        cleanupOutdatedCaches: true,
        importScripts: ['https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js']
      },
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Apni Chakki',
        short_name: 'Apni Chakki',
        description: 'Fresh, hygienic, and authentic Chakki Atta and premium spices delivered straight to your doorstep.',
        theme_color: '#8b6f47',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      // This is the only alias you usually need
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'framer-motion'],
        }
      }
    }
  }
});
