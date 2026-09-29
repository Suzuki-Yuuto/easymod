# EasyMod - Modpack Bridge

> Play your favorite CurseForge modpacks in any standard Minecraft launcher with 1-click.

CurseForge is the easiest place to discover and download modpacks, but playing them in custom or offline Minecraft launchers usually requires tedious manual copying, editing .json version files, and managing directories.

**EasyMod** automates the entire process. It auto-detects your modpacks, clones the required mod loader, and sets up isolated profiles in seconds.

---

## How It Works

1. **Download a Modpack** in the CurseForge app as you normally do.
2. **Open EasyMod** - your modpacks will appear automatically with their logos, versions, and loaders.
3. **Click "Sync to Launcher"** - EasyMod clones the loader, syncs all mods and configs, and configures the launcher version.

Open your Minecraft launcher, pick your modpack from the version list, and hit **Play**.

---

## Features

- **1-Click Sync**: No more copying .jar files or manually tweaking JSON manifests.
- **Isolated Profiles**: Every modpack gets its own isolated home directory (.minecraft/home/<modpack>), so mods, options, and configs never conflict between different modpacks.
- **Loader Guard**: Prevents crashes before they happen by detecting if the required base version (Forge, Fabric, NeoForge, Quilt) is installed.
- **Smart Re-Sync & Clean Sync**: Updated a modpack in CurseForge? Click "Re-Sync" to update your files. Clean Sync automatically removes outdated mods that were removed from the modpack.
- **World Protection**: Your single-player world saves are preserved and protected by default.
- **Instant Search & Filters**: Filter through your library by loader type (Forge, Fabric, NeoForge, Quilt) or search by name.

---

## Privacy & Safety

EasyMod is designed to be lightweight, transparent, and safe:

- **No Accounts or Passwords**: EasyMod never asks for or reads your Minecraft credentials, Microsoft accounts, or passwords.
- **100% Local (Zero Telemetry)**: No tracking, no analytics, no background telemetry, and no remote servers. Everything runs entirely on your PC.
- **No Administrator Rights**: Runs in standard user space without requiring UAC elevation.
- **Offline Ready**: Works completely offline using your local cached modpack assets.

---

## Getting Started

### For Players
1. Download the latest `EasyMod - Modpack Bridge Setup 1.0.0.exe` from the [Releases](https://github.com/kyleadriann/easymod/releases) tab.
2. Launch the installer (or portable executable).
3. On first launch, verify that your Minecraft and CurseForge folders are detected, then click **Get Started**.

---

### For Developers (Building from Source)

Prerequisites: [Node.js](https://nodejs.org/) (v18+)

```bash
# Clone the repository
git clone https://github.com/kyleadriann/easymod.git
cd easymod

# Install dependencies
npm install

# Start the application in development mode
npm start

# Run the test suite
npm run test:engine
```

#### Packaging Executables:
```bash
# Build standalone portable .exe (saved to dist/)
npm run dist:portable

# Build setup installer (saved to dist/)
npm run dist:installer
```

---

## License

Distributed under the [MIT License](LICENSE). Free for personal and community use.
