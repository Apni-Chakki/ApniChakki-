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
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false
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
