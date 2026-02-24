import { useState, useCallback } from 'react';
import { useUploadStore } from '../stores/uploadStore';

interface DropZoneProps {
  batchNumber?: number;
  hasCompletedBatches?: boolean;
}

export default function DropZone({ batchNumber = 1, hasCompletedBatches = false }: DropZoneProps) {
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

    const droppedFiles = e.dataTransfer.files;
    const files: FileInfo[] = [];

    for (let i = 0; i < droppedFiles.length; i++) {
      const file = droppedFiles[i] as File & { path?: string };
      const filePath = file.path;

      if (!filePath) {
        console.warn('No path for dropped file:', file.name);
        continue;
      }

      try {
        const expandedFiles = await window.electronAPI.expandPath(filePath);
        files.push(...expandedFiles);
      } catch (error) {
        console.error('Failed to expand path:', filePath, error);
      }
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

  const headingText = isDragOver
    ? 'Drop files here'
    : hasCompletedBatches
      ? 'Ready for more files?'
      : 'Drag and drop files or folders';

  const subText = isDragOver
    ? ''
    : hasCompletedBatches
      ? `Drag and drop to start Batch ${batchNumber}`
      : 'or use the buttons below to select them';

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative rounded-xl border-2 border-dashed transition-all duration-200 backdrop-blur-sm
        ${isDragOver
          ? 'border-orange-500 bg-orange-500/20'
          : 'border-gray-600 hover:border-gray-500 bg-gray-900/70'
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
          {headingText}
        </h3>

        {subText && (
          <p className="mt-2 text-sm text-gray-400">
            {subText}
          </p>
        )}

        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={handleSelectFiles}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Select Files
          </button>

          <button
            onClick={handleSelectFolders}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Select Folder
          </button>
        </div>
      </div>
    </div>
  );
}
