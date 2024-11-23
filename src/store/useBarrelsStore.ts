import { create } from 'zustand';
import { getBarrels, updateBarrel } from '../services/api';

interface Barrel {
  id: number;
  type: string;
  color: string;
  filled: boolean;
}

interface BarrelType {
  id: string;
  type: string;
  color: string;
  threshold: number;
  decrementOnFill: boolean;
  barrels: Barrel[];
}

interface BarrelsStore {
  barrels: BarrelType[];
  isLoading: boolean;
  error: string | null;
  fetchBarrels: () => Promise<void>;
  updateBarrel: (id: number, updates: any) => Promise<void>;
}

export const useBarrelsStore = create<BarrelsStore>((set) => ({
  barrels: [],
  isLoading: false,
  error: null,
  fetchBarrels: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getBarrels();
      set({ barrels: data || [], isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch barrels', isLoading: false });
    }
  },
  updateBarrel: async (id, updates) => {
    try {
      await updateBarrel(id, updates);
      const data = await getBarrels();
      set({ barrels: data });
    } catch (error) {
      console.error('Failed to update barrel:', error);
      throw error;
    }
  },
})); 