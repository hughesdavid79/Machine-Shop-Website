import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [react()],
    base: isProduction ? 'https://rpomachineshop.com/' : '/',
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    },
    define: {
      'process.env.VITE_API_URL': JSON.stringify(
        isProduction 
          ? 'https://machine-shop-website.onrender.com/api'
          : 'http://localhost:3001/api'
      )
    }
  };
});
