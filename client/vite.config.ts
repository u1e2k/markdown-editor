import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Docker対応
    port: 3000,
    watch: {
      usePolling: true, // Dockerでのファイル監視
    },
    proxy: {
      '/api': {
        target: 'http://api:8080', // Dockerネットワーク内のサービス名
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['jade-wasm'],
  },
})
