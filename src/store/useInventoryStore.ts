import { create } from 'zustand';
import { getInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } from '../services/api';

interface InventoryStore {
  items: any[];
  isLoading: boolean;
  error: string | null;
  fetchInventory: () => Promise<void>;
  addItem: (item: any) => Promise<void>;
  updateItem: (id: number, updates: any) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  fetchInventory: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getInventory();
      set({ items: data, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch inventory', isLoading: false });
    }
  },
  addItem: async (item) => {
    try {
      const newItem = await addInventoryItem(item);
      set(state => ({ items: [...state.items, newItem] }));
    } catch (error) {
      console.error('Failed to add item:', error);
      throw error;
    }
  },
  updateItem: async (id, updates) => {
    try {
      const updatedItem = await updateInventoryItem(id, updates);
      set(state => ({
        items: state.items.map(item => 
          item.id === id ? updatedItem : item
        ),
      }));
      return updatedItem;
    } catch (error) {
      console.error('Failed to update item:', error);
      throw error;
    }
  },
  deleteItem: async (id) => {
    try {
      await deleteInventoryItem(id);
      set(state => ({
        items: state.items.filter(item => item.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete item:', error);
      throw error;
    }
  },
})); 