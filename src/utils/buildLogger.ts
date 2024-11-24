export const logBuildInfo = () => {
  console.log('Build Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    VITE_API_URL: import.meta.env.VITE_API_URL,
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD
  });
}; 