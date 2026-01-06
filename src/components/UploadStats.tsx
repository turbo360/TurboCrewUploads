import { useMemo } from 'react';
import { useUploadStore } from '../stores/uploadStore';
import { formatFileSize, formatSpeed, formatTime } from '../utils/format';

export default function UploadStats() {
  const { files } = useUploadStore();

  const stats = useMemo(() => {
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    const uploadedBytes = files.reduce((sum, f) => sum + f.uploadedBytes, 0);
    const completedFiles = files.filter(f => f.status === 'completed').length;
    const uploadingFiles = files.filter(f => f.status === 'uploading');

    // Calculate average speed from all uploading files
    const totalSpeed = uploadingFiles.reduce((sum, f) => sum + (f.speed || 0), 0);
    const avgSpeed = uploadingFiles.length > 0 ? totalSpeed / uploadingFiles.length : 0;

    // Calculate ETA for remaining bytes
    const remainingBytes = totalBytes - uploadedBytes;
    const eta = avgSpeed > 0 ? remainingBytes / avgSpeed : null;

    const overallProgress = totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 0;

    return {
      totalFiles: files.length,
      completedFiles,
      totalBytes,
      uploadedBytes,
      overallProgress,
      avgSpeed,
      eta
    };
  }, [files]);

  return (
    <div className="bg-gray-900/70 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Files Progress */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Files</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {stats.completedFiles} / {stats.totalFiles}
          </p>
        </div>

        {/* Data Progress */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Uploaded</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {formatFileSize(stats.uploadedBytes)} / {formatFileSize(stats.totalBytes)}
          </p>
        </div>

        {/* Speed */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Speed</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {stats.avgSpeed > 0 ? formatSpeed(stats.avgSpeed) : '--'}
          </p>
        </div>

        {/* ETA */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">ETA</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {stats.eta ? formatTime(stats.eta) : '--'}
          </p>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-300"
              style={{ width: `${stats.overallProgress}%` }}
            />
          </div>
          <span className="text-sm font-medium text-white w-12 text-right">
            {stats.overallProgress}%
          </span>
        </div>
      </div>
    </div>
  );
}
