import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "mocha-error-reporter",

      // ref: https://vite.dev/guide/api-plugin.html#transformindexhtml
      transformIndexHtml(html) {
        if (process.env.NODE_ENV !== "development" && process.env.SHOW_WATERMARK !== "false") {
          return [
            {
              tag: "style",
              attrs: { type: "text/css" },
              injectTo: "head",
              children: `
                .mocha-watermark {
                  position: fixed;
                  bottom: 16px;
                  right: 16px;
                  background: white;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                  display: flex;
                  align-items: center;
                  padding: 8px 12px;
                  z-index: 9999;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  font-size: 14px;
                  font-weight: bold;
                  color: #000;
                  gap: 8px;
                  border: 1px solid #e6e6e6;
                  background: linear-gradient(to bottom, #FFFFFF, #F9F9F9);
                  cursor: pointer;
                  transition: all 0.2s ease-in-out;
                }
                .mocha-watermark:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                }
                .mocha-watermark:active {
                  transform: translateY(0);
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }
                .mocha-watermark img {
                  width: 16px;
                  height: 16px;
                }
              `,
            },
            {
              tag: "script",
              attrs: { type: "module" },
              injectTo: "body",
              children: `
                const watermark = document.createElement('a');
                watermark.href = 'https://www.srcbook.com?a_id=' + encodeURIComponent('0195bfc4-06ff-71af-bb75-b8fd467c9d72');
                watermark.target = '_blank';
                watermark.className = 'mocha-watermark';
                watermark.innerHTML = \`
                  <img src="https://mocha-cdn.com/favicon.svg" alt="Srcbook Logo" />
                  Made in Srcbook
                \`;
                document.body.appendChild(watermark);
              `,
            },
          ];
        }

        return [
          {
            tag: "script",
            attrs: { type: "module" },
            injectTo: "head",
            children: `
            // Report any logs, errors, etc to the parent mocha app context to include in
            // the bottom panel.
            for (const method of ['log', 'debug', 'info', 'error', 'warn']) {
              const originalFn = console[method];
              console[method] = function(...args) {
                window.parent.postMessage({ type: 'console', method, args: args.map(a => \`\${a}\`) }, '*');
                return originalFn(...args);
              };
            }

            // Report any thrown errors / promise rejections so they show up in the logs
            window.addEventListener('error', (e) => {
              if (window.parent) {
                window.parent.postMessage({ type: 'error', stack: e.error.stack }, '*');
              }
            });
            window.addEventListener('unhandledrejection', (e) => {
              if (window.parent) {
                window.parent.postMessage({ type: 'unhandledrejection', reason: e.reason }, '*');
              }
            });

            // Report URL change event from iframe
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;

            const notifyParent = () => {
              window.parent.postMessage({ type: 'iframe_url_changed', url: window.location.href }, '*');
            };

            history.pushState = function (...args) {
              originalPushState.apply(this, args);
              notifyParent();
            };

            history.replaceState = function (...args) {
              originalReplaceState.apply(this, args);
              notifyParent();
            };

            window.addEventListener('popstate', notifyParent);
            window.addEventListener('hashchange', notifyParent);
          `,
          },
        ];
      },

      transform(src: string, id: string) {
        if (id === "/app/src/main.tsx") {
          return `
            ${src}
            if (process.env.NODE_ENV === 'development') {
              // Report any vite-hmr errors up to the parent mocha app context
              // Full event list: https://vite.dev/guide/api-hmr.html
              if (import.meta.hot) {
                import.meta.hot.on('vite:error', (data) => {
                  if (window.parent) {
                    window.parent.postMessage({ type: 'vite:hmr:error', data }, '*');
                  }
                });
                import.meta.hot.on('vite:beforeUpdate', (data) => {
                  if (window.parent) {
                    window.parent.postMessage({ type: 'vite:hmr:beforeUpdate', data }, '*');
                  }
                });
                import.meta.hot.on('vite:afterUpdate', (data) => {
                  if (window.parent) {
                    window.parent.postMessage({ type: 'vite:hmr:afterUpdate', data }, '*');
                  }
                });
              }
            }
          `;
        }
      },
    },
    VitePWA({
      registerType: 'prompt',
      devOptions: {
        enabled: true,
        type: 'module'
      },
      strategies: 'generateSW',
      injectRegister: 'auto',
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,vue,txt,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackAllowlist: [/^\/$/,/^\/pendapatan/,/^\/pengeluaran/,/^\/laporan/,/^\/kwitansi/,/^\/tanda-terima-wasit/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-data-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // <== 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 10
            }
          }
        ]
      },
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'masked-icon.svg',
        'android/android-launchericon-192-192.png',
        'android/android-launchericon-512-512.png',
        'android/android-launchericon-maskable-192-192.png',
        'android/android-launchericon-maskable-512-512.png',
        'screenshots/dashboard.png'
      ],
      manifest: {
        id: '/',
        name: 'BKU KARTA CUP V',
        short_name: 'BKU',
        description: 'Aplikasi Buku Kas Umum KARTA CUP V',
        theme_color: '#ff5722',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'windows11/Square44x44Logo.scale-100.png',
            sizes: '44x44',
            type: 'image/png'
          },
          {
            src: 'windows11/Square150x150Logo.scale-100.png',
            sizes: '150x150',
            type: 'image/png'
          },
          {
            src: 'windows11/Square150x150Logo.scale-200.png',
            sizes: '300x300',
            type: 'image/png'
          },
          {
            src: 'android/android-launchericon-192-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'android/android-launchericon-512-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'android/android-launchericon-maskable-192-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'android/android-launchericon-maskable-512-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: 'windows11/LargeTile.scale-200.png',
            sizes: '620x620',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Dashboard BKU KARTA CUP V - Desktop'
          },
          {
            src: 'windows11/Square150x150Logo.scale-400.png',
            sizes: '600x600',
            type: 'image/png',
            label: 'Dashboard BKU KARTA CUP V - Mobile'
          }
        ],
        categories: ['finance', 'utilities'],
        prefer_related_applications: false
      }
    })
  ],
  server: {
    allowedHosts: true,
  },
});
