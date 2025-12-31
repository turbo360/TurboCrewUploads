export const API_BASE_URL = 'https://upload.turbo.net.au';
const POSTMARK_API_KEY = '***REMOVED***';
const NOTIFICATION_EMAIL = 'hello@turbo360.com.au';

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
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': POSTMARK_API_KEY
      },
      body: JSON.stringify({
        From: 'uploads@turbo360.com.au',
        To: NOTIFICATION_EMAIL,
        Subject: `New Upload Complete: ${projectName} - ${crewName}`,
        HtmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Crew Upload Complete</h1>
            </div>
            <div style="background: #1f2937; padding: 30px; color: #e5e7eb;">
              <h2 style="color: #f97316; margin-top: 0;">Upload Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #374151; color: #9ca3af;">Project</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #374151; text-align: right; font-weight: bold;">${projectName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #374151; color: #9ca3af;">Crew</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #374151; text-align: right; font-weight: bold;">${crewName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #374151; color: #9ca3af;">Files Uploaded</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #374151; text-align: right; font-weight: bold;">${fileCount}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #9ca3af;">Total Size</td>
                  <td style="padding: 10px 0; text-align: right; font-weight: bold;">${totalSize}</td>
                </tr>
              </table>
              <p style="margin-top: 20px; color: #9ca3af; font-size: 14px;">
                Files are ready for processing in the upload server.
              </p>
            </div>
            <div style="background: #111827; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
              Turbo 360 Crew Upload System
            </div>
          </div>
        `,
        TextBody: `New upload complete!\n\nProject: ${projectName}\nCrew: ${crewName}\nFiles: ${fileCount}\nTotal Size: ${totalSize}\n\nFiles are ready for processing.`,
        MessageStream: 'outbound'
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send completion email:', error);
    return false;
  }
}
