import { ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useSessionStore } from '../stores/sessionStore';
import { useUploadStore } from '../stores/uploadStore';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isAuthenticated, logout } = useAuthStore();
  const { session, clearSession } = useSessionStore();
  const { clearAll, files } = useUploadStore();

  const handleLogout = async () => {
    clearAll();
    clearSession();
    await logout();
  };

  const handleNewSession = () => {
    if (files.some(f => f.status === 'uploading')) {
      if (!confirm('You have uploads in progress. Are you sure you want to start a new session?')) {
        return;
      }
    }
    clearAll();
    clearSession();
  };

  const isMac = window.electronAPI?.platform === 'darwin';

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      {/* Title bar / Header */}
      <header className={`bg-gray-800 border-b border-gray-700 ${isMac ? 'titlebar-drag-region' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex justify-between items-center h-14 ${isMac ? 'pl-16' : ''}`}>
            {/* Logo */}
            <div className="flex items-center gap-3 titlebar-no-drag">
              <img
                src="/logo-dark.png"
                alt="Turbo 360"
                className="h-8"
                onError={(e) => {
                  // Fallback if logo doesn't load
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="text-white font-semibold">Crew Upload</span>
            </div>

            {/* Session info & actions */}
            {isAuthenticated && (
              <div className="flex items-center gap-4 titlebar-no-drag">
                {session && (
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-white">{session.projectName}</p>
                    <p className="text-xs text-gray-400">{session.crewName}</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {session && (
                    <button
                      onClick={handleNewSession}
                      className="px-3 py-1.5 text-sm text-gray-300 hover:text-white transition-colors"
                    >
                      New Session
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Turbo 360. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
