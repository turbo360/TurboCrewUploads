import { useUploadStore } from '../stores/uploadStore';
import DropZone from '../components/DropZone';
import FileQueue from '../components/FileQueue';
import UploadControls from '../components/UploadControls';
import UploadStats from '../components/UploadStats';

export default function UploadPage() {
  const { files } = useUploadStore();

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <DropZone />

      {/* Stats */}
      {files.length > 0 && <UploadStats />}

      {/* Controls */}
      {files.length > 0 && <UploadControls />}

      {/* File Queue */}
      {files.length > 0 && <FileQueue />}

      {/* Empty State */}
      {files.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-16 w-16 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-300">No files yet</h3>
          <p className="mt-2 text-gray-500">
            Drag and drop files or folders above, or use the buttons to select them.
          </p>
        </div>
      )}
    </div>
  );
}
