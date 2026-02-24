import { useSessionStore } from '../stores/sessionStore';
import { formatFileSize, formatTimeOfDay } from '../utils/format';

export default function SessionBar() {
  const { session, batches } = useSessionStore();

  if (!session) return null;

  const totalFiles = batches.reduce((sum, b) => sum + b.fileCount, 0);
  const totalBytes = batches.reduce((sum, b) => sum + b.totalBytes, 0);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="font-medium text-white">{session.projectName}</span>
      <span className="text-gray-500">|</span>
      <span className="text-gray-300">{session.crewName}</span>
      {session.createdAt && (
        <>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">{formatTimeOfDay(session.createdAt)}</span>
        </>
      )}
      {totalFiles > 0 && (
        <>
          <span className="text-gray-500">|</span>
          <span className="text-gray-300">{totalFiles} files</span>
          <span className="text-gray-400">{formatFileSize(totalBytes)}</span>
        </>
      )}
      {batches.length > 0 && (
        <>
          <span className="text-gray-500">|</span>
          <span className="text-gray-300">{batches.length}B</span>
        </>
      )}
    </div>
  );
}
