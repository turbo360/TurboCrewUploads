/// <reference types="vite/client" />

interface FileInfo {
  path: string;
  name: string;
  relativePath?: string;
  size: number;
  type: string;
}

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
