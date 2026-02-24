import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../utils/api';

interface AuthState {
  token: string | null;
  userName: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (name: string, email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  handleTokenExpired: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      userName: null,
      userEmail: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (name: string, email: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/api/auth/login', { name, email });
          const { token } = response;
          set({
            token,
            userName: name.trim(),
            userEmail: email.trim().toLowerCase(),
            isAuthenticated: true,
            isLoading: false
          });
          return true;
        } catch (error: any) {
          set({
            error: error.message || 'Login failed',
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
        set({ token: null, userName: null, userEmail: null, isAuthenticated: false });
      },

      clearError: () => set({ error: null }),

      handleTokenExpired: () => {
        set({ token: null, userName: null, userEmail: null, isAuthenticated: false, error: 'Session expired. Please log in again.' });
        localStorage.removeItem('crew-upload-session');
      }
    }),
    {
      name: 'crew-upload-auth',
      partialize: (state) => ({
        token: state.token,
        userName: state.userName,
        userEmail: state.userEmail,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

// Set up token expiration listener for Electron
if (typeof window !== 'undefined' && window.electronAPI) {
  window.electronAPI.onTokenExpired(() => {
    useAuthStore.getState().handleTokenExpired();
  });
}
