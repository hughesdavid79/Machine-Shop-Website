import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    base: '/',
    build: {
      outDir: 'dist',
      sourcemap: true
    },
    define: {
      'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL)
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true
        }
      }
    }
  };
});
