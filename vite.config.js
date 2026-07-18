import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The PWA plugin runs at build time only. During dev/test (command === 'serve') it is omitted so
// vitest and the dev server are unaffected by service-worker generation.
// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    ...(command === 'build'
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['pwa-icon.svg'],
            manifest: {
              name: 'Vaishu — Current Affairs Daily',
              short_name: 'Vaishu',
              description: 'AI-powered daily current-affairs revision for Indian exams.',
              start_url: '/',
              scope: '/',
              display: 'standalone',
              background_color: '#f9fafb',
              theme_color: '#18181b',
              icons: [
                {
                  src: '/pwa-icon.svg',
                  sizes: 'any',
                  type: 'image/svg+xml',
                  purpose: 'any maskable',
                },
              ],
            },
            workbox: {
              // Precache only local build assets. No runtimeCaching — the service worker never
              // intercepts cross-origin requests (Firebase Auth / Firestore / Gemini are untouched).
              globPatterns: ['**/*.{js,css,html,svg,ico}'],
              cleanupOutdatedCaches: true,
              clientsClaim: true,
              skipWaiting: true,
              // The FCM background worker is a separate, manually registered SW — never handled here.
              navigateFallbackDenylist: [/^\/firebase-messaging-sw\.js$/],
            },
          }),
        ]
      : []),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
  },
}));
