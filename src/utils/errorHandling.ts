export const handleApiError = (error: any) => {
  if (error.response?.status === 401) {
    // Handle unauthorized access
    localStorage.removeItem('token');
    window.location.href = '/login';
    return;
  }

  // Handle other errors
  console.error('API Error:', error);
  return error.response?.data?.error || 'An unexpected error occurred';
}; 