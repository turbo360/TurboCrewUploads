import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { useSessionStore } from './sessionStore';
import { API_BASE_URL } from '../utils/api';

export interface UploadFile {
  id: string;
  path: string;
  name: string;
  relativePath?: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'paused';
  error?: string;
  uploadedBytes: number;
  startTime?: number;
  speed?: number; // Average speed
  instantSpeed?: number; // Current/instant speed (last update)
  lastUpdateTime?: number;
  lastUpdateBytes?: number;
}

interface UploadState {
  files: UploadFile[];
  isUploading: boolean;
  addFiles: (files: FileInfo[]) => void;
  removeFile: (id: string) => void;
  startUpload: (id: string) => void;
  pauseUpload: (id: string) => void;
  resumeUpload: (id: string) => void;
  retryUpload: (id: string) => void;
  startAllUploads: () => void;
  pauseAllUploads: () => void;
  clearCompleted: () => void;
  clearAll: () => void;
  handleProgress: (uploadId: string, bytesUploaded: number, bytesTotal: number) => void;
  handleComplete: (uploadId: string) => void;
  handleError: (uploadId: string, error: string) => void;
}

// Initialize event listeners once
let listenersInitialized = false;

export const useUploadStore = create<UploadState>((set, get) => {
  // Set up IPC event listeners when store is created
  if (!listenersInitialized && window.electronAPI) {
    listenersInitialized = true;

    window.electronAPI.onUploadProgress((data) => {
      get().handleProgress(data.uploadId, data.bytesUploaded, data.bytesTotal);
    });

    window.electronAPI.onUploadComplete((data) => {
      get().handleComplete(data.uploadId);
    });

    window.electronAPI.onUploadError((data) => {
      get().handleError(data.uploadId, data.error);
    });
  }

  return {
    files: [],
    isUploading: false,

    handleProgress: (uploadId: string, bytesUploaded: number, bytesTotal: number) => {
      const progress = Math.round((bytesUploaded / bytesTotal) * 100);
      const file = get().files.find(f => f.id === uploadId);
      const now = Date.now();

      // Calculate average speed
      const elapsed = (now - (file?.startTime || now)) / 1000;
      const avgSpeed = elapsed > 0 ? bytesUploaded / elapsed : 0;

      // Calculate instant speed (bytes transferred since last update)
      let instantSpeed = file?.instantSpeed || 0;
      if (file?.lastUpdateTime && file?.lastUpdateBytes !== undefined) {
        const timeDelta = (now - file.lastUpdateTime) / 1000;
        if (timeDelta > 0.1) { // At least 100ms between updates to avoid spikes
          const bytesDelta = bytesUploaded - file.lastUpdateBytes;
          instantSpeed = bytesDelta / timeDelta;
        }
      }

      set(state => ({
        files: state.files.map(f =>
          f.id === uploadId ? {
            ...f,
            progress,
            uploadedBytes: bytesUploaded,
            speed: avgSpeed,
            instantSpeed,
            lastUpdateTime: now,
            lastUpdateBytes: bytesUploaded
          } : f
        )
      }));
    },

    handleComplete: (uploadId: string) => {
      set(state => ({
        files: state.files.map(f =>
          f.id === uploadId ? { ...f, status: 'completed', progress: 100 } : f
        )
      }));

      // Start next pending uploads to maintain 8 concurrent uploads for maximum NAS throughput
      const files = get().files;
      const activeUploads = files.filter(f => f.status === 'uploading').length;
      const pendingFiles = files.filter(f => f.status === 'pending');
      const slotsAvailable = Math.max(0, 8 - activeUploads);

      pendingFiles.slice(0, slotsAvailable).forEach(f => get().startUpload(f.id));

      if (pendingFiles.length === 0 && activeUploads === 0) {
        set({ isUploading: false });
      }
    },

    handleError: (uploadId: string, error: string) => {
      set(state => ({
        files: state.files.map(f =>
          f.id === uploadId ? { ...f, status: 'error', error } : f
        ),
        isUploading: get().files.some(f => f.status === 'uploading')
      }));
    },

    addFiles: (newFiles: FileInfo[]) => {
      const existingPaths = new Set(get().files.map(f => f.path));
      const filesToAdd = newFiles
        .filter(f => !existingPaths.has(f.path))
        .map(f => ({
          id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          path: f.path,
          name: f.name,
          relativePath: f.relativePath,
          size: f.size,
          type: f.type,
          progress: 0,
          status: 'pending' as const,
          uploadedBytes: 0
        }));

      set(state => ({
        files: [...state.files, ...filesToAdd]
      }));
    },

    removeFile: (id: string) => {
      const file = get().files.find(f => f.id === id);
      if (file?.status === 'uploading') {
        window.electronAPI.abortUpload(id);
      }
      set(state => ({
        files: state.files.filter(f => f.id !== id)
      }));
    },

    startUpload: async (id: string) => {
      const state = get();
      const file = state.files.find(f => f.id === id);
      if (!file || file.status === 'uploading') return;

      const token = useAuthStore.getState().token;
      const session = useSessionStore.getState().session;

      if (!token || !session) return;

      set(state => ({
        files: state.files.map(f =>
          f.id === id ? { ...f, status: 'uploading', startTime: Date.now() } : f
        ),
        isUploading: true
      }));

      // Start upload in main process
      await window.electronAPI.startUpload({
        uploadId: id,
        filePath: file.path,
        endpoint: `${API_BASE_URL}/files`,
        metadata: {
          filename: file.relativePath || file.name,
          filetype: file.type,
          sessionId: session.id,
          projectName: session.projectName,
          crewName: session.crewName
        },
        token
      });
    },

    pauseUpload: (id: string) => {
      window.electronAPI.pauseUpload(id);
      set(state => ({
        files: state.files.map(f =>
          f.id === id ? { ...f, status: 'paused' } : f
        ),
        isUploading: get().files.some(f => f.status === 'uploading')
      }));
    },

    resumeUpload: async (id: string) => {
      const file = get().files.find(f => f.id === id);
      if (!file) return;

      const token = useAuthStore.getState().token;
      const session = useSessionStore.getState().session;
      if (!token || !session) return;

      set(state => ({
        files: state.files.map(f =>
          f.id === id ? { ...f, status: 'uploading' } : f
        ),
        isUploading: true
      }));

      await window.electronAPI.resumeUpload({
        uploadId: id,
        filePath: file.path,
        endpoint: `${API_BASE_URL}/files`,
        metadata: {
          filename: file.relativePath || file.name,
          filetype: file.type,
          sessionId: session.id,
          projectName: session.projectName,
          crewName: session.crewName
        },
        token
      });
    },

    retryUpload: (id: string) => {
      set(state => ({
        files: state.files.map(f =>
          f.id === id ? { ...f, status: 'pending', progress: 0, error: undefined, uploadedBytes: 0 } : f
        )
      }));
      get().startUpload(id);
    },

    startAllUploads: () => {
      const files = get().files;
      const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'paused');
      const activeUploads = files.filter(f => f.status === 'uploading').length;

      // Start up to 8 concurrent uploads for maximum throughput
      const slotsAvailable = Math.max(0, 8 - activeUploads);
      const toStart = pendingFiles.slice(0, slotsAvailable);
      toStart.forEach(f => get().startUpload(f.id));
    },

    pauseAllUploads: () => {
      get().files
        .filter(f => f.status === 'uploading')
        .forEach(f => get().pauseUpload(f.id));
    },

    clearCompleted: () => {
      set(state => ({
        files: state.files.filter(f => f.status !== 'completed')
      }));
    },

    clearAll: () => {
      // Abort all active uploads
      get().files.forEach(f => {
        if (f.status === 'uploading') {
          window.electronAPI.abortUpload(f.id);
        }
      });
      set({ files: [], isUploading: false });
    }
  };
});
