const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { loadConfig, saveConfig, getDefaultConfig } = require('./config');
const { scanInstalledVersions, scanCurseForgeInstances } = require('./scanner');
const { syncModpack, cancelCurrentSync } = require('./synchronizer');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 1000,
    minHeight: 680,
    frame: false,
    backgroundColor: '#090d16',
    title: 'EasyMod - Modpack Bridge',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler: Config
ipcMain.handle('get-config', async () => {
  return loadConfig();
});

ipcMain.handle('save-config', async (_, newConfig) => {
  return saveConfig(newConfig);
});

ipcMain.handle('get-defaults', async () => {
  return getDefaultConfig();
});

// IPC Handler: Scan All
ipcMain.handle('scan-all', async () => {
  const config = loadConfig();
  const installedVersions = scanInstalledVersions(config.minecraftPath);
  const modpacks = await scanCurseForgeInstances(config.instancesPath, config.minecraftPath, installedVersions);
  
  return {
    config,
    installedVersions,
    modpacks
  };
});

// IPC Handler: Select Directory Dialog
ipcMain.handle('select-directory', async (_, defaultPath) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    defaultPath: defaultPath && fs.existsSync(defaultPath) ? defaultPath : undefined,
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// IPC Handler: Validate Paths
ipcMain.handle('validate-paths', async (_, { minecraftPath, instancesPath }) => {
  let mcValid = false;
  let mcMessage = 'Directory not found';
  let loaderCount = 0;

  if (minecraftPath && fs.existsSync(minecraftPath)) {
    try {
      const versionsDir = path.join(minecraftPath, 'versions');
      if (fs.existsSync(versionsDir)) {
        const versions = scanInstalledVersions(minecraftPath);
        loaderCount = versions.length;
        mcValid = true;
        mcMessage = loaderCount > 0
          ? `Detected ${loaderCount} loader/version${loaderCount === 1 ? '' : 's'}`
          : 'Valid .minecraft folder (no versions found yet)';
      } else {
        mcValid = true;
        mcMessage = 'Folder exists, but versions/ directory not found';
      }
    } catch (_) {
      mcValid = true;
      mcMessage = 'Directory exists';
    }
  }

  let cfValid = false;
  let cfMessage = 'Instances directory not found';
  let modpackCount = 0;

  if (instancesPath && fs.existsSync(instancesPath)) {
    try {
      const entries = fs.readdirSync(instancesPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const jsonPath = path.join(instancesPath, entry.name, 'minecraftinstance.json');
          if (fs.existsSync(jsonPath)) modpackCount++;
        }
      }
      cfValid = true;
      cfMessage = modpackCount > 0
        ? `Found ${modpackCount} CurseForge modpack${modpackCount === 1 ? '' : 's'}`
        : 'Folder exists, but no CurseForge instances found inside';
    } catch (_) {
      cfValid = true;
      cfMessage = 'Directory exists';
    }
  }

  return {
    minecraft: { valid: mcValid, message: mcMessage, count: loaderCount },
    curseforge: { valid: cfValid, message: cfMessage, count: modpackCount }
  };
});

// IPC Handler: Sync Modpack
ipcMain.handle('sync-modpack', async (_, options) => {
  try {
    const result = await syncModpack(options, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('sync-progress', progress);
      }
    });
    return result;
  } catch (err) {
    console.error('Sync failed:', err);
    throw new Error(err.message || 'Synchronization failed');
  }
});

// IPC Handler: Cancel Sync
ipcMain.handle('cancel-sync', async () => {
  cancelCurrentSync();
  return true;
});

// IPC Handler: Open Path in Windows Explorer
ipcMain.handle('open-path', async (_, targetPath) => {
  if (!targetPath) return false;
  try {
    if (await fs.pathExists(targetPath)) {
      await shell.openPath(targetPath);
      return true;
    }
  } catch (err) {
    console.error('Failed opening path:', err);
  }
  return false;
});

// IPC Handler: Launch or Open Legacy Launcher
ipcMain.handle('open-legacy-launcher', async () => {
  const config = loadConfig();
  if (config.customLauncherPath && await fs.pathExists(config.customLauncherPath)) {
    await shell.openPath(config.customLauncherPath);
    return true;
  }

  // Common legacy launcher locations
  const candidates = [
    path.join(process.env.APPDATA || '', '.minecraft', 'LegacyLauncher.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'LegacyLauncher', 'LegacyLauncher.exe'),
    'C:\\Program Files\\LegacyLauncher\\LegacyLauncher.exe',
    'C:\\Program Files (x86)\\LegacyLauncher\\LegacyLauncher.exe'
  ];

  for (const candidate of candidates) {
    if (await fs.pathExists(candidate)) {
      await shell.openPath(candidate);
      return true;
    }
  }

  // Fallback: Open .minecraft directory so user can launch whatever launcher they have
  if (await fs.pathExists(config.minecraftPath)) {
    await shell.openPath(config.minecraftPath);
    return true;
  }

  return false;
});

// Window controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});
