import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss()
  ],
  server: {
    proxy: {
      // send /api/hello → http://localhost:3001/api/hello
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      "/health": {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      "/status": {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      "/debug": {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      "/test-chrome": {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      "/audit": {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      "/lighthouse": {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
