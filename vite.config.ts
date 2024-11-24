import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  console.log(`Running in ${mode} mode`);
  
  return {
    plugins: [react()],
    base: isProduction ? 'https://rpomachineshop.com/' : '/',
    build: {
      outDir: 'dist',
      sourcemap: true
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true
        }
      }
    }
  };
});
