const isDevelopment = import.meta.env.MODE === 'development';
console.log('Current environment:', import.meta.env.MODE);

const API_BASE_URL = isDevelopment
  ? 'http://localhost:3001/api'
  : 'https://machine-shop-website.onrender.com/api';

console.log('Using API URL:', API_BASE_URL);

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