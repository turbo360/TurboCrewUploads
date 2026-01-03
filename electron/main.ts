import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { autoUpdater } from 'electron-updater';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Crew Upload - Turbo 360',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#111827',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// ============================================
// AUTO-UPDATER
// ============================================

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdater() {
  if (isDev) {
    console.log('Skipping auto-updater in development mode');
    return;
  }

  // Check for updates on startup
  autoUpdater.checkForUpdates().catch(err => {
    console.log('Error checking for updates:', err);
  });

  // Check for updates every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(err => {
      console.log('Error checking for updates:', err);
    });
  }, 4 * 60 * 60 * 1000);
}

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-available', {
      version: info.version,
      releaseNotes: info.releaseNotes
    });
  }
});

autoUpdater.on('update-not-available', () => {
  console.log('No updates available');
});

autoUpdater.on('download-progress', (progress) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-download-progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-downloaded', {
      version: info.version
    });
  }
});

autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-error', {
      error: err.message
    });
  }
});

// IPC handlers for update control
ipcMain.handle('check-for-updates', async () => {
  if (isDev) {
    return { updateAvailable: false, isDev: true };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return { updateAvailable: result?.updateInfo?.version !== app.getVersion() };
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Initialize auto-updater after app is ready
app.whenReady().then(() => {
  setupAutoUpdater();
});

// IPC Handlers for native file dialogs
ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections']
    // No filters - allow all file types
  });

  if (result.canceled) return [];

  return result.filePaths.map(filePath => ({
    path: filePath,
    name: path.basename(filePath),
    size: fs.statSync(filePath).size,
    type: getFileType(filePath)
  }));
});

ipcMain.handle('select-folders', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'multiSelections']
  });

  if (result.canceled) return [];

  const files: any[] = [];

  for (const folderPath of result.filePaths) {
    const folderFiles = getAllFiles(folderPath, folderPath);
    files.push(...folderFiles);
  }

  return files;
});

ipcMain.handle('get-file-size', async (_, filePath: string) => {
  return fs.statSync(filePath).size;
});

// Expand a path - if it's a directory, return all files inside; if it's a file, return file info
ipcMain.handle('expand-path', async (_, filePath: string) => {
  const stat = fs.statSync(filePath);

  if (stat.isDirectory()) {
    // Return all files in the directory recursively
    return getAllFiles(filePath, filePath);
  } else {
    // Return single file info
    return [{
      path: filePath,
      name: path.basename(filePath),
      relativePath: path.basename(filePath),
      size: stat.size,
      type: getFileType(filePath)
    }];
  }
});

// Helper to get all files from a directory recursively
function getAllFiles(dirPath: string, basePath: string): any[] {
  const files: any[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.name.startsWith('.') || entry.name.startsWith('._')) continue;

    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, basePath));
    } else {
      const relativePath = path.relative(basePath, fullPath);
      files.push({
        path: fullPath,
        name: entry.name,
        relativePath: relativePath,
        size: fs.statSync(fullPath).size,
        type: getFileType(fullPath)
      });
    }
  }

  return files;
}

function getFileType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.mxf': 'application/mxf',
    '.r3d': 'video/x-r3d',
    '.braw': 'video/x-braw',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.pdf': 'application/pdf',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// ============================================
// NATIVE TUS UPLOAD IMPLEMENTATION
// Upload happens entirely in main process - no IPC for file data
// ============================================

interface UploadState {
  uploadUrl?: string;
  offset: number;
  isPaused: boolean;
  isAborted: boolean;
}

const activeUploads: Map<string, UploadState> = new Map();
const CHUNK_SIZE = 256 * 1024 * 1024; // 256MB chunks for maximum throughput to NAS
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 10000]; // Exponential backoff: 1s, 3s, 10s

// HTTP agents with keep-alive for connection reuse
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 20,
  maxFreeSockets: 10
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 20,
  maxFreeSockets: 10
});

// Upload logging
interface UploadLog {
  timestamp: string;
  uploadId: string;
  filename: string;
  status: 'started' | 'completed' | 'failed' | 'retrying';
  error?: string;
  duration?: number;
  size?: number;
}

const uploadLogs: UploadLog[] = [];

function logUpload(log: UploadLog) {
  uploadLogs.push(log);
  const logPath = path.join(app.getPath('userData'), 'upload-log.json');
  fs.writeFileSync(logPath, JSON.stringify(uploadLogs, null, 2));
  console.log(`[Upload ${log.status}] ${log.filename}${log.error ? ` - ${log.error}` : ''}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sendProgress(uploadId: string, bytesUploaded: number, bytesTotal: number) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('upload-progress', { uploadId, bytesUploaded, bytesTotal });
  }
}

function sendComplete(uploadId: string) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('upload-complete', { uploadId });
  }
}

function sendError(uploadId: string, error: string) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('upload-error', { uploadId, error });
  }
}

function isTokenExpiredError(statusCode: number, body: string): boolean {
  return statusCode === 401 ||
         statusCode === 403 ||
         body.toLowerCase().includes('token expired') ||
         body.toLowerCase().includes('token invalid') ||
         body.toLowerCase().includes('unauthorized');
}

function sendTokenExpired() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('token-expired');
  }
}

function makeRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: Buffer | fs.ReadStream
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers,
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);

    if (body instanceof fs.ReadStream) {
      body.pipe(req);
    } else if (body) {
      req.write(body);
      req.end();
    } else {
      req.end();
    }
  });
}

async function createTusUpload(
  endpoint: string,
  filePath: string,
  fileSize: number,
  metadata: Record<string, string>,
  token: string
): Promise<string> {
  // Encode metadata as tus format: key base64value,key2 base64value2
  const metadataStr = Object.entries(metadata)
    .map(([k, v]) => `${k} ${Buffer.from(v).toString('base64')}`)
    .join(',');

  const response = await makeRequest(endpoint, 'POST', {
    'Authorization': `Bearer ${token}`,
    'Tus-Resumable': '1.0.0',
    'Upload-Length': String(fileSize),
    'Upload-Metadata': metadataStr,
    'Content-Type': 'application/offset+octet-stream',
  });

  if (response.statusCode !== 201) {
    if (isTokenExpiredError(response.statusCode, response.body)) {
      sendTokenExpired();
      throw new Error('Token expired');
    }
    throw new Error(`Failed to create upload: ${response.statusCode} ${response.body}`);
  }

  const location = response.headers['location'];
  if (!location) {
    throw new Error('No location header in response');
  }

  // Handle relative URLs
  if (location.startsWith('/')) {
    const parsedEndpoint = new URL(endpoint);
    return `${parsedEndpoint.protocol}//${parsedEndpoint.host}${location}`;
  }

  return location;
}

async function getTusOffset(uploadUrl: string, token: string): Promise<number> {
  const response = await makeRequest(uploadUrl, 'HEAD', {
    'Authorization': `Bearer ${token}`,
    'Tus-Resumable': '1.0.0',
  });

  if (response.statusCode !== 200 && response.statusCode !== 204) {
    if (isTokenExpiredError(response.statusCode, response.body)) {
      sendTokenExpired();
      throw new Error('Token expired');
    }
    throw new Error(`Failed to get offset: ${response.statusCode}`);
  }

  return parseInt(response.headers['upload-offset'] as string, 10) || 0;
}

async function uploadChunk(
  uploadUrl: string,
  filePath: string,
  offset: number,
  chunkSize: number,
  fileSize: number,
  token: string,
  uploadId: string
): Promise<number> {
  const state = activeUploads.get(uploadId);
  if (!state || state.isAborted) {
    throw new Error('Upload aborted');
  }

  const actualChunkSize = Math.min(chunkSize, fileSize - offset);

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(uploadUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const protocol = isHttps ? https : http;

    const options: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'PATCH',
      agent: isHttps ? httpsAgent : httpAgent,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Offset': String(offset),
        'Content-Type': 'application/offset+octet-stream',
        'Content-Length': String(actualChunkSize),
      },
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 204 && res.statusCode !== 200) {
          if (isTokenExpiredError(res.statusCode || 0, data)) {
            sendTokenExpired();
            reject(new Error('Token expired'));
            return;
          }
          reject(new Error(`Upload failed: ${res.statusCode} ${data}`));
          return;
        }

        const newOffset = parseInt(res.headers['upload-offset'] as string, 10);
        resolve(newOffset);
      });
    });

    req.on('error', reject);

    // Stream file directly to request - no memory buffering!
    const fileStream = fs.createReadStream(filePath, {
      start: offset,
      end: offset + actualChunkSize - 1,
      highWaterMark: 16 * 1024 * 1024 // 16MB read buffer for maximum throughput
    });

    fileStream.on('error', (err) => {
      req.destroy();
      reject(err);
    });

    fileStream.pipe(req);
  });
}

async function runUpload(
  uploadId: string,
  filePath: string,
  endpoint: string,
  metadata: Record<string, string>,
  token: string
) {
  const fileSize = fs.statSync(filePath).size;
  const filename = metadata.filename || path.basename(filePath);
  const startTime = Date.now();
  let state = activeUploads.get(uploadId);

  if (!state) {
    state = { offset: 0, isPaused: false, isAborted: false };
    activeUploads.set(uploadId, state);
  }

  // Log upload start
  logUpload({
    timestamp: new Date().toISOString(),
    uploadId,
    filename,
    status: 'started',
    size: fileSize
  });

  let retryCount = 0;

  while (retryCount <= MAX_RETRIES) {
    try {
      // Create upload if we don't have a URL yet
      if (!state.uploadUrl) {
        state.uploadUrl = await createTusUpload(endpoint, filePath, fileSize, metadata, token);
      }

      // Get current offset (for resumption)
      state.offset = await getTusOffset(state.uploadUrl, token);
      sendProgress(uploadId, state.offset, fileSize);

      // Upload chunks
      while (state.offset < fileSize) {
        // Check for pause/abort
        const currentState = activeUploads.get(uploadId);
        if (!currentState || currentState.isAborted) {
          return;
        }
        if (currentState.isPaused) {
          return; // Will be resumed later
        }

        const newOffset = await uploadChunk(
          state.uploadUrl,
          filePath,
          state.offset,
          CHUNK_SIZE,
          fileSize,
          token,
          uploadId
        );

        state.offset = newOffset;
        sendProgress(uploadId, newOffset, fileSize);
        retryCount = 0; // Reset retry count on successful chunk
      }

      // Complete!
      const duration = Date.now() - startTime;
      logUpload({
        timestamp: new Date().toISOString(),
        uploadId,
        filename,
        status: 'completed',
        size: fileSize,
        duration
      });

      sendComplete(uploadId);
      activeUploads.delete(uploadId);
      return;

    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';

      // Don't retry on token expiration
      if (errorMessage.includes('Token expired')) {
        logUpload({
          timestamp: new Date().toISOString(),
          uploadId,
          filename,
          status: 'failed',
          error: errorMessage
        });
        sendError(uploadId, errorMessage);
        return;
      }

      retryCount++;

      if (retryCount <= MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        logUpload({
          timestamp: new Date().toISOString(),
          uploadId,
          filename,
          status: 'retrying',
          error: `${errorMessage} (attempt ${retryCount}/${MAX_RETRIES})`
        });
        console.log(`Retrying upload ${filename} in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`);
        await sleep(delay);
      } else {
        // All retries exhausted
        logUpload({
          timestamp: new Date().toISOString(),
          uploadId,
          filename,
          status: 'failed',
          error: errorMessage
        });
        console.error('Upload error after max retries:', error);
        sendError(uploadId, errorMessage);
        return;
      }
    }
  }
}

// IPC handlers for upload control
ipcMain.handle('start-upload', async (_, params: {
  uploadId: string;
  filePath: string;
  endpoint: string;
  metadata: Record<string, string>;
  token: string;
}) => {
  const { uploadId, filePath, endpoint, metadata, token } = params;

  // Start upload in background
  runUpload(uploadId, filePath, endpoint, metadata, token).catch(err => {
    console.error('Upload failed:', err);
    sendError(uploadId, err.message);
  });

  return { success: true };
});

ipcMain.handle('pause-upload', async (_, uploadId: string) => {
  const state = activeUploads.get(uploadId);
  if (state) {
    state.isPaused = true;
  }
  return { success: true };
});

ipcMain.handle('resume-upload', async (_, params: {
  uploadId: string;
  filePath: string;
  endpoint: string;
  metadata: Record<string, string>;
  token: string;
}) => {
  const { uploadId, filePath, endpoint, metadata, token } = params;
  const state = activeUploads.get(uploadId);

  if (state) {
    state.isPaused = false;
    runUpload(uploadId, filePath, endpoint, metadata, token).catch(err => {
      sendError(uploadId, err.message);
    });
  }

  return { success: true };
});

ipcMain.handle('abort-upload', async (_, uploadId: string) => {
  const state = activeUploads.get(uploadId);
  if (state) {
    state.isAborted = true;
    activeUploads.delete(uploadId);
  }
  return { success: true };
});

// Get upload logs (especially failed uploads)
ipcMain.handle('get-upload-logs', async () => {
  return {
    logs: uploadLogs,
    logPath: path.join(app.getPath('userData'), 'upload-log.json'),
    failedUploads: uploadLogs.filter(l => l.status === 'failed')
  };
});

// Open logs folder
ipcMain.handle('open-logs-folder', async () => {
  const logPath = path.join(app.getPath('userData'), 'upload-log.json');
  shell.showItemInFolder(logPath);
});

// Send email notification (from main process to avoid CORS)
const POSTMARK_API_KEY = '***REMOVED***';
const NOTIFICATION_EMAIL = 'hello@turbo360.com.au';

ipcMain.handle('send-completion-email', async (_, params: {
  projectName: string;
  crewName: string;
  fileCount: number;
  totalSize: string;
}) => {
  const { projectName, crewName, fileCount, totalSize } = params;

  try {
    const postData = JSON.stringify({
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
    });

    const response = await makeRequest('https://api.postmarkapp.com/email', 'POST', {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': POSTMARK_API_KEY
    }, Buffer.from(postData));

    console.log('Email sent:', response.statusCode, response.body);
    return { success: response.statusCode === 200, response: response.body };
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message };
  }
});
