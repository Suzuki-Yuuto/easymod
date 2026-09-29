const fs = require('fs-extra');
const path = require('path');
const { sanitizeName } = require('./scanner');

let isCancelled = false;

function cancelCurrentSync() {
  isCancelled = true;
}

/**
 * Collect all files to be copied from CurseForge instance to home folder.
 * Recursively copies everything from the CurseForge instance,
 * excluding only internal cache/git files, and saves (unless includeSaves is enabled).
 */
async function collectFilesToCopy(instanceDir, includeSaves = false) {
  const files = [];

  const ignoredDirs = new Set(['.git', '.curseclient', 'cache']);
  if (!includeSaves) {
    ignoredDirs.add('saves');
  }

  async function walk(currentDir) {
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch (err) {
      console.warn(`Could not read directory ${currentDir}:`, err);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(instanceDir, fullPath);

      if (entry.isDirectory()) {
        if (ignoredDirs.has(entry.name)) {
          continue;
        }
        await walk(fullPath);
      } else if (entry.isFile()) {
        // Skip gitignore or internal locks
        if (entry.name === '.gitignore') continue;
        try {
          const stat = await fs.stat(fullPath);
          files.push({
            sourcePath: fullPath,
            relPath,
            size: stat.size
          });
        } catch (_) {}
      }
    }
  }

  await walk(instanceDir);
  return files;
}

/**
 * Synchronize / Import a modpack into Minecraft / launcher root.
 * 
 * 1. Versions folder:
 *    Clone the whole base version directory (e.g. versions/Forge 1.20.1) and all its contents
 *    (natives/, jar, json) into versions/<targetName>.
 *    Rename <baseVersionId>.json to <targetName>.json.
 *    Rename <baseVersionId>.jar to <targetName>.jar.
 *    In <targetName>.json:
 *      set id = targetName
 *      set family = targetName
 *      set time = new Date().toISOString()
 * 
 * 2. Home folder:
 *    Clone the whole base home directory (e.g. home/Forge 1.20.1) and all its contents
 *    into home/<targetName>.
 *    Paste all contents from the CurseForge instance directory into home/<targetName>,
 *    replacing any existing files.
 *    If cleanSync is enabled, remove obsolete mod jars from target mods/ folder.
 * 
 * @param {Object} options
 * @param {string} options.minecraftPath - Path to .minecraft
 * @param {Object} options.modpack - Modpack details
 * @param {string} options.baseVersionId - ID of base version to clone
 * @param {string} options.customName - Target name (defaults to modpack name)
 * @param {boolean} options.cleanSync - Delete removed mods in target
 * @param {boolean} options.includeSaves - Copy world saves
 * @param {boolean} options.skipVersionClone - Only sync files if version already created
 * @param {Function} onProgress - Callback for live progress
 */
async function syncModpack(options, onProgress) {
  isCancelled = false;

  const {
    minecraftPath,
    modpack,
    baseVersionId,
    customName,
    cleanSync = true,
    includeSaves = false,
    skipVersionClone = false
  } = options;

  const targetName = sanitizeName(customName || modpack.name);
  const instanceDir = modpack.instanceDir;

  const versionsDir = path.join(minecraftPath, 'versions');
  const targetVersionDir = path.join(versionsDir, targetName);
  const homeDir = path.join(minecraftPath, 'home');
  const targetHomeDir = path.join(homeDir, targetName);

  const emitProgress = (payload) => {
    if (typeof onProgress === 'function') {
      onProgress(payload);
    }
  };

  emitProgress({
    stage: 'initializing',
    message: 'Preparing directories and scanning files...',
    percent: 0,
    currentFile: '',
    copiedFiles: 0,
    totalFiles: 0,
    copiedBytes: 0,
    totalBytes: 0,
    speedMBs: 0
  });

  const effectiveBaseVersion = baseVersionId || modpack.matchedVersion;

  // ==========================================
  // Step 1: Versions Folder Setup
  // ==========================================
  if (!skipVersionClone && effectiveBaseVersion) {
    emitProgress({
      stage: 'version_cloning',
      message: `Cloning launcher version "${effectiveBaseVersion}" to "${targetName}"...`,
      percent: 5,
      currentFile: `${targetName}.json`
    });

    const baseVersionDir = path.join(versionsDir, effectiveBaseVersion);
    if (!await fs.pathExists(baseVersionDir)) {
      throw new Error(`Base version directory not found: ${baseVersionDir}`);
    }

    // Ensure target folder exists
    await fs.ensureDir(targetVersionDir);

    // 1. Clone the whole base version directory and its contents (natives, jar, json, etc.)
    await fs.copy(baseVersionDir, targetVersionDir, { overwrite: true });

    // 2. Rename <baseVersionId>.* files to <targetName>.*
    const versionFiles = await fs.readdir(targetVersionDir);
    for (const file of versionFiles) {
      if (file.startsWith(effectiveBaseVersion)) {
        const newFileName = file.replace(effectiveBaseVersion, targetName);
        if (file !== newFileName) {
          const oldFilePath = path.join(targetVersionDir, file);
          const newFilePath = path.join(targetVersionDir, newFileName);
          await fs.move(oldFilePath, newFilePath, { overwrite: true });
        }
      }
    }

    // Also handle case where json or jar had slightly different filename casing or format
    const targetJsonPath = path.join(targetVersionDir, `${targetName}.json`);
    if (!await fs.pathExists(targetJsonPath)) {
      const remainingFiles = await fs.readdir(targetVersionDir);
      const jsonCandidate = remainingFiles.find(f => f.endsWith('.json'));
      if (jsonCandidate) {
        await fs.move(path.join(targetVersionDir, jsonCandidate), targetJsonPath, { overwrite: true });
      }
    }

    // 3. Edit inside that json file: id, family, and time
    if (await fs.pathExists(targetJsonPath)) {
      const jsonContent = await fs.readJson(targetJsonPath);
      jsonContent.id = targetName;
      jsonContent.family = targetName;
      jsonContent.time = new Date().toISOString();
      await fs.writeJson(targetJsonPath, jsonContent, { spaces: 2 });
    }
  } else if (skipVersionClone) {
    // If skipping clone (e.g. re-sync), verify & self-repair json properties (id and family)
    const targetJsonPath = path.join(targetVersionDir, `${targetName}.json`);
    if (await fs.pathExists(targetJsonPath)) {
      try {
        const jsonContent = await fs.readJson(targetJsonPath);
        let modified = false;
        if (jsonContent.id !== targetName) {
          jsonContent.id = targetName;
          modified = true;
        }
        if (jsonContent.family !== targetName) {
          jsonContent.family = targetName;
          modified = true;
        }
        if (modified) {
          await fs.writeJson(targetJsonPath, jsonContent, { spaces: 2 });
        }
      } catch (_) {}
    }

    // If natives folder is missing in targetVersionDir, copy from base version
    const targetNativesDir = path.join(targetVersionDir, 'natives');
    if (!await fs.pathExists(targetNativesDir) && effectiveBaseVersion) {
      const baseNativesDir = path.join(versionsDir, effectiveBaseVersion, 'natives');
      if (await fs.pathExists(baseNativesDir)) {
        await fs.copy(baseNativesDir, targetNativesDir);
      }
    }
  }

  // ==========================================
  // Step 2: Home Folder Setup & Base Cloning
  // ==========================================
  const baseHomeDir = effectiveBaseVersion ? path.join(homeDir, effectiveBaseVersion) : null;
  const targetHomeExists = await fs.pathExists(targetHomeDir);

  if (!targetHomeExists) {
    // Fresh import: Clone the whole base home folder (e.g. home/Forge 1.20.1) and all contents
    if (baseHomeDir && await fs.pathExists(baseHomeDir)) {
      emitProgress({
        stage: 'home_cloning',
        message: `Cloning base home directory from "${effectiveBaseVersion}"...`,
        percent: 8,
        currentFile: 'Base configurations'
      });
      await fs.copy(baseHomeDir, targetHomeDir);
    } else {
      await fs.ensureDir(targetHomeDir);
    }
  } else {
    // Target home already exists: ensure directory exists and if base files are missing, bring them over
    if (baseHomeDir && await fs.pathExists(baseHomeDir)) {
      await fs.copy(baseHomeDir, targetHomeDir, { overwrite: false, errorOnExist: false });
    }
  }

  // ==========================================
  // Step 3: Collect Files from CurseForge Instance
  // ==========================================
  emitProgress({
    stage: 'file_scanning',
    message: 'Scanning CurseForge modpack files...',
    percent: 10,
    currentFile: ''
  });

  const filesToCopy = await collectFilesToCopy(instanceDir, includeSaves);
  const totalFiles = filesToCopy.length;
  const totalBytes = filesToCopy.reduce((acc, f) => acc + f.size, 0);

  // ==========================================
  // Step 4: Clean Sync - Remove Orphaned Mods
  // ==========================================
  if (cleanSync) {
    const targetModsDir = path.join(targetHomeDir, 'mods');
    if (await fs.pathExists(targetModsDir)) {
      try {
        const sourceModNames = new Set(
          filesToCopy
            .filter(f => f.relPath.startsWith('mods' + path.sep) || f.relPath.startsWith('mods/'))
            .map(f => path.basename(f.relPath))
        );

        const existingTargetMods = await fs.readdir(targetModsDir);
        for (const file of existingTargetMods) {
          if ((file.endsWith('.jar') || file.endsWith('.jar.disabled')) && !sourceModNames.has(file)) {
            await fs.remove(path.join(targetModsDir, file));
          }
        }
      } catch (err) {
        console.warn('Clean sync warning:', err);
      }
    }
  }

  // ==========================================
  // Step 5: Paste CurseForge Files into Target Home (Replacing conflicts)
  // ==========================================
  let copiedBytes = 0;
  let copiedFiles = 0;
  const startTime = Date.now();
  let lastTime = startTime;
  let lastBytes = 0;
  let currentSpeed = 0;

  for (let i = 0; i < filesToCopy.length; i++) {
    if (isCancelled) {
      throw new Error('Sync cancelled by user');
    }

    const item = filesToCopy[i];
    const destPath = path.join(targetHomeDir, item.relPath);

    await fs.ensureDir(path.dirname(destPath));
    await fs.copy(item.sourcePath, destPath, { overwrite: true });

    copiedBytes += item.size;
    copiedFiles++;

    const now = Date.now();
    const timeDelta = (now - lastTime) / 1000;
    if (timeDelta >= 0.25 || i === filesToCopy.length - 1) {
      const bytesDelta = copiedBytes - lastBytes;
      currentSpeed = timeDelta > 0 ? (bytesDelta / timeDelta) / (1024 * 1024) : 0;
      lastTime = now;
      lastBytes = copiedBytes;

      const filePercent = totalBytes > 0 
        ? Math.min(99, Math.round(10 + (copiedBytes / totalBytes) * 88)) 
        : Math.round(10 + (copiedFiles / (totalFiles || 1)) * 88);

      emitProgress({
        stage: 'copying',
        message: `Pasting modpack files (${copiedFiles}/${totalFiles})...`,
        percent: filePercent,
        currentFile: item.relPath,
        copiedFiles,
        totalFiles,
        copiedBytes,
        totalBytes,
        speedMBs: Number(currentSpeed.toFixed(2))
      });
    }
  }

  // ==========================================
  // Step 6: Write .sync-meta.json
  // ==========================================
  const syncMeta = {
    modpackName: modpack.name,
    targetName,
    sourceInstanceDir: instanceDir,
    gameVersion: modpack.gameVersion,
    loader: modpack.loader,
    loaderVersion: modpack.loaderVersion,
    baseVersionId: effectiveBaseVersion || targetName,
    lastSynced: new Date().toISOString(),
    totalFiles: copiedFiles,
    totalBytes: copiedBytes,
    cleanSync,
    includeSaves
  };

  await fs.writeJson(path.join(targetHomeDir, '.sync-meta.json'), syncMeta, { spaces: 2 });

  emitProgress({
    stage: 'completed',
    message: 'Modpack successfully imported & synchronized with EasyMod!',
    percent: 100,
    currentFile: 'Complete',
    copiedFiles,
    totalFiles,
    copiedBytes,
    totalBytes,
    speedMBs: 0,
    syncMeta
  });

  return {
    success: true,
    targetName,
    targetHomeDir,
    targetVersionDir,
    syncMeta
  };
}

module.exports = {
  syncModpack,
  cancelCurrentSync,
  collectFilesToCopy
};
