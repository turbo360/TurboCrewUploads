import { useState, useEffect, useMemo, useRef } from 'react';
import { useUploadStore } from '../stores/uploadStore';
import { useSessionStore } from '../stores/sessionStore';
import DropZone from '../components/DropZone';
import FileQueue from '../components/FileQueue';
import UploadControls from '../components/UploadControls';
import UploadStats from '../components/UploadStats';
import CompletionModal from '../components/CompletionModal';
import { formatFileSize } from '../utils/format';
import { sendUploadCompletionEmail } from '../utils/api';

export default function UploadPage() {
  const { files } = useUploadStore();
  const { session } = useSessionStore();
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [hasStartedUploading, setHasStartedUploading] = useState(false);
  const emailSentRef = useRef(false);

  // Track when uploads have started
  useEffect(() => {
    if (files.some(f => f.status === 'uploading' || f.status === 'completed')) {
      setHasStartedUploading(true);
    }
  }, [files]);

  // Calculate completion stats
  const completedFiles = useMemo(() => files.filter(f => f.status === 'completed'), [files]);
  const totalSize = useMemo(() => completedFiles.reduce((sum, f) => sum + f.size, 0), [completedFiles]);

  // Check if all files are completed (only if we have files and have started uploading)
  const allCompleted = useMemo(() => {
    if (!hasStartedUploading || files.length === 0) return false;
    return files.every(f => f.status === 'completed');
  }, [files, hasStartedUploading]);

  // Show modal and send email when all files complete
  useEffect(() => {
    if (allCompleted && completedFiles.length > 0) {
      setShowCompletionModal(true);

      // Send email notification (only once per upload batch)
      if (!emailSentRef.current && session) {
        emailSentRef.current = true;
        sendUploadCompletionEmail(
          session.projectName,
          session.crewName,
          completedFiles.length,
          formatFileSize(totalSize)
        );
      }
    }
  }, [allCompleted, completedFiles.length, session, totalSize]);

  const handleCloseModal = () => {
    setShowCompletionModal(false);
    setHasStartedUploading(false);
    emailSentRef.current = false; // Reset for next upload batch
  };

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

      {/* Completion Modal */}
      <CompletionModal
        isOpen={showCompletionModal}
        onClose={handleCloseModal}
        completedCount={completedFiles.length}
        totalSize={formatFileSize(totalSize)}
      />
    </div>
  );
}
