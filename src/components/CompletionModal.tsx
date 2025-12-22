import { useSessionStore } from '../stores/sessionStore';
import { useUploadStore } from '../stores/uploadStore';

interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedCount: number;
  totalSize: string;
}

export default function CompletionModal({ isOpen, onClose, completedCount, totalSize }: CompletionModalProps) {
  const { clearSession } = useSessionStore();
  const { clearAll } = useUploadStore();

  if (!isOpen) return null;

  const handleClose = () => {
    clearAll();
    clearSession();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Success header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-8 text-center">
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Upload Complete!</h2>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="text-center">
            <p className="text-gray-300 text-lg mb-4">
              Your files have been uploaded successfully.
            </p>

            <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
              <div className="flex justify-around text-center">
                <div>
                  <p className="text-3xl font-bold text-orange-500">{completedCount}</p>
                  <p className="text-sm text-gray-400">Files Uploaded</p>
                </div>
                <div className="border-l border-gray-600" />
                <div>
                  <p className="text-3xl font-bold text-orange-500">{totalSize}</p>
                  <p className="text-sm text-gray-400">Total Size</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-blue-300 text-sm text-left">
                  The Turbo 360 team has been notified and will process your files shortly.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
          >
            Start New Upload
          </button>
        </div>
      </div>
    </div>
  );
}
