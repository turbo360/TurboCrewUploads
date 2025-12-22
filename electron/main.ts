import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

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

  // Open external links in browser
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

ipcMain.handle('get-file-buffer', async (_, filePath: string) => {
  return fs.readFileSync(filePath);
});

ipcMain.handle('get-file-stream-chunk', async (_, filePath: string, start: number, end: number) => {
  const buffer = Buffer.alloc(end - start);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, end - start, start);
  fs.closeSync(fd);
  return buffer;
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

    // Skip hidden files and system files
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
