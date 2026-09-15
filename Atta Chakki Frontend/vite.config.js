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
      injectRegister: 'auto',
      filename: 'OneSignalSDKWorker.js',
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // Skip heavy vendor chunks (mapbox/pdf/excel) from the first-visit precache
        // — they download on demand when the user actually opens a map/print/export
        // flow. Reduces initial precache from ~5.8 MB to ~2.9 MB. Cost: those
        // specific features don't work offline until first used online.
        // Decided 2026-09-15.
        globIgnores: [
          '**/vendor-mapbox-*.js',
          '**/vendor-pdf-*.js',
          '**/vendor-excel-*.js',
          '**/vendor-charts-*.js',
        ],
        importScripts: ['https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js']
      },
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: 'Suchi Chakki',
        short_name: 'Suchi Chakki',
        description: 'Fresh, hygienic, and authentic Chakki Atta and premium spices delivered straight to your doorstep.',
        theme_color: '#8b6f47',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
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
  server: {
    host: true,
    port: 5173,
    headers: {
      // Google OAuth popup ke liye zarori hai — bina is ke COOP popup block kar deta hai
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
  },
  optimizeDeps: {
    include: ['mapbox-gl'],
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('mapbox-gl')) {
              return 'vendor-mapbox';
            }
            if (id.includes('react/') || id.includes('react-dom/') || id.includes('react-router-dom/')) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            if (id.includes('xlsx')) {
              return 'vendor-excel';
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
          }
        }
      }
    }
  }
});
