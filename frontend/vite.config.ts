import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // @/ apunta a src/ (también configurado en tsconfig.app.json)
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: {
      // En desarrollo, /api se reenvía al backend: mismo origen, sin CORS.
      // Los E2E usan otra API (API_PROXY_TARGET; sin prefijo VITE_, no llega al navegador)
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:8001',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
