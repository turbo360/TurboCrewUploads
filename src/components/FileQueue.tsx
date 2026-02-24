import { useState } from 'react';
import { useUploadStore } from '../stores/uploadStore';
import VirtualFileList from './VirtualFileList';

export default function FileQueue() {
  const { files, removeFile, retryUpload, pauseUpload, resumeUpload } = useUploadStore();
  const [showAll, setShowAll] = useState(false);

  const activeFiles = files.filter(f => f.status === 'uploading');
  const completedCount = files.filter(f => f.status === 'completed').length;
  const pendingCount = files.filter(f => f.status === 'pending' || f.status === 'paused').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  const displayFiles = showAll ? files : activeFiles;

  return (
    <div className="bg-gray-900/70 backdrop-blur-sm rounded-lg border border-gray-700/50 overflow-hidden">
      {/* Active uploads header */}
      {!showAll && activeFiles.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">Active ({activeFiles.length})</span>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {completedCount > 0 && <span className="text-green-400">Completed: {completedCount}</span>}
              {pendingCount > 0 && <span>Queued: {pendingCount}</span>}
              {errorCount > 0 && <span className="text-red-400">Failed: {errorCount}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Show all header */}
      {showAll && (
        <div className="px-4 py-3 border-b border-gray-700/50">
          <span className="text-sm font-medium text-white">All Files ({files.length})</span>
        </div>
      )}

      {/* File list */}
      {displayFiles.length > 0 && (
        <VirtualFileList
          files={displayFiles}
          onRemove={removeFile}
          onRetry={retryUpload}
          onPause={pauseUpload}
          onResume={resumeUpload}
        />
      )}

      {/* No active files message */}
      {!showAll && activeFiles.length === 0 && files.length > 0 && (
        <div className="px-4 py-4 text-center text-sm text-gray-400">
          No active uploads
        </div>
      )}

      {/* Toggle button */}
      {files.length > activeFiles.length && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full px-4 py-2.5 border-t border-gray-700/50 text-xs text-gray-400 hover:text-white hover:bg-gray-700/30 transition-colors"
        >
          {showAll ? 'Show active only' : `Show all ${files.length} files`}
        </button>
      )}
    </div>
  );
}
