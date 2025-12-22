import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectFiles: () => ipcRenderer.invoke('select-files'),
  selectFolders: () => ipcRenderer.invoke('select-folders'),
  getFileBuffer: (filePath: string) => ipcRenderer.invoke('get-file-buffer', filePath),
  getFileStreamChunk: (filePath: string, start: number, end: number) =>
    ipcRenderer.invoke('get-file-stream-chunk', filePath, start, end),
  getFileSize: (filePath: string) => ipcRenderer.invoke('get-file-size', filePath),
  platform: process.platform,
});

// Types for the exposed API
declare global {
  interface Window {
    electronAPI: {
      selectFiles: () => Promise<FileInfo[]>;
      selectFolders: () => Promise<FileInfo[]>;
      getFileBuffer: (filePath: string) => Promise<Buffer>;
      getFileStreamChunk: (filePath: string, start: number, end: number) => Promise<Buffer>;
      getFileSize: (filePath: string) => Promise<number>;
      platform: string;
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
