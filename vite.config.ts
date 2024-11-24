import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode, command }) => {
  const isProduction = mode === 'production';
  const apiUrl = isProduction 
    ? 'https://machine-shop-website.onrender.com'
    : 'http://localhost:3001';

  console.log('Vite Config:', {
    mode,
    command,
    isProduction,
    apiUrl
  });

  return {
    plugins: [
      react(),
      {
        name: 'log-config',
        configResolved(config) {
          console.log('Resolved Config:', {
            root: config.root,
            base: config.base,
            mode: config.mode,
            env: config.env
          });
        }
      }
    ],
    base: '/',
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        onwarn(warning, defaultHandler) {
          console.log('Rollup Warning:', warning);
          defaultHandler(warning);
        }
      }
    },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl)
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true
        }
      }
    }
  };
});
