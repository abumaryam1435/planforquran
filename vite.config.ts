import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    build: {
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
      cssTarget: 'safari14',
    },
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/_/],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
          ignoreURLParametersMatching: [/.*/],
          runtimeCaching: [
            {
              urlPattern: /quran-.*\.json/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'quran-chunks-cache-v4',
                expiration: {
                  maxEntries: 1,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/android\.quran\.com\/.*\.png$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'quran-images-v1',
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/api\.alquran\.cloud\/v1\/page\/.*/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'quran-pages-v1',
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/api\.quran\.com\/api\/v4\/verses\/.*/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'quran-words-v1',
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/everyayah\.com\/data\/.*/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'quran-audio-v1',
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        manifest: {
          id: "/",
          name: "خطة حفظ القرآن",
          short_name: "خطة الحفظ",
          description: "تطبيق ذكي لإنشاء ومتابعة خطط حفظ القرآن الكريم",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          background_color: "#FDFBF7",
          theme_color: "#1A2E1A",
          icons: [
            {
              src: "/app_icon_v6.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/app_icon_v6.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/app_icon.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable"
            },
            {
              src: "/app_icon.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
