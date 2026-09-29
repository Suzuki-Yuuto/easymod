const fs = require('fs-extra');
const path = require('path');
const { loadConfig, saveConfig } = require('../src/config');
const { scanInstalledVersions, scanCurseForgeInstances, sanitizeName } = require('../src/scanner');
const { syncModpack } = require('../src/synchronizer');

async function runTests() {
  console.log('=== Starting EasyMod — Modpack Bridge Engine Tests ===\n');

  // Test 1: Config loading & saving
  console.log('1. Testing Config Module...');
  const cfg = loadConfig();
  console.log('   - Detected .minecraft:', cfg.minecraftPath);
  console.log('   - Detected CurseForge:', cfg.instancesPath);
  if (!cfg.minecraftPath || !cfg.instancesPath) {
    throw new Error('Default paths resolution failed');
  }
  console.log('   ✓ Config test passed.\n');

  // Test 2: Scanner on real user system
  console.log('2. Testing Scanner Module with local system paths...');
  const installedVersions = scanInstalledVersions(cfg.minecraftPath);
  console.log(`   - Found ${installedVersions.length} installed versions in .minecraft/versions:`);
  installedVersions.forEach(v => console.log(`     * [${v.loader}] ${v.id} (MC: ${v.mcVersion || 'N/A'})`));

  const modpacks = await scanCurseForgeInstances(cfg.instancesPath, cfg.minecraftPath, installedVersions);
  console.log(`   - Found ${modpacks.length} CurseForge instances:`);
  modpacks.forEach(m => {
    console.log(`     * "${m.name}" | MC ${m.gameVersion} | Loader: ${m.loader} (${m.loaderVersion || 'N/A'}) | Status: ${m.status}`);
  });
  console.log('   ✓ Scanner test passed.\n');

  // Test 3: Synthetic Sandbox Synchronization Test
  console.log('3. Testing Synchronization & JSON Patching in Sandbox (.tmp/test_sandbox)...');
  const sandboxDir = path.join(__dirname, '..', '.tmp', 'test_sandbox');
  await fs.remove(sandboxDir);
  await fs.ensureDir(sandboxDir);

  const mockMinecraft = path.join(sandboxDir, '.minecraft');
  const mockBaseVersionDir = path.join(mockMinecraft, 'versions', '1.20.1-forge-47.4.18');
  await fs.ensureDir(mockBaseVersionDir);
  await fs.ensureDir(path.join(mockBaseVersionDir, 'natives'));
  await fs.writeFile(path.join(mockBaseVersionDir, 'natives', 'test_native.dll'), 'MOCK_DLL');

  // Create mock base version json
  const mockBaseJson = {
    id: '1.20.1-forge-47.4.18',
    family: 'Forge-1.20',
    inheritsFrom: '1.20.1',
    mainClass: 'net.minecraftforge.bootstrap.ForgeBootstrap',
    type: 'release'
  };
  await fs.writeJson(path.join(mockBaseVersionDir, '1.20.1-forge-47.4.18.json'), mockBaseJson);
  await fs.writeFile(path.join(mockBaseVersionDir, '1.20.1-forge-47.4.18.jar'), 'MOCK_JAR_BYTES');

  // Create mock base home directory
  const mockBaseHomeDir = path.join(mockMinecraft, 'home', '1.20.1-forge-47.4.18');
  await fs.ensureDir(mockBaseHomeDir);
  await fs.writeFile(path.join(mockBaseHomeDir, 'servers.dat'), 'MOCK_SERVERS');

  // Create mock CurseForge instance
  const mockInstanceDir = path.join(sandboxDir, 'curseforge_instance');
  await fs.ensureDir(path.join(mockInstanceDir, 'mods'));
  await fs.ensureDir(path.join(mockInstanceDir, 'config'));
  await fs.writeFile(path.join(mockInstanceDir, 'mods', 'test-mod-1.0.jar'), 'MOD1_DATA');
  await fs.writeFile(path.join(mockInstanceDir, 'mods', 'extra-mod-2.0.jar'), 'MOD2_DATA');
  await fs.writeFile(path.join(mockInstanceDir, 'config', 'config.json'), '{"setting": true}');
  await fs.writeFile(path.join(mockInstanceDir, 'options.txt'), 'fov:70');

  const mockModpack = {
    name: 'Epic Adventure Pack',
    sanitizedName: 'Epic Adventure Pack',
    instanceDir: mockInstanceDir,
    gameVersion: '1.20.1',
    loader: 'forge',
    loaderVersion: '47.4.18'
  };

  const progressEvents = [];
  const result = await syncModpack({
    minecraftPath: mockMinecraft,
    modpack: mockModpack,
    baseVersionId: '1.20.1-forge-47.4.18',
    cleanSync: true,
    includeSaves: false
  }, (progress) => {
    progressEvents.push(progress.stage);
  });

  console.log('   - Result:', result.success ? 'Success' : 'Failed');
  console.log('   - Progress stages visited:', [...new Set(progressEvents)].join(' -> '));

  // Verify cloned version JSON
  const clonedJsonPath = path.join(mockMinecraft, 'versions', 'Epic Adventure Pack', 'Epic Adventure Pack.json');
  if (!await fs.pathExists(clonedJsonPath)) {
    throw new Error('Cloned version JSON not found');
  }
  const clonedJson = await fs.readJson(clonedJsonPath);
  if (clonedJson.id !== 'Epic Adventure Pack') {
    throw new Error(`Expected cloned JSON id to be "Epic Adventure Pack", got "${clonedJson.id}"`);
  }
  if (clonedJson.family !== 'Epic Adventure Pack') {
    throw new Error(`Expected cloned JSON family to be "Epic Adventure Pack", got "${clonedJson.family}"`);
  }
  console.log('   ✓ JSON patched id:', clonedJson.id, '| family:', clonedJson.family);

  // Verify natives folder copied
  const clonedNative = path.join(mockMinecraft, 'versions', 'Epic Adventure Pack', 'natives', 'test_native.dll');
  if (!await fs.pathExists(clonedNative)) {
    throw new Error('Natives folder was not cloned into version directory');
  }
  console.log('   ✓ Natives cloned to versions folder.');

  // Verify home files copied (both base cloned servers.dat and CF options.txt)
  const homeMod1 = path.join(mockMinecraft, 'home', 'Epic Adventure Pack', 'mods', 'test-mod-1.0.jar');
  const homeConfig = path.join(mockMinecraft, 'home', 'Epic Adventure Pack', 'config', 'config.json');
  const homeOptions = path.join(mockMinecraft, 'home', 'Epic Adventure Pack', 'options.txt');
  const homeServers = path.join(mockMinecraft, 'home', 'Epic Adventure Pack', 'servers.dat');
  const metaPath = path.join(mockMinecraft, 'home', 'Epic Adventure Pack', '.sync-meta.json');

  if (!await fs.pathExists(homeMod1) || !await fs.pathExists(homeConfig) || !await fs.pathExists(homeOptions)) {
    throw new Error('Home files were not copied correctly');
  }
  if (!await fs.pathExists(homeServers)) {
    throw new Error('Base home servers.dat was not cloned into target home directory');
  }
  console.log('   ✓ Base home folder cloned & CurseForge files pasted on top.');
  if (!await fs.pathExists(metaPath)) {
    throw new Error('.sync-meta.json was not created');
  }
  const meta = await fs.readJson(metaPath);
  console.log(`   ✓ Synced ${meta.totalFiles} files (${meta.totalBytes} bytes) to isolated /home/ folder.`);

  // Cleanup sandbox
  await fs.remove(sandboxDir);
  console.log('   ✓ Sandbox cleaned up.\n');

  console.log('=== All Engine Tests Passed Successfully! ===');
}

runTests().catch(err => {
  console.error('\n❌ Test Error:', err);
  process.exit(1);
});
