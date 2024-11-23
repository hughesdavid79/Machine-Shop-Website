import { create } from 'zustand';
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../services/api';

interface AnnouncementsStore {
  announcements: any[];
  isLoading: boolean;
  error: string | null;
  fetchAnnouncements: () => Promise<void>;
  addAnnouncement: (data: any) => Promise<void>;
  updateAnnouncement: (id: number, data: any) => Promise<void>;
  deleteAnnouncement: (id: number) => Promise<void>;
}

export const useAnnouncementsStore = create<AnnouncementsStore>((set) => ({
  announcements: [],
  isLoading: false,
  error: null,
  fetchAnnouncements: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getAnnouncements();
      set({ announcements: data, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch announcements', isLoading: false });
    }
  },
  addAnnouncement: async (data) => {
    try {
      await createAnnouncement(data);
      const announcements = await getAnnouncements();
      set({ announcements });
    } catch (error) {
      console.error('Failed to add announcement:', error);
      throw error;
    }
  },
  updateAnnouncement: async (id, data) => {
    try {
      await updateAnnouncement(id, data);
      const announcements = await getAnnouncements();
      set({ announcements });
    } catch (error) {
      console.error('Failed to update announcement:', error);
      throw error;
    }
  },
  deleteAnnouncement: async (id) => {
    try {
      await deleteAnnouncement(id);
      const announcements = await getAnnouncements();
      set({ announcements });
    } catch (error) {
      console.error('Failed to delete announcement:', error);
      throw error;
    }
  },
})); 