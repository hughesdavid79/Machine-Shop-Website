const envApiUrl = import.meta.env.VITE_API_URL;
console.log('Environment API URL:', envApiUrl);

const API_BASE_URL = envApiUrl || 'http://localhost:3001/api';
console.log('Final API Base URL:', API_BASE_URL);

export const API_ROUTES = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  INVENTORY: `${API_BASE_URL}/inventory`,
  BARRELS: `${API_BASE_URL}/barrels`,
  ANNOUNCEMENTS: `${API_BASE_URL}/announcements`,
};

console.log('API Routes:', API_ROUTES);

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
}; 