import { defineConfig } from 'vite'

const backend = 'http://localhost:5037'

// Backend'de CORS yok; geliştirmede /api ve /hubs (WebSocket dahil) backend'e yönlendirilir.
export default defineConfig({
  server: {
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/hubs': { target: backend, changeOrigin: true, ws: true },
    },
  },
})
