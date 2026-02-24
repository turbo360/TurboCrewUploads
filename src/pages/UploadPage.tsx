import { useState, useEffect, useRef } from 'react';
import { useUploadStore } from '../stores/uploadStore';
import { useSessionStore } from '../stores/sessionStore';
import DropZone from '../components/DropZone';
import FileQueue from '../components/FileQueue';
import UploadControls from '../components/UploadControls';
import BatchProgress from '../components/BatchProgress';
import BatchCompleteBanner from '../components/BatchCompleteBanner';
import BatchHistoryStrip from '../components/BatchHistoryStrip';
import EndSessionCard from '../components/EndSessionCard';
import { formatFileSize } from '../utils/format';

export default function UploadPage() {
  const { files, clearForNewBatch } = useUploadStore();
  const { session, batches, currentBatchNumber, completeBatch } = useSessionStore();

  // Track the batch start time
  const batchStartRef = useRef<string | null>(null);
  // Track whether we've already completed this batch
  const batchCompletedRef = useRef(false);
  // Email sent ref
  const emailSentRef = useRef(false);
  // Show completion banner state
  const [showBanner, setShowBanner] = useState(false);
  const [bannerStats, setBannerStats] = useState<{
    batchNumber: number;
    fileCount: number;
    totalBytes: number;
    duration: number;
    failedFiles: number;
  } | null>(null);

  const uploadingCount = files.filter(f => f.status === 'uploading').length;
  const completedCount = files.filter(f => f.status === 'completed').length;
  const failedCount = files.filter(f => f.status === 'error').length;
  const pendingCount = files.filter(f => f.status === 'pending' || f.status === 'paused').length;

  // Check if all uploads in current batch are done
  const allDone = files.length > 0 && uploadingCount === 0 && pendingCount === 0;

  // Set batch start time when first file starts uploading
  useEffect(() => {
    if (uploadingCount > 0 && !batchStartRef.current) {
      batchStartRef.current = new Date().toISOString();
      batchCompletedRef.current = false;
      emailSentRef.current = false;
    }
  }, [uploadingCount]);

  // Handle batch completion
  useEffect(() => {
    if (allDone && !batchCompletedRef.current && files.length > 0) {
      batchCompletedRef.current = true;

      const completedAt = new Date().toISOString();
      const startedAt = batchStartRef.current || completedAt;
      const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
      const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();

      // Send completion email (only once per batch)
      if (!emailSentRef.current && session && window.electronAPI) {
        emailSentRef.current = true;
        const completedFiles = files.filter(f => f.status === 'completed');
        window.electronAPI.sendCompletionEmail({
          projectName: session.projectName,
          crewName: session.crewName,
          fileCount: completedFiles.length,
          totalSize: formatFileSize(totalBytes),
          fileNames: completedFiles.map(f => f.name)
        });
      }

      // Record batch stats for the banner
      setBannerStats({
        batchNumber: currentBatchNumber,
        fileCount: files.length,
        totalBytes,
        duration,
        failedFiles: failedCount
      });

      // After a 2-second celebration, complete the batch and clear for next
      const timer = setTimeout(() => {
        completeBatch({
          fileCount: files.length,
          completedFiles: completedCount,
          failedFiles: failedCount,
          totalBytes,
          startedAt,
          completedAt
        });

        clearForNewBatch();
        batchStartRef.current = null;
        setShowBanner(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [allDone, files, currentBatchNumber, completedCount, failedCount, completeBatch, clearForNewBatch, session]);

  const hasActiveUpload = files.length > 0 && !allDone;

  return (
    <div className="space-y-6">
      {/* Completed Batch History */}
      <BatchHistoryStrip batches={batches} />

      {/* Batch Complete Banner */}
      {showBanner && bannerStats && (
        <BatchCompleteBanner
          batchNumber={bannerStats.batchNumber}
          fileCount={bannerStats.fileCount}
          totalBytes={bannerStats.totalBytes}
          duration={bannerStats.duration}
          failedFiles={bannerStats.failedFiles}
        />
      )}

      {/* Drop Zone */}
      <DropZone
        batchNumber={currentBatchNumber}
        hasCompletedBatches={batches.length > 0}
      />

      {/* Active Batch: Progress + Controls + File Queue */}
      {files.length > 0 && (
        <>
          <BatchProgress batchNumber={currentBatchNumber} />
          <UploadControls />
          <FileQueue />
        </>
      )}

      {/* Empty State -- first batch only */}
      {files.length === 0 && batches.length === 0 && !showBanner && (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-600"
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
          <p className="mt-2 text-sm text-gray-500">
            Drag and drop files or folders above, or use the buttons to select them.
          </p>
        </div>
      )}

      {/* End Session Card */}
      {!hasActiveUpload && batches.length > 0 && (
        <EndSessionCard />
      )}
    </div>
  );
}
