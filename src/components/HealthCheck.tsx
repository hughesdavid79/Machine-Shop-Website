import { useQuery } from '@tanstack/react-query';
import { API_ROUTES, fetchWithError } from '../config/api';

export function HealthCheck() {
  const { data, error } = useQuery({
    queryKey: ['health'],
    queryFn: () => fetchWithError(`${API_ROUTES.BASE}/health`, { method: 'GET' }),
    retry: 3
  });

  if (error) {
    console.error('Health check failed:', error);
    return null;
  }

  return null; // Silent health check
} 