export const API_BASE_URL = 'https://upload.turbo.net.au';
export const BACKEND_URL = 'https://turbo.net.au';

class ApiError extends Error {
  constructor(message: string, public status?: number, public isTokenExpired?: boolean) {
    super(message);
    this.name = 'ApiError';
  }
}

function isTokenExpiredError(status: number, message: string): boolean {
  return status === 401 ||
         status === 403 ||
         message.toLowerCase().includes('token expired') ||
         message.toLowerCase().includes('token invalid') ||
         message.toLowerCase().includes('unauthorized');
}

function handleTokenExpiration() {
  // Clear stored auth data
  localStorage.removeItem('crew-upload-auth');
  localStorage.removeItem('crew-upload-session');
  // Reload to trigger redirect to login
  window.location.reload();
}

export const api = {
  async post(endpoint: string, data: any, token?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      const errorMessage = error.error || 'Request failed';

      if (token && isTokenExpiredError(response.status, errorMessage)) {
        handleTokenExpiration();
        throw new ApiError(errorMessage, response.status, true);
      }

      throw new ApiError(errorMessage, response.status);
    }

    return response.json();
  },

  async get(endpoint: string, token?: string) {
    const headers: Record<string, string> = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      const errorMessage = error.error || 'Request failed';

      if (token && isTokenExpiredError(response.status, errorMessage)) {
        handleTokenExpiration();
        throw new ApiError(errorMessage, response.status, true);
      }

      throw new ApiError(errorMessage, response.status);
    }

    return response.json();
  }
};

export async function sendUploadCompletionEmail(
  projectName: string,
  crewName: string,
  fileCount: number,
  totalSize: string
): Promise<boolean> {
  try {
    // Call backend API to send notification email (Postmark key is stored on server)
    const response = await fetch(`${API_BASE_URL}/api/notification/upload-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectName,
        crewName,
        fileCount,
        totalSize
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send completion email:', error);
    return false;
  }
}

export interface FileProgress {
  id: string;
  name: string;
  size: number;
  uploadedBytes: number;
  progress: number;
  status: string;
  speed?: number;
}

export interface UploadProgressUpdate {
  session_id: string;
  project_name: string;
  crew_name: string;
  files: FileProgress[];
  started_at?: string;
}

export async function reportUploadProgress(update: UploadProgressUpdate): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/crew-upload/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(update)
    });

    return response.ok;
  } catch (error) {
    // Silently fail - don't interrupt uploads if progress reporting fails
    console.debug('Failed to report upload progress:', error);
    return false;
  }
}

export interface SessionStartUpdate {
  session_id: string;
  project_name: string;
  crew_name: string;
}

export async function reportSessionStart(update: SessionStartUpdate): Promise<boolean> {
  try {
    console.log('[Session] Reporting session start:', update);
    const response = await fetch(`${BACKEND_URL}/api/crew-upload/session-start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(update)
    });

    return response.ok;
  } catch (error) {
    console.debug('Failed to report session start:', error);
    return false;
  }
}

export async function reportSessionEnd(sessionId: string): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/crew-upload/session-end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ session_id: sessionId })
    });

    return response.ok;
  } catch (error) {
    console.debug('Failed to report session end:', error);
    return false;
  }
}
