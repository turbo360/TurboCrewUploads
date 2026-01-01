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
    onTokenExpired: (callback: () => void) => () => void;
    sendCompletionEmail: (params: { projectName: string; crewName: string; fileCount: number; totalSize: string }) => Promise<{ success: boolean }>;
  };
}
