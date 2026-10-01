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

function getDefaultLauncherPath() {
  const candidates = [];
  if (process.env.APPDATA) {
    candidates.push(path.join(process.env.APPDATA, '.tlauncher', 'legacy', 'Minecraft', 'LL.exe'));
    candidates.push(path.join(process.env.APPDATA, '.minecraft', 'LL.exe'));
    candidates.push(path.join(process.env.APPDATA, '.minecraft', 'LegacyLauncher.exe'));
  }
  if (process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'LegacyLauncher', 'LegacyLauncher.exe'));
    candidates.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'Legacy Launcher', 'LegacyLauncher.exe'));
    candidates.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'LegacyLauncher', 'LL.exe'));
  }
  candidates.push('C:\\Program Files\\LegacyLauncher\\LegacyLauncher.exe');
  candidates.push('C:\\Program Files (x86)\\LegacyLauncher\\LegacyLauncher.exe');

  for (const c of candidates) {
    try {
      if (c && fs.existsSync(c)) return c;
    } catch (_) {}
  }
  return '';
}

function findLauncherExecutable(config = {}) {
  // 1. Explicit user configured path
  if (config.customLauncherPath && fs.existsSync(config.customLauncherPath)) {
    try {
      const stat = fs.statSync(config.customLauncherPath);
      if (stat.isFile()) return path.resolve(config.customLauncherPath);
    } catch (_) {}
  }

  // 2. Relative to configured minecraftPath (e.g. if minecraftPath is .tlauncher/legacy/Minecraft/game)
  if (config.minecraftPath) {
    const relativeCandidates = [
      path.join(config.minecraftPath, '..', 'LL.exe'),
      path.join(config.minecraftPath, 'LL.exe'),
      path.join(config.minecraftPath, '..', 'LegacyLauncher.exe'),
      path.join(config.minecraftPath, 'LegacyLauncher.exe')
    ];
    for (const c of relativeCandidates) {
      try {
        if (fs.existsSync(c) && fs.statSync(c).isFile()) return path.resolve(c);
      } catch (_) {}
    }
  }

  // 3. Known launcher install locations
  const defaultPath = getDefaultLauncherPath();
  if (defaultPath && fs.existsSync(defaultPath)) {
    return path.resolve(defaultPath);
  }

  return null;
}

function findTlProperties(config = {}, launcherExe = null) {
  const candidates = [];
  if (launcherExe) {
    candidates.push(path.join(path.dirname(launcherExe), 'tl.properties'));
  }
  if (process.env.APPDATA) {
    candidates.push(path.join(process.env.APPDATA, '.tlauncher', 'legacy', 'Minecraft', 'tl.properties'));
    candidates.push(path.join(process.env.APPDATA, '.tlauncher', 'tl.properties'));
  }
  if (config.minecraftPath) {
    candidates.push(path.join(config.minecraftPath, '..', 'tl.properties'));
    candidates.push(path.join(config.minecraftPath, 'tl.properties'));
  }
  for (const c of candidates) {
    try {
      if (c && fs.existsSync(c) && fs.statSync(c).isFile()) return path.resolve(c);
    } catch (_) {}
  }
  return null;
}

function setLauncherSelectedVersion(versionName, config = {}) {
  const launcherExe = findLauncherExecutable(config);
  const tlPropsPath = findTlProperties(config, launcherExe);
  let updatedTl = false;

  if (tlPropsPath && fs.existsSync(tlPropsPath)) {
    try {
      let content = fs.readFileSync(tlPropsPath, 'utf8');
      if (/^login\.version=.*$/m.test(content)) {
        content = content.replace(/^login\.version=.*$/m, `login.version=${versionName}`);
      } else {
        content += `\nlogin.version=${versionName}\n`;
      }
      fs.writeFileSync(tlPropsPath, content, 'utf8');
      updatedTl = true;
    } catch (err) {
      console.error('Failed to update tl.properties:', err);
    }
  }

  // Also update launcher_profiles.json if present for vanilla launcher compatibility
  const profilePaths = [
    path.join(config.minecraftPath || '', 'launcher_profiles.json'),
    path.join(process.env.APPDATA || '', '.minecraft', 'launcher_profiles.json')
  ];
  let updatedProfiles = false;
  for (const profPath of profilePaths) {
    try {
      if (fs.existsSync(profPath)) {
        const json = JSON.parse(fs.readFileSync(profPath, 'utf8'));
        if (json && json.profiles) {
          let found = false;
          for (const key of Object.keys(json.profiles)) {
            if (json.profiles[key].lastVersionId === versionName || json.profiles[key].name === versionName) {
              json.selectedProfile = key;
              found = true;
              break;
            }
          }
          if (!found) {
            const profileKey = versionName.toLowerCase().replace(/[^a-z0-9]/g, '_');
            json.profiles[profileKey] = {
              name: versionName,
              lastVersionId: versionName,
              type: 'custom',
              created: new Date().toISOString(),
              icon: 'Chest'
            };
            json.selectedProfile = profileKey;
          }
          fs.writeFileSync(profPath, JSON.stringify(json, null, 2), 'utf8');
          updatedProfiles = true;
        }
      }
    } catch (_) {}
  }

  return {
    success: updatedTl || updatedProfiles || true,
    updatedTl,
    updatedProfiles,
    versionName,
    tlPropsPath
  };
}

function getDefaultConfig() {
  return {
    minecraftPath: getDefaultMinecraftPath(),
    instancesPath: getDefaultCurseForgePath(),
    cleanSync: true,
    includeSaves: false,
    autoScanOnStart: true,
    customLauncherPath: getDefaultLauncherPath(),
    firstRunCompleted: false
  };
}

function loadConfig() {
  const configPath = getConfigFilePath();
  const defaults = getDefaultConfig();
  if (fs.existsSync(configPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const merged = { ...defaults, ...data };
      if (!merged.customLauncherPath) {
        merged.customLauncherPath = getDefaultLauncherPath();
      }
      return merged;
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
  getDefaultLauncherPath,
  findLauncherExecutable,
  findTlProperties,
  setLauncherSelectedVersion,
  getConfigFilePath,
  getDefaultConfig,
  loadConfig,
  saveConfig
};
