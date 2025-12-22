import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../utils/api';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/api/auth/login', { password });
          const { token } = response;
          set({ token, isAuthenticated: true, isLoading: false });
          return true;
        } catch (error: any) {
          set({
            error: error.message || 'Invalid password',
            isLoading: false
          });
          return false;
        }
      },

      logout: async () => {
        const { token } = get();
        if (token) {
          try {
            await api.post('/api/auth/logout', {}, token);
          } catch {
            // Ignore logout errors
          }
        }
        set({ token: null, isAuthenticated: false });
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'crew-upload-auth',
      partialize: (state) => ({ token: state.token, isAuthenticated: state.isAuthenticated })
    }
  )
);
