import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Nombre exacto del repo de GitHub Pages: https://gilwildox.github.io/CueForge/
  base: '/CueForge/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate', // actualiza el service worker sin pedir confirmación al usuario
      includeAssets: ['logo.svg', 'logo-dark-bg.svg', 'logo-icon.svg'], // se precachean para uso offline
      manifest: {
        name: 'CueForge',
        short_name: 'CueForge',
        description: 'CueForge es una PWA para diseñadores de iluminación escénica. Permite gestionar luminarias, cues, bibliotecas de colores, posiciones y gobos, presupuestos y fichas técnicas.',
        lang: 'es',
        theme_color: '#fe6732',
        background_color: '#171717',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})