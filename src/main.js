const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { spawn, exec } = require('child_process');
const { 
  loadConfig, 
  saveConfig, 
  getDefaultConfig, 
  findLauncherExecutable, 
  setLauncherSelectedVersion 
} = require('./config');
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

// IPC Handler: Select File Dialog (e.g. for .exe)
ipcMain.handle('select-file', async (_, options = {}) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options.title || 'Select Launcher Executable',
    defaultPath: options.defaultPath && fs.existsSync(options.defaultPath) ? options.defaultPath : undefined,
    properties: ['openFile'],
    filters: options.filters || [
      { name: 'Executables (*.exe)', extensions: ['exe'] },
      { name: 'All Files (*.*)', extensions: ['*'] }
    ]
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

// Helper: Launch Launcher Process reliably
async function launchLauncherProcess(launcherPath) {
  if (!launcherPath || !(await fs.pathExists(launcherPath))) {
    return { success: false, error: 'Launcher executable not found. Please set your launcher path in Settings.' };
  }

  const launcherDir = path.dirname(launcherPath);

  // Strategy 1: Electron shell.openPath (native OS ShellExecute)
  try {
    const err = await shell.openPath(launcherPath);
    if (!err) {
      return { success: true, launcherPath, method: 'openPath' };
    }
    console.warn('shell.openPath warning:', err);
  } catch (openErr) {
    console.warn('shell.openPath failed, trying fallback:', openErr);
  }

  // Strategy 2: child_process.spawn with working directory set to launcher directory
  try {
    const child = spawn(launcherPath, [], {
      cwd: launcherDir,
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    return { success: true, launcherPath, method: 'spawn' };
  } catch (spawnErr) {
    console.warn('spawn failed, trying cmd start fallback:', spawnErr);
  }

  // Strategy 3: cmd /c start
  try {
    await new Promise((resolve, reject) => {
      exec(`start "" /D "${launcherDir}" "${launcherPath}"`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return { success: true, launcherPath, method: 'cmd' };
  } catch (cmdErr) {
    return { success: false, error: cmdErr.message || 'Failed to start launcher process' };
  }
}

// IPC Handler: Launch or Open Legacy Launcher
ipcMain.handle('open-legacy-launcher', async () => {
  const config = loadConfig();
  const launcherPath = findLauncherExecutable(config);
  if (launcherPath) {
    return launchLauncherProcess(launcherPath);
  }

  // Fallback: Open .minecraft directory so user can launch whatever launcher they have
  if (config.minecraftPath && (await fs.pathExists(config.minecraftPath))) {
    await shell.openPath(config.minecraftPath);
    return { success: false, error: 'Launcher executable not found. Opened Minecraft directory instead.' };
  }

  return { success: false, error: 'Launcher executable not found. Please specify it in Settings.' };
});

// IPC Handler: Launch Modpack (Pre-selects version in launcher config and launches it)
ipcMain.handle('launch-modpack', async (_, versionName) => {
  if (!versionName) {
    return { success: false, error: 'No version specified to launch.' };
  }

  const config = loadConfig();

  // 1. Pre-select version in tl.properties / launcher profiles
  try {
    setLauncherSelectedVersion(versionName, config);
  } catch (err) {
    console.error('Failed setting version in launcher config:', err);
  }

  // 2. Launch the launcher executable
  const launcherPath = findLauncherExecutable(config);
  if (launcherPath) {
    const launchRes = await launchLauncherProcess(launcherPath);
    return { ...launchRes, versionName };
  }

  return {
    success: false,
    error: 'Launcher executable (LL.exe) not found. Please set your launcher path in Settings.'
  };
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
