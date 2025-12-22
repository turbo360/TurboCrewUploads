import { useUploadStore, UploadFile } from '../stores/uploadStore';
import { formatFileSize, formatSpeed, formatTime } from '../utils/format';

export default function FileQueue() {
  const { files } = useUploadStore();

  // Group files by folder
  const groupedFiles = files.reduce((acc, file) => {
    const folder = file.relativePath
      ? file.relativePath.split('/').slice(0, -1).join('/') || 'Root'
      : 'Individual Files';

    if (!acc[folder]) {
      acc[folder] = [];
    }
    acc[folder].push(file);
    return acc;
  }, {} as Record<string, UploadFile[]>);

  return (
    <div className="space-y-4">
      {Object.entries(groupedFiles).map(([folder, folderFiles]) => (
        <div key={folder} className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-700/50 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-300">{folder}</span>
              <span className="text-xs text-gray-500">({folderFiles.length} files)</span>
            </div>
          </div>
          <div className="divide-y divide-gray-700">
            {folderFiles.map((file) => (
              <FileItem key={file.id} file={file} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FileItem({ file }: { file: UploadFile }) {
  const { removeFile, pauseUpload, resumeUpload, retryUpload } = useUploadStore();

  const getStatusColor = () => {
    switch (file.status) {
      case 'completed': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'uploading': return 'text-orange-400';
      case 'paused': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (file.status) {
      case 'completed':
        return (
          <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'uploading':
        return (
          <svg className="h-5 w-5 text-orange-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        );
      case 'paused':
        return (
          <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const eta = file.speed && file.speed > 0
    ? (file.size - file.uploadedBytes) / file.speed
    : null;

  return (
    <div className="px-4 py-3 hover:bg-gray-700/30 transition-colors">
      <div className="flex items-center gap-3">
        {/* Status Icon */}
        <div className="flex-shrink-0">{getStatusIcon()}</div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white truncate">{file.name}</p>
            <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
          </div>

          {/* Progress Bar */}
          {(file.status === 'uploading' || file.status === 'paused' || file.progress > 0) && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      file.status === 'completed' ? 'bg-green-500' :
                      file.status === 'error' ? 'bg-red-500' :
                      file.status === 'paused' ? 'bg-yellow-500' :
                      'bg-orange-500'
                    }`}
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-10 text-right">{file.progress}%</span>
              </div>

              {file.status === 'uploading' && (
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{formatFileSize(file.uploadedBytes)} / {formatFileSize(file.size)}</span>
                  {file.speed && <span>{formatSpeed(file.speed)}</span>}
                  {eta && <span>ETA: {formatTime(eta)}</span>}
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {file.error && (
            <p className="mt-1 text-xs text-red-400">{file.error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {file.status === 'uploading' && (
            <button
              onClick={() => pauseUpload(file.id)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Pause"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
              </svg>
            </button>
          )}

          {file.status === 'paused' && (
            <button
              onClick={() => resumeUpload(file.id)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Resume"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
            </button>
          )}

          {file.status === 'error' && (
            <button
              onClick={() => retryUpload(file.id)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Retry"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}

          {file.status !== 'uploading' && (
            <button
              onClick={() => removeFile(file.id)}
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
              title="Remove"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
