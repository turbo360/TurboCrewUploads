import { useUploadStore } from '../stores/uploadStore';

export default function UploadControls() {
  const { files, isUploading, startAllUploads, pauseAllUploads, clearCompleted, clearAll, retryAllFailed } = useUploadStore();

  const pendingCount = files.filter(f => f.status === 'pending' || f.status === 'paused').length;
  const uploadingCount = files.filter(f => f.status === 'uploading').length;
  const completedCount = files.filter(f => f.status === 'completed').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <div className="flex items-center justify-between gap-4 bg-gray-800 rounded-lg p-4">
      {/* Status Summary */}
      <div className="flex items-center gap-4 text-sm">
        {pendingCount > 0 && (
          <span className="text-gray-400">
            <span className="font-medium text-white">{pendingCount}</span> pending
          </span>
        )}
        {uploadingCount > 0 && (
          <span className="text-orange-400">
            <span className="font-medium">{uploadingCount}</span> uploading
          </span>
        )}
        {completedCount > 0 && (
          <span className="text-green-400">
            <span className="font-medium">{completedCount}</span> completed
          </span>
        )}
        {errorCount > 0 && (
          <span className="text-red-400">
            <span className="font-medium">{errorCount}</span> failed
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {errorCount > 0 && (
          <button
            onClick={retryAllFailed}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry All Failed
          </button>
        )}

        {completedCount > 0 && (
          <button
            onClick={clearCompleted}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear Completed
          </button>
        )}

        <button
          onClick={clearAll}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-red-400 transition-colors"
        >
          Clear All
        </button>

        {isUploading ? (
          <button
            onClick={pauseAllUploads}
            className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
            </svg>
            Pause All
          </button>
        ) : (
          <button
            onClick={startAllUploads}
            disabled={pendingCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Start Upload
          </button>
        )}
      </div>
    </div>
  );
}
