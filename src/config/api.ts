const API_BASE_URL = import.meta.env.PROD
  ? 'https://machine-shop-website.onrender.com'
  : 'http://localhost:3001';

export const API_ROUTES = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  INVENTORY: `${API_BASE_URL}/inventory`,
  BARRELS: `${API_BASE_URL}/barrels`,
  ANNOUNCEMENTS: `${API_BASE_URL}/announcements`,
};

console.log('API Routes:', API_ROUTES);

export const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Origin': window.location.origin
});

// Add error handling wrapper
export const fetchWithError = async (url: string, options: RequestInit) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Network response was not ok');
    }

    return response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}; 