import { useState } from 'react';
import { useSessionStore } from '../stores/sessionStore';

export default function SessionSetupPage() {
  const [projectName, setProjectName] = useState('');
  const [crewName, setCrewName] = useState('');
  const { createSession, isLoading, error, clearError } = useSessionStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createSession(projectName, crewName);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-lg">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">New Upload Session</h1>
            <p className="text-gray-400 mt-2">
              Enter the project details to start uploading files
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={clearError}
                  className="text-sm underline mt-1"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div>
              <label htmlFor="projectName" className="block text-sm font-medium text-gray-300 mb-2">
                Project Name *
              </label>
              <input
                id="projectName"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., Summer Wedding 2024"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="crewName" className="block text-sm font-medium text-gray-300 mb-2">
                Crew Member Name *
              </label>
              <input
                id="crewName"
                type="text"
                value={crewName}
                onChange={(e) => setCrewName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., John Smith"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !projectName || !crewName}
              className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Session...
                </span>
              ) : (
                'Start Upload Session'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
