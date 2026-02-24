import { useUploadStore } from '../stores/uploadStore';

export default function UploadControls() {
  const { files, isUploading, startAllUploads, pauseAllUploads, retryAllFailed } = useUploadStore();

  const pendingCount = files.filter(f => f.status === 'pending' || f.status === 'paused').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Start / Pause */}
      {isUploading ? (
        <button
          onClick={pauseAllUploads}
          className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
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
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {pendingCount > 0 ? `Upload All (${pendingCount})` : 'Start Upload'}
        </button>
      )}

      {/* Retry Failed */}
      {errorCount > 0 && (
        <button
          onClick={retryAllFailed}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg font-medium transition-colors text-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Retry Failed ({errorCount})
        </button>
      )}

      <div className="flex-1" />

      {/* Add More Files */}
      <button
        onClick={async () => {
          try {
            const selectedFiles = await window.electronAPI.selectFiles();
            if (selectedFiles.length > 0) {
              useUploadStore.getState().addFiles(selectedFiles);
            }
          } catch (error) {
            console.error('Failed to select files:', error);
          }
        }}
        className="px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors text-sm flex items-center gap-1.5"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add More Files
      </button>
    </div>
  );
}
