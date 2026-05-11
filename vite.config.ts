import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiTarget = env.API_PROXY_TARGET ?? 'http://localhost:4000';
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        // Phase 3: forward /api/* to the Express server (dev:full).
        // When `npm run dev` runs without the server, fetch('/api/health')
        // simply 502s and the adapter probe falls back to LocalAdapter.
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          // ws: NOT enabled — Vite HMR uses its own websocket; do not intercept.
        },
      },
    },
  };
});
