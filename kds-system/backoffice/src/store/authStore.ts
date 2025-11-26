import { create } from 'zustand';
import { authApi } from '../services/api';

interface User {
  userId: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data } = await authApi.login(email, password);

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });

      return true;
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Error de autenticacion',
        isLoading: false,
      });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({
      user: null,
      isAuthenticated: false,
    });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const { data } = await authApi.me();
      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  setError: (error) => set({ error }),
}));
