import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../utils/api';
import { useAuthStore } from './authStore';

interface Session {
  id: string;
  projectName: string;
  crewName: string;
  notes?: string;
}

interface SessionState {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  createSession: (projectName: string, crewName: string, notes?: string) => Promise<boolean>;
  clearSession: () => void;
  clearError: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      isLoading: false,
      error: null,

      createSession: async (projectName: string, crewName: string, notes?: string) => {
        set({ isLoading: true, error: null });
        try {
          const token = useAuthStore.getState().token;
          const response = await api.post('/api/session', { projectName, crewName, notes }, token!);
          set({
            session: {
              id: response.sessionId,
              projectName,
              crewName,
              notes
            },
            isLoading: false
          });
          return true;
        } catch (error: any) {
          set({
            error: error.message || 'Failed to create session',
            isLoading: false
          });
          return false;
        }
      },

      clearSession: () => set({ session: null }),
      clearError: () => set({ error: null })
    }),
    {
      name: 'crew-upload-session',
      partialize: (state) => ({ session: state.session })
    }
  )
);
