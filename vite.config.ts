import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // her deploy'da service worker otomatik güncellenir — kullanıcı hiçbir şey yapmaz
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Mythweaver — D&D 5e Karakter Sihirbazı',
        short_name: 'Mythweaver',
        description: 'D&D 5e için Türkçe, adım adım karakter oluşturma sihirbazı.',
        lang: 'tr',
        // Yükleme ekranı Scriptorium (varsayılan kutup) ile açılır.
        theme_color: '#e4dcc9',
        background_color: '#e4dcc9',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Sayfa açılışları AĞDAN gelir (NetworkFirst). Önceden navigateFallback
        // ile önbellekteki index.html'e bağlanıyordu; deploy sonrası ilk açılış
        // hep eski sürümü gösteriyor, güncel hali ancak ikinci açılışta
        // geliyordu. Hash'li JS/CSS precache'te kalır — onlar zaten değişmez,
        // yeni HTML yeni hash'leri isteyince doğru dosyalar iner.
        navigateFallback: undefined,
        runtimeCaching: [
          {
            urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-navigation',
              // ağ yavaşsa bekletmeden önbelleğe düş
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 8 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // büyük JSON veri bundle'ı için limit yükselt
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
