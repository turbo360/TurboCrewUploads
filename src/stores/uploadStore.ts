import { create } from 'zustand';
import * as tus from 'tus-js-client';
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
  upload?: tus.Upload;
  uploadedBytes: number;
  startTime?: number;
  speed?: number;
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
}

const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks

// Custom file reader for Electron that reads from disk
class ElectronFileReader {
  private filePath: string;
  private fileSize: number;

  constructor(filePath: string, fileSize: number) {
    this.filePath = filePath;
    this.fileSize = fileSize;
  }

  get size() {
    return this.fileSize;
  }

  async slice(start: number, end: number): Promise<Blob> {
    const chunk = await window.electronAPI.getFileStreamChunk(this.filePath, start, end);
    // Convert Buffer to Uint8Array for Blob compatibility
    const uint8Array = new Uint8Array(chunk);
    return new Blob([uint8Array]);
  }
}

export const useUploadStore = create<UploadState>((set, get) => ({
  files: [],
  isUploading: false,

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
    if (file?.upload) {
      file.upload.abort();
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

    const fileReader = new ElectronFileReader(file.path, file.size);

    const upload = new tus.Upload(fileReader as any, {
      endpoint: `${API_BASE_URL}/files`,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      chunkSize: CHUNK_SIZE,
      metadata: {
        filename: file.relativePath || file.name,
        filetype: file.type,
        sessionId: session.id,
        projectName: session.projectName,
        crewName: session.crewName
      },
      headers: {
        Authorization: `Bearer ${token}`
      },
      onProgress: (bytesUploaded: number, bytesTotal: number) => {
        const progress = Math.round((bytesUploaded / bytesTotal) * 100);
        const currentFile = get().files.find(f => f.id === id);
        const elapsed = (Date.now() - (currentFile?.startTime || Date.now())) / 1000;
        const speed = elapsed > 0 ? bytesUploaded / elapsed : 0;

        set(state => ({
          files: state.files.map(f =>
            f.id === id ? { ...f, progress, uploadedBytes: bytesUploaded, speed } : f
          )
        }));
      },
      onSuccess: () => {
        set(state => ({
          files: state.files.map(f =>
            f.id === id ? { ...f, status: 'completed', progress: 100 } : f
          )
        }));
        // Start next pending upload
        const nextFile = get().files.find(f => f.status === 'pending');
        if (nextFile) {
          get().startUpload(nextFile.id);
        } else {
          set({ isUploading: get().files.some(f => f.status === 'uploading') });
        }
      },
      onError: (error: Error) => {
        set(state => ({
          files: state.files.map(f =>
            f.id === id ? { ...f, status: 'error', error: error.message } : f
          ),
          isUploading: get().files.some(f => f.status === 'uploading')
        }));
      }
    });

    set(state => ({
      files: state.files.map(f =>
        f.id === id ? { ...f, upload } : f
      )
    }));

    upload.start();
  },

  pauseUpload: (id: string) => {
    const file = get().files.find(f => f.id === id);
    if (file?.upload) {
      file.upload.abort();
      set(state => ({
        files: state.files.map(f =>
          f.id === id ? { ...f, status: 'paused' } : f
        ),
        isUploading: get().files.some(f => f.status === 'uploading')
      }));
    }
  },

  resumeUpload: (id: string) => {
    get().startUpload(id);
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

    // Start up to 2 concurrent uploads
    const toStart = pendingFiles.slice(0, 2);
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
    get().files.forEach(f => {
      if (f.upload) {
        f.upload.abort();
      }
    });
    set({ files: [], isUploading: false });
  }
}));
