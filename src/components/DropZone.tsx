import { useState, useCallback } from 'react';
import { useUploadStore } from '../stores/uploadStore';

export default function DropZone() {
  const [isDragOver, setIsDragOver] = useState(false);
  const { addFiles } = useUploadStore();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // In Electron, e.dataTransfer.files contains File objects with .path property
    const droppedFiles = e.dataTransfer.files;
    const files: FileInfo[] = [];

    for (let i = 0; i < droppedFiles.length; i++) {
      const file = droppedFiles[i] as File & { path?: string };
      const filePath = file.path;

      if (!filePath) {
        console.warn('No path for dropped file:', file.name);
        continue;
      }

      files.push({
        path: filePath,
        name: file.name,
        relativePath: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream'
      });
    }

    if (files.length > 0) {
      addFiles(files);
    }
  }, [addFiles]);

  const handleSelectFiles = async () => {
    try {
      const files = await window.electronAPI.selectFiles();
      if (files.length > 0) {
        addFiles(files);
      }
    } catch (error) {
      console.error('Failed to select files:', error);
    }
  };

  const handleSelectFolders = async () => {
    try {
      const files = await window.electronAPI.selectFolders();
      if (files.length > 0) {
        addFiles(files);
      }
    } catch (error) {
      console.error('Failed to select folders:', error);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative rounded-xl border-2 border-dashed transition-all duration-200
        ${isDragOver
          ? 'border-orange-500 bg-orange-500/10'
          : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
        }
      `}
    >
      <div className="p-8 text-center">
        <svg
          className={`mx-auto h-12 w-12 transition-colors ${isDragOver ? 'text-orange-500' : 'text-gray-500'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>

        <h3 className="mt-4 text-lg font-medium text-white">
          {isDragOver ? 'Drop files here' : 'Drag and drop files or folders'}
        </h3>

        <p className="mt-2 text-sm text-gray-400">
          or use the buttons below to select them
        </p>

        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={handleSelectFiles}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Select Files
          </button>

          <button
            onClick={handleSelectFolders}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Select Folder
          </button>
        </div>
      </div>
    </div>
  );
}
