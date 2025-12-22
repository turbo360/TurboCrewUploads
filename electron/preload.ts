import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectFiles: () => ipcRenderer.invoke('select-files'),
  selectFolders: () => ipcRenderer.invoke('select-folders'),
  getFileSize: (filePath: string) => ipcRenderer.invoke('get-file-size', filePath),
  platform: process.platform,

  // Native upload API - uploads happen in main process (fast!)
  startUpload: (params: {
    uploadId: string;
    filePath: string;
    endpoint: string;
    metadata: Record<string, string>;
    token: string;
  }) => ipcRenderer.invoke('start-upload', params),

  pauseUpload: (uploadId: string) => ipcRenderer.invoke('pause-upload', uploadId),

  resumeUpload: (params: {
    uploadId: string;
    filePath: string;
    endpoint: string;
    metadata: Record<string, string>;
    token: string;
  }) => ipcRenderer.invoke('resume-upload', params),

  abortUpload: (uploadId: string) => ipcRenderer.invoke('abort-upload', uploadId),

  // Event listeners for upload progress
  onUploadProgress: (callback: (data: { uploadId: string; bytesUploaded: number; bytesTotal: number }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('upload-progress', handler);
    return () => ipcRenderer.removeListener('upload-progress', handler);
  },

  onUploadComplete: (callback: (data: { uploadId: string }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('upload-complete', handler);
    return () => ipcRenderer.removeListener('upload-complete', handler);
  },

  onUploadError: (callback: (data: { uploadId: string; error: string }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('upload-error', handler);
    return () => ipcRenderer.removeListener('upload-error', handler);
  },
});

// Types for the exposed API
declare global {
  interface Window {
    electronAPI: {
      selectFiles: () => Promise<FileInfo[]>;
      selectFolders: () => Promise<FileInfo[]>;
      getFileSize: (filePath: string) => Promise<number>;
      platform: string;

      startUpload: (params: {
        uploadId: string;
        filePath: string;
        endpoint: string;
        metadata: Record<string, string>;
        token: string;
      }) => Promise<{ success: boolean }>;

      pauseUpload: (uploadId: string) => Promise<{ success: boolean }>;

      resumeUpload: (params: {
        uploadId: string;
        filePath: string;
        endpoint: string;
        metadata: Record<string, string>;
        token: string;
      }) => Promise<{ success: boolean }>;

      abortUpload: (uploadId: string) => Promise<{ success: boolean }>;

      onUploadProgress: (callback: (data: { uploadId: string; bytesUploaded: number; bytesTotal: number }) => void) => () => void;
      onUploadComplete: (callback: (data: { uploadId: string }) => void) => () => void;
      onUploadError: (callback: (data: { uploadId: string; error: string }) => void) => () => void;
    };
  }
}

interface FileInfo {
  path: string;
  name: string;
  relativePath?: string;
  size: number;
  type: string;
}
