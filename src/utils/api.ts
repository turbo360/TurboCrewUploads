export const API_BASE_URL = 'https://upload.turbo.net.au';

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
