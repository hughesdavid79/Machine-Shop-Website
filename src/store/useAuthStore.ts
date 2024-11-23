import { create } from 'zustand';
import { login as apiLogin } from '../services/api';

interface AuthState {
  user: { username: string; role: string } | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (username: string, password: string) => {
    console.log('Auth store: login attempt', { username });
    try {
      const data = await apiLogin(username, password);
      console.log('Auth store: login successful', data);
      set({ user: data.user, isAuthenticated: true });
      return { success: true };
    } catch (error) {
      console.error('Auth store: login failed', error);
      return { success: false, error: error instanceof Error ? error.message : 'Invalid credentials' };
    }
  },
  logout: () => {
    console.log('Auth store: logging out');
    localStorage.removeItem('token');
    set({ user: null, isAuthenticated: false });
  },
}));