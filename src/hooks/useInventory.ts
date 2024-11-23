import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getInventory, addInventoryItem } from '../services/api';

export const useInventory = () => {
  const queryClient = useQueryClient();

  const { data: inventory = [], isLoading } = useQuery('inventory', getInventory);

  const addItem = useMutation(addInventoryItem, {
    onSuccess: () => {
      queryClient.invalidateQueries('inventory');
    },
  });

  return {
    inventory,
    isLoading,
    addItem,
  };
};