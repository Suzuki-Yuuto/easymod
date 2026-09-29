const fs = require('fs');
const path = require('path');
const os = require('os');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    try {
      const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx > -1) {
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    } catch (_) {}
  }
}
loadEnv();

function getDefaultMinecraftPath() {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), '.minecraft');
  } else if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'minecraft');
  } else {
    return path.join(os.homedir(), '.minecraft');
  }
}

function getDefaultCurseForgePath() {
  const userProfile = process.env.USERPROFILE || os.homedir();
  
  // Primary default on Windows
  const primary = path.join(userProfile, 'curseforge', 'minecraft', 'Instances');
  if (fs.existsSync(primary)) return primary;

  // Documents fallback
  const docs = path.join(userProfile, 'Documents', 'curseforge', 'minecraft', 'Instances');
  if (fs.existsSync(docs)) return docs;

  // Alternate drive checks on Windows
  if (process.platform === 'win32') {
    const drives = ['D:', 'E:', 'F:'];
    for (const drive of drives) {
      const alt = path.join(drive, 'curseforge', 'minecraft', 'Instances');
      if (fs.existsSync(alt)) return alt;
    }
  }

  return primary;
}

function getConfigFilePath() {
  const newBaseDir = process.env.APPDATA 
    ? path.join(process.env.APPDATA, 'easymod-bridge')
    : path.join(os.homedir(), '.easymod-bridge');
  
  const oldBaseDir = process.env.APPDATA 
    ? path.join(process.env.APPDATA, 'legacy-launcher-modpack-bridge')
    : path.join(os.homedir(), '.legacy-launcher-modpack-bridge');
  
  // Migrate from old directory if exists and new doesn't
  if (fs.existsSync(oldBaseDir) && !fs.existsSync(newBaseDir)) {
    try {
      fs.cpSync(oldBaseDir, newBaseDir, { recursive: true });
    } catch (_) {}
  }

  const baseDir = newBaseDir;
  if (!fs.existsSync(baseDir)) {
    try {
      fs.mkdirSync(baseDir, { recursive: true });
    } catch (_) {}
  }
  return path.join(baseDir, 'config.json');
}

function getDefaultConfig() {
  return {
    minecraftPath: getDefaultMinecraftPath(),
    instancesPath: getDefaultCurseForgePath(),
    cleanSync: true,
    includeSaves: false,
    autoScanOnStart: true,
    customLauncherPath: '',
    firstRunCompleted: false
  };
}

function loadConfig() {
  const configPath = getConfigFilePath();
  const defaults = getDefaultConfig();
  if (fs.existsSync(configPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { ...defaults, ...data };
    } catch (err) {
      console.error('Failed to parse config file, using defaults:', err);
    }
  }
  return defaults;
}

function saveConfig(newConfig) {
  const configPath = getConfigFilePath();
  const merged = { ...loadConfig(), ...newConfig };
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

module.exports = {
  getDefaultMinecraftPath,
  getDefaultCurseForgePath,
  getConfigFilePath,
  getDefaultConfig,
  loadConfig,
  saveConfig
};
