import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        {
            name: "mocha-error-reporter",
            // ref: https://vite.dev/guide/api-plugin.html#transformindexhtml
            transformIndexHtml: function (html) {
                if (process.env.NODE_ENV !== "development" && process.env.SHOW_WATERMARK !== "false") {
                    return [
                        {
                            tag: "style",
                            attrs: { type: "text/css" },
                            injectTo: "head",
                            children: "\n                .mocha-watermark {\n                  position: fixed;\n                  bottom: 16px;\n                  right: 16px;\n                  background: white;\n                  border-radius: 8px;\n                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);\n                  display: flex;\n                  align-items: center;\n                  padding: 8px 12px;\n                  z-index: 9999;\n                  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif;\n                  font-size: 14px;\n                  font-weight: bold;\n                  color: #000;\n                  gap: 8px;\n                  border: 1px solid #e6e6e6;\n                  background: linear-gradient(to bottom, #FFFFFF, #F9F9F9);\n                  cursor: pointer;\n                  transition: all 0.2s ease-in-out;\n                }\n                .mocha-watermark:hover {\n                  transform: translateY(-2px);\n                  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);\n                }\n                .mocha-watermark:active {\n                  transform: translateY(0);\n                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);\n                }\n                .mocha-watermark img {\n                  width: 16px;\n                  height: 16px;\n                }\n              ",
                        },
                        {
                            tag: "script",
                            attrs: { type: "module" },
                            injectTo: "body",
                            children: "\n                const watermark = document.createElement('a');\n                watermark.href = 'https://www.srcbook.com?a_id=' + encodeURIComponent('0195bfc4-06ff-71af-bb75-b8fd467c9d72');\n                watermark.target = '_blank';\n                watermark.className = 'mocha-watermark';\n                watermark.innerHTML = `\n                  <img src=\"https://mocha-cdn.com/favicon.svg\" alt=\"Srcbook Logo\" />\n                  Made in Srcbook\n                `;\n                document.body.appendChild(watermark);\n              ",
                        },
                    ];
                }
                return [
                    {
                        tag: "script",
                        attrs: { type: "module" },
                        injectTo: "head",
                        children: "\n            // Report any logs, errors, etc to the parent mocha app context to include in\n            // the bottom panel.\n            for (const method of ['log', 'debug', 'info', 'error', 'warn']) {\n              const originalFn = console[method];\n              console[method] = function(...args) {\n                window.parent.postMessage({ type: 'console', method, args: args.map(a => `${a}`) }, '*');\n                return originalFn(...args);\n              };\n            }\n\n            // Report any thrown errors / promise rejections so they show up in the logs\n            window.addEventListener('error', (e) => {\n              if (window.parent) {\n                window.parent.postMessage({ type: 'error', stack: e.error.stack }, '*');\n              }\n            });\n            window.addEventListener('unhandledrejection', (e) => {\n              if (window.parent) {\n                window.parent.postMessage({ type: 'unhandledrejection', reason: e.reason }, '*');\n              }\n            });\n\n            // Report URL change event from iframe\n            const originalPushState = history.pushState;\n            const originalReplaceState = history.replaceState;\n\n            const notifyParent = () => {\n              window.parent.postMessage({ type: 'iframe_url_changed', url: window.location.href }, '*');\n            };\n\n            history.pushState = function (...args) {\n              originalPushState.apply(this, args);\n              notifyParent();\n            };\n\n            history.replaceState = function (...args) {\n              originalReplaceState.apply(this, args);\n              notifyParent();\n            };\n\n            window.addEventListener('popstate', notifyParent);\n            window.addEventListener('hashchange', notifyParent);\n          ",
                    },
                ];
            },
            transform: function (src, id) {
                if (id === "/app/src/main.tsx") {
                    return "\n            ".concat(src, "\n            if (process.env.NODE_ENV === 'development') {\n              // Report any vite-hmr errors up to the parent mocha app context\n              // Full event list: https://vite.dev/guide/api-hmr.html\n              if (import.meta.hot) {\n                import.meta.hot.on('vite:error', (data) => {\n                  if (window.parent) {\n                    window.parent.postMessage({ type: 'vite:hmr:error', data }, '*');\n                  }\n                });\n                import.meta.hot.on('vite:beforeUpdate', (data) => {\n                  if (window.parent) {\n                    window.parent.postMessage({ type: 'vite:hmr:beforeUpdate', data }, '*');\n                  }\n                });\n                import.meta.hot.on('vite:afterUpdate', (data) => {\n                  if (window.parent) {\n                    window.parent.postMessage({ type: 'vite:hmr:afterUpdate', data }, '*');\n                  }\n                });\n              }\n            }\n          ");
                }
            },
        },
        VitePWA({
            registerType: 'prompt',
            devOptions: {
                enabled: true
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,json,vue,txt,woff2}']
            },
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
            manifest: {
                name: 'BKU KARTA CUP V',
                short_name: 'BKU',
                description: 'Aplikasi Buku Kas Umum KARTA CUP V',
                theme_color: '#ffffff',
                background_color: '#ffffff',
                display: 'standalone',
                icons: [
                    {
                        src: '/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: '/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    {
                        src: '/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            }
        })
    ],
    server: {
        allowedHosts: true,
    },
});
