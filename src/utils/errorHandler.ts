import { toast } from 'react-toastify';

export const handleError = (error: unknown, context: string) => {
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
  console.error(`Error in ${context}:`, error);
  toast.error(`${context}: ${errorMessage}`);
}; 