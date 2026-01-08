import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, reportSessionStart, reportSessionEnd } from '../utils/api';
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
          const response = await api.post('/api/session/create', { projectName, crewName, notes }, token!);
          const sessionData = {
            id: response.session.id,
            projectName: response.session.projectName,
            crewName: response.session.crewName,
            notes
          };
          set({
            session: sessionData,
            isLoading: false
          });

          // Report session start to backend for live monitoring
          console.log('[Session] About to report session start:', sessionData.id);
          reportSessionStart({
            session_id: sessionData.id,
            project_name: sessionData.projectName,
            crew_name: sessionData.crewName
          }).then(result => {
            console.log('[Session] Session start reported, result:', result);
          }).catch(err => {
            console.error('[Session] Failed to report session start:', err);
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

      clearSession: () => {
        const currentSession = useSessionStore.getState().session;
        if (currentSession) {
          // Report session end to backend for live monitoring
          reportSessionEnd(currentSession.id);
        }
        set({ session: null });
      },
      clearError: () => set({ error: null })
    }),
    {
      name: 'crew-upload-session',
      partialize: (state) => ({ session: state.session })
    }
  )
);
