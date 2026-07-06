import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // Muestra un prompt cuando hay actualización
      devOptions: {
        enabled: false // Deshabilita en localhost para evitar dolores de cabeza
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: 'Unifai ERP',
        short_name: 'Unifai',
        description: 'Plataforma de gestión ERP SaaS',
        theme_color: '#050505',
        icons: [
          {
            src: 'favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon'
          }
        ]
      }
    })
  ],
  server: { proxy: { '/api': 'http://localhost:3001' } }
})
