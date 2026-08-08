import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Enables `@/components/ui/...` imports (shadcn/ui convention)
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Forward all /api/* requests to Flask backend in dev mode.
      // This avoids CORS entirely during local development.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})

