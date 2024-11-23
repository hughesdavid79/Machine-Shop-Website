import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement } from '../services/api';

export const useAnnouncements = () => {
  const queryClient = useQueryClient();

  const { data: announcements = [], isLoading } = useQuery('announcements', getAnnouncements);

  const addMutation = useMutation(addAnnouncement, {
    onSuccess: () => {
      queryClient.invalidateQueries('announcements');
    },
  });

  const updateMutation = useMutation(updateAnnouncement, {
    onSuccess: () => {
      queryClient.invalidateQueries('announcements');
    },
  });

  const deleteMutation = useMutation(deleteAnnouncement, {
    onSuccess: () => {
      queryClient.invalidateQueries('announcements');
    },
  });

  return {
    announcements,
    isLoading,
    addAnnouncement: addMutation.mutateAsync,
    updateAnnouncement: updateMutation.mutateAsync,
    deleteAnnouncement: deleteMutation.mutateAsync,
  };
};