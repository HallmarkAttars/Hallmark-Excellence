import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React + router in one stable vendor chunk — cached once, shared by
          // every route-level chunk (pages are code-split via React.lazy).
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
