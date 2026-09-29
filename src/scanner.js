const fs = require('fs');
const path = require('path');
const os = require('os');

// Load CurseForge API key from environment (.env)
const CF_API_KEY = process.env.CURSEFORGE_API_KEY || '';

function getThumbnailsCacheDir() {
  const newBaseDir = process.env.APPDATA 
    ? path.join(process.env.APPDATA, 'easymod-bridge')
    : path.join(os.homedir(), '.easymod-bridge');
  const oldBaseDir = process.env.APPDATA 
    ? path.join(process.env.APPDATA, 'legacy-launcher-modpack-bridge')
    : path.join(os.homedir(), '.legacy-launcher-modpack-bridge');
  
  if (fs.existsSync(oldBaseDir) && !fs.existsSync(newBaseDir)) {
    try {
      fs.cpSync(oldBaseDir, newBaseDir, { recursive: true });
    } catch (_) {}
  }

  const thumbsDir = path.join(newBaseDir, 'thumbnails');
  try {
    if (!fs.existsSync(thumbsDir)) {
      fs.mkdirSync(thumbsDir, { recursive: true });
    }
  } catch (_) {}
  return thumbsDir;
}

/**
 * Sanitize folder/version name for Windows filesystem compatibility.
 */
function sanitizeName(name) {
  if (!name) return 'Modpack';
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

/**
 * Convert an image file on disk to a Base64 data URL.
 * Preserves animated GIF and animated WebP frames for smooth 60fps playback.
 */
function imageToDataUri(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const ext = path.extname(filePath).toLowerCase();
    let mime = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
    if (ext === '.webp') mime = 'image/webp';
    if (ext === '.gif') mime = 'image/gif';
    if (ext === '.svg') mime = 'image/svg+xml';
    const buffer = fs.readFileSync(filePath);
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (err) {
    return null;
  }
}

// In-memory metadata cache for modpack author / logo info
const apiMetadataCache = new Map();

/**
 * Fetch official modpack logo and author info from CurseForge API
 */
async function fetchCurseForgeMetadata(projectID) {
  if (!projectID) return null;
  if (apiMetadataCache.has(projectID)) {
    return apiMetadataCache.get(projectID);
  }

  const cacheDir = getThumbnailsCacheDir();
  const metaPath = path.join(cacheDir, `${projectID}_meta.json`);

  // Check cached JSON metadata first
  if (fs.existsSync(metaPath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      apiMetadataCache.set(projectID, cached);
      return cached;
    } catch (_) {}
  }

  try {
    const res = await fetch(`https://api.curseforge.com/v1/mods/${projectID}`, {
      headers: {
        'Accept': 'application/json',
        'x-api-key': CF_API_KEY
      }
    });

    if (!res.ok) return null;
    const json = await res.json();
    const data = json.data;
    if (!data) return null;

    const logoUrl = data.logo?.url || data.logo?.thumbnailUrl;
    const authors = data.authors && data.authors.length > 0
      ? data.authors.map(a => a.name).join(', ')
      : '';

    let localImagePath = null;
    if (logoUrl) {
      const ext = path.extname(new URL(logoUrl).pathname) || '.png';
      const savePath = path.join(cacheDir, `${projectID}${ext}`);

      // Download if not already saved
      if (!fs.existsSync(savePath)) {
        const imgRes = await fetch(logoUrl);
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          fs.writeFileSync(savePath, buffer);
          localImagePath = savePath;
        }
      } else {
        localImagePath = savePath;
      }
    }

    const result = {
      projectID,
      authors,
      logoUrl,
      localImagePath
    };

    // Save cache JSON
    try {
      fs.writeFileSync(metaPath, JSON.stringify(result, null, 2), 'utf8');
    } catch (_) {}

    apiMetadataCache.set(projectID, result);
    return result;
  } catch (err) {
    return null;
  }
}

/**
 * Resolve profile image or animated GIF/WebP for a CurseForge instance.
 * Prioritizes the official CurseForge modpack artwork over outdated local previews or placeholders.
 */
async function resolveProfileImage(instanceDir, rawJson) {
  const projectID = rawJson?.projectID;
  const profileImagePath = rawJson?.profileImagePath;
  const manifestImage = rawJson?.manifest?.image;

  // 1. Primary: If projectID exists, fetch/use official CurseForge modpack avatar (supports animated WebP & GIF)
  if (projectID) {
    const meta = await fetchCurseForgeMetadata(projectID);
    if (meta && meta.localImagePath && fs.existsSync(meta.localImagePath)) {
      const uri = imageToDataUri(meta.localImagePath);
      if (uri) return uri;
    }
  }

  // 2. Direct path from json (if explicitly specified and not default CF- placeholder)
  if (profileImagePath && fs.existsSync(profileImagePath) && !profileImagePath.includes('CF-')) {
    const uri = imageToDataUri(profileImagePath);
    if (uri) return uri;
  }

  // 3. Relative to instance
  if (profileImagePath && !profileImagePath.includes('CF-')) {
    const relPath = path.join(instanceDir, profileImagePath);
    if (fs.existsSync(relPath)) {
      const uri = imageToDataUri(relPath);
      if (uri) return uri;
    }
  }

  // 4. Look inside `profileImage` directory for any image or animated GIF/WebP (if not default CF-)
  const profileDir = path.join(instanceDir, 'profileImage');
  if (fs.existsSync(profileDir)) {
    try {
      const files = fs.readdirSync(profileDir);
      for (const file of files) {
        if (file.startsWith('CF-')) continue; // Skip default CF placeholders
        const ext = path.extname(file).toLowerCase();
        if (['.gif', '.webp', '.png', '.jpg', '.jpeg'].includes(ext)) {
          const uri = imageToDataUri(path.join(profileDir, file));
          if (uri) return uri;
        }
      }
    } catch (_) {}
  }

  // 5. Look for icon.gif, icon.webp, icon.png, or modpack.png in instance root
  for (const name of ['icon.gif', 'icon.webp', 'icon.png', 'modpack.png', 'pack.png', 'icon.jpg']) {
    const iconFile = path.join(instanceDir, name);
    if (fs.existsSync(iconFile)) {
      const uri = imageToDataUri(iconFile);
      if (uri) return uri;
    }
  }

  // 6. Fallback: CurseForge default app placeholder assets (e.g. CF-1.webp)
  if (manifestImage) {
    const defaultAssetDir = path.join(process.env.APPDATA || '', 'CurseForge', 'CfApp_Assets', 'ModpackImages', 'default');
    const assetName = path.basename(manifestImage);
    const assetPath = path.join(defaultAssetDir, assetName);
    if (fs.existsSync(assetPath)) {
      const uri = imageToDataUri(assetPath);
      if (uri) return uri;
    }
  }

  return null;
}

/**
 * Detect loader details from loader string and type number.
 */
function parseLoaderInfo(baseModLoader, rawJson) {
  let type = 'unknown';
  let version = '';
  let rawName = '';

  if (baseModLoader) {
    rawName = baseModLoader.name || '';
    version = baseModLoader.forgeVersion || '';

    if (baseModLoader.type === 1 || rawName.toLowerCase().includes('forge')) {
      type = 'forge';
    } else if (baseModLoader.type === 4 || rawName.toLowerCase().includes('fabric')) {
      type = 'fabric';
    } else if (baseModLoader.type === 5 || rawName.toLowerCase().includes('quilt')) {
      type = 'quilt';
    } else if (baseModLoader.type === 6 || rawName.toLowerCase().includes('neoforge')) {
      type = 'neoforge';
    }
  }

  if (type === 'unknown' && rawJson) {
    const lower = JSON.stringify(rawJson).toLowerCase();
    if (lower.includes('neoforge')) type = 'neoforge';
    else if (lower.includes('fabric')) type = 'fabric';
    else if (lower.includes('quilt')) type = 'quilt';
    else if (lower.includes('forge')) type = 'forge';
  }

  return { type, version, rawName };
}

/**
 * Scan installed versions in .minecraft/versions
 */
function scanInstalledVersions(minecraftPath) {
  const versionsDir = path.join(minecraftPath, 'versions');
  if (!fs.existsSync(versionsDir)) {
    return [];
  }

  const results = [];
  try {
    const entries = fs.readdirSync(versionsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const folderName = entry.name;
      const jsonPath = path.join(versionsDir, folderName, `${folderName}.json`);
      if (!fs.existsSync(jsonPath)) continue;

      try {
        const raw = fs.readFileSync(jsonPath, 'utf8');
        const data = JSON.parse(raw);
        const id = data.id || folderName;
        const mainClass = data.mainClass || '';
        const inheritsFrom = data.inheritsFrom || '';
        const idLower = id.toLowerCase();
        const mainClassLower = mainClass.toLowerCase();

        let loader = 'vanilla';
        if (idLower.includes('neoforge') || mainClassLower.includes('neoforge')) {
          loader = 'neoforge';
        } else if (idLower.includes('fabric') || mainClassLower.includes('fabricmc')) {
          loader = 'fabric';
        } else if (idLower.includes('quilt') || mainClassLower.includes('quiltmc')) {
          loader = 'quilt';
        } else if (idLower.includes('forge') || mainClassLower.includes('minecraftforge')) {
          loader = 'forge';
        }

        let mcVersion = inheritsFrom || '';
        if (!mcVersion) {
          const match = id.match(/1\.\d+(\.\d+)?/);
          if (match) mcVersion = match[0];
          else if (data.clientVersion) mcVersion = data.clientVersion;
          else if (data.complianceLevel !== undefined) mcVersion = id;
        }

        let loaderVersion = '';
        if (loader === 'forge') {
          const forgeMatch = id.match(/forge[-_ ]?([0-9.]+)/i);
          if (forgeMatch) loaderVersion = forgeMatch[1];
        } else if (loader === 'fabric') {
          const fabricMatch = id.match(/fabric[-_ ]?([0-9.]+)/i);
          if (fabricMatch) loaderVersion = fabricMatch[1];
        }

        const jarPath = path.join(versionsDir, folderName, `${folderName}.jar`);
        const hasJar = fs.existsSync(jarPath);

        results.push({
          id,
          folderName,
          mcVersion,
          loader,
          loaderVersion,
          hasJar,
          jsonPath,
          inheritsFrom,
          type: data.type || 'release'
        });
      } catch (_) {}
    }
  } catch (err) {
    console.error('Failed reading versions directory:', err);
  }

  return results;
}

/**
 * Scan CurseForge instances (async to support animated GIF/WebP and official CurseForge modpack logos)
 */
async function scanCurseForgeInstances(instancesPath, minecraftPath, installedVersions) {
  if (!fs.existsSync(instancesPath)) {
    return [];
  }

  const modpacks = [];
  try {
    const entries = fs.readdirSync(instancesPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const instanceDir = path.join(instancesPath, entry.name);
      const instanceJsonPath = path.join(instanceDir, 'minecraftinstance.json');

      if (!fs.existsSync(instanceJsonPath)) continue;

      try {
        const rawJson = JSON.parse(fs.readFileSync(instanceJsonPath, 'utf8'));
        const name = rawJson.name || entry.name;
        const sanitizedName = sanitizeName(name);
        const gameVersion = rawJson.gameVersion || 'Unknown';
        const packVersion = rawJson.manifest?.version || (rawJson.installedAddon?.addonFile?.displayName) || '';
        const loaderInfo = parseLoaderInfo(rawJson.baseModLoader, rawJson);
        const thumbnail = await resolveProfileImage(instanceDir, rawJson);

        // Resolve author from json, manifest, or official CurseForge API
        let author = rawJson.customAuthor || (rawJson.manifest ? rawJson.manifest.author : '');
        if ((!author || author === 'Unknown') && rawJson.projectID) {
          const meta = await fetchCurseForgeMetadata(rawJson.projectID);
          if (meta && meta.authors) {
            author = meta.authors;
          }
        }
        if (!author) author = 'Unknown';

        // Count mods
        let modCount = 0;
        const modsDir = path.join(instanceDir, 'mods');
        if (fs.existsSync(modsDir)) {
          try {
            const modFiles = fs.readdirSync(modsDir);
            modCount = modFiles.filter(f => f.endsWith('.jar') || f.endsWith('.jar.disabled')).length;
          } catch (_) {}
        }

        // Check extra folders
        const extraFolders = [];
        for (const dirName of ['config', 'defaultconfigs', 'datapacks', 'resourcepacks', 'shaderpacks', 'kubejs', 'scripts', 'patchouli_books', 'easy_npc', 'saves']) {
          if (fs.existsSync(path.join(instanceDir, dirName))) {
            extraFolders.push(dirName);
          }
        }

        // Check sync status in .minecraft
        let effectiveTargetName = sanitizedName;
        let targetVersionDir = path.join(minecraftPath, 'versions', effectiveTargetName);
        let targetJson = path.join(targetVersionDir, `${effectiveTargetName}.json`);
        let targetHomeDir = path.join(minecraftPath, 'home', effectiveTargetName);

        let isSynced = fs.existsSync(targetJson) && fs.existsSync(targetHomeDir);

        // If not synced with raw sanitizedName, check if user imported with a clean/short name
        // (e.g. "Linggango" for "Linggango - [V6.6.5b IS OUT]", "Otherworld" for "Otherworld [Dungeons & Dragons]")
        if (!isSynced) {
          const simplifiedName = name.replace(/^\[.*?\]\s*/, '').split(/[-[\(]/)[0].trim();
          if (simplifiedName && simplifiedName !== sanitizedName) {
            const altVersionDir = path.join(minecraftPath, 'versions', simplifiedName);
            const altJson = path.join(altVersionDir, `${simplifiedName}.json`);
            const altHomeDir = path.join(minecraftPath, 'home', simplifiedName);
            if (fs.existsSync(altJson) && fs.existsSync(altHomeDir)) {
              effectiveTargetName = simplifiedName;
              targetVersionDir = altVersionDir;
              targetJson = altJson;
              targetHomeDir = altHomeDir;
              isSynced = true;
            }
          }
        }

        const syncMetaPath = path.join(targetHomeDir, '.sync-meta.json');
        let syncMeta = null;
        if (fs.existsSync(syncMetaPath)) {
          try {
            syncMeta = JSON.parse(fs.readFileSync(syncMetaPath, 'utf8'));
          } catch (_) {}
        }

        // Match with installed base versions
        const { status, matchedVersion, availableMatches, missingReason } = evaluateMatch(
          gameVersion,
          loaderInfo,
          installedVersions,
          isSynced,
          effectiveTargetName
        );

        modpacks.push({
          name,
          sanitizedName: effectiveTargetName,
          instanceDir,
          gameVersion,
          packVersion,
          loader: loaderInfo.type,
          loaderVersion: loaderInfo.version,
          rawLoaderName: loaderInfo.rawName,
          thumbnail,
          modCount,
          extraFolders,
          lastPlayed: rawJson.lastPlayed || null,
          author,
          status,
          matchedVersion,
          availableMatches,
          missingReason,
          isSynced,
          syncMeta,
          targetHomeDir,
          targetVersionDir
        });
      } catch (err) {
        console.error(`Error processing instance ${entry.name}:`, err);
      }
    }
  } catch (err) {
    console.error('Failed reading CurseForge instances directory:', err);
  }

  return modpacks;
}

/**
 * Match a modpack's requirements to installed base loaders
 */
function evaluateMatch(gameVersion, loaderInfo, installedVersions, isSynced, sanitizedName) {
  const reqLoader = loaderInfo.type;
  const reqVersion = loaderInfo.version;

  const candidates = installedVersions.filter(v => {
    if (v.folderName === sanitizedName) return false;
    const sameLoader = v.loader === reqLoader;
    const sameMc = v.mcVersion === gameVersion || v.folderName.includes(gameVersion);
    return sameLoader && sameMc;
  });

  const scored = candidates.map(c => {
    let score = 50;
    if (reqVersion && (c.id.includes(reqVersion) || c.loaderVersion === reqVersion)) {
      score += 40;
    }
    if (c.id.toLowerCase().startsWith(gameVersion) || c.id.toLowerCase().startsWith(reqLoader)) {
      score += 10;
    }
    return { ...c, score };
  }).sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    const best = scored[0];
    return {
      status: isSynced ? 'synced' : 'ready',
      matchedVersion: best.id,
      availableMatches: scored.map(s => s.id),
      missingReason: null
    };
  }

  if (isSynced) {
    return {
      status: 'synced',
      matchedVersion: sanitizedName,
      availableMatches: [sanitizedName],
      missingReason: null
    };
  }

  const loaderDisplay = reqLoader.charAt(0).toUpperCase() + reqLoader.slice(1);
  const versionHint = reqVersion ? ` (${reqVersion})` : '';
  return {
    status: 'missing_loader',
    matchedVersion: null,
    availableMatches: [],
    missingReason: `Requires ${loaderDisplay} ${gameVersion}${versionHint} installed in your launcher`
  };
}

module.exports = {
  sanitizeName,
  imageToDataUri,
  resolveProfileImage,
  scanInstalledVersions,
  scanCurseForgeInstances,
  evaluateMatch,
  fetchCurseForgeMetadata
};
