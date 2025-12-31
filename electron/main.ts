import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';

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

// IPC Handlers for native file dialogs
ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'mxf', 'r3d', 'braw', 'arri', 'prores'] },
      { name: 'All Files', extensions: ['*'] }
    ]
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
const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks

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
  const buffer = Buffer.alloc(actualChunkSize);

  // Read chunk directly from file
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, actualChunkSize, offset);
  fs.closeSync(fd);

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(uploadUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'PATCH',
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

    // Write buffer directly - no IPC!
    req.write(buffer);
    req.end();
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
  let state = activeUploads.get(uploadId);

  if (!state) {
    state = { offset: 0, isPaused: false, isAborted: false };
    activeUploads.set(uploadId, state);
  }

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
    }

    // Complete!
    sendComplete(uploadId);
    activeUploads.delete(uploadId);

  } catch (error: any) {
    console.error('Upload error:', error);
    sendError(uploadId, error.message || 'Unknown error');
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
