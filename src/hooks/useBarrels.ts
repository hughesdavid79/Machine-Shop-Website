import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getBarrels, toggleBarrel } from '../services/api';

export const useBarrels = () => {
  const queryClient = useQueryClient();

  const { data: barrels = [], isLoading } = useQuery('barrels', getBarrels);

  const toggle = useMutation(toggleBarrel, {
    onSuccess: () => {
      queryClient.invalidateQueries('barrels');
    },
  });

  return {
    barrels,
    isLoading,
    toggle,
  };
};