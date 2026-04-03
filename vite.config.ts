import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  appType: 'spa', // Serve index.html for direct URLs like /reset-password?token=...
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5174, // 5173 used by EDB Postgres; email links use FrontendBaseUrl in appsettings
    strictPort: false,
    // localhost + Cloudflare Quick Tunnel (*.trycloudflare.com) for demos without DNS
    allowedHosts: ['localhost', '.trycloudflare.com', '.ngrok-free.app'],
    // Proxy /api and /health to backend
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5261',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[Vite Proxy] Error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[Vite Proxy]', req.method, req.url, '->', proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[Vite Proxy]', proxyRes.statusCode, req.url);
          });
        },
      },
      '/health': {
        target: 'http://127.0.0.1:5261',
        changeOrigin: true,
        secure: false,
      },
      '/hubs': {
        target: 'http://127.0.0.1:5261',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})



