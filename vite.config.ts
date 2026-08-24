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
        navigateFallback: '/index.html',
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
