import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
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
                navigateFallbackAllowlist: [/^\/$/, /^\/pendapatan/, /^\/pengeluaran/, /^\/laporan/, /^\/kwitansi/, /^\/tanda-terima-wasit/],
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
    build: {
        sourcemap: false,
        cssCodeSplit: true,
        rollupOptions: {
            output: {
                manualChunks: undefined
            }
        }
    },
    define: {
        'process.env.SHOW_WATERMARK': JSON.stringify('false')
    }
});
