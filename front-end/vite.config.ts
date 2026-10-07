import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// API target for dev proxy.
//
// This must be the nginx gateway (port 5173), NOT the php-fpm port 9000.
// Port 9000 speaks FastCGI, a binary protocol, so an HTTP proxy cannot
// forward to it — nginx is what translates HTTP into FastCGI via
// `fastcgi_pass api:9000` in test/nginx.conf. Pointing Vite at 9000
// directly fails with an empty reply.
const API_TARGET = process.env.VITE_API_TARGET || 'http://127.0.0.1:5173'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    // Tailwind از طریق افزونه‌ی @tailwindcss/vite اعمال می‌شود نه PostCSS؛
    // بدون این خط، Vite بالا به پوشه‌های والد می‌گردد و به package.json
    // خالیِ کنار ریپو می‌خورد و build با «Unexpected end of JSON input» می‌شکند.
    postcss: {},
  },
  server: {
    port: Number(process.env.PORT) || 5174,
    strictPort: true,
    open: false,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@tanstack/react-query')) return 'vendor-query'
            if (id.includes('react-router')) return 'vendor-router'
            if (id.includes('lucide-react')) return 'vendor-icons'
            if (id.includes('@radix-ui')) return 'vendor-radix'
            return 'vendor'
          }
          return undefined
        },
      },
    },
  },
})
