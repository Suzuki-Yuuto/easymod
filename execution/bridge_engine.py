#!/usr/bin/env python3
"""
Legacy Launcher Modpack Bridge — Deterministic Python CLI / Verification Tool
Layer 3 Execution Script (Deterministic Engine)
"""

import os
import sys
import json
import shutil
import argparse
from pathlib import Path

def get_default_paths():
    appdata = os.environ.get("APPDATA", "")
    userprofile = os.environ.get("USERPROFILE", os.path.expanduser("~"))

    mc_path = os.path.join(appdata, ".minecraft")
    cf_path = os.path.join(userprofile, "curseforge", "minecraft", "Instances")

    # Fallback checks
    if not os.path.exists(cf_path):
        for drive in ["D:\\", "E:\\", "F:\\"]:
            alt = os.path.join(drive, "curseforge", "minecraft", "Instances")
            if os.path.exists(alt):
                cf_path = alt
                break

    return mc_path, cf_path

def sanitize_name(name: str) -> str:
    for ch in '<>:"/\\|?*':
        name = name.replace(ch, "_")
    return name.strip()

def scan_installed_versions(mc_path: str):
    versions_dir = os.path.join(mc_path, "versions")
    results = []
    if not os.path.exists(versions_dir):
        return results

    for entry in os.listdir(versions_dir):
        folder = os.path.join(versions_dir, entry)
        if not os.path.isdir(folder):
            continue
        json_file = os.path.join(folder, f"{entry}.json")
        if not os.path.exists(json_file):
            continue
        try:
            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            ver_id = data.get("id", entry)
            main_class = data.get("mainClass", "")
            id_lower = ver_id.lower()
            main_lower = main_class.lower()

            loader = "vanilla"
            if "neoforge" in id_lower or "neoforge" in main_lower:
                loader = "neoforge"
            elif "fabric" in id_lower or "fabricmc" in main_lower:
                loader = "fabric"
            elif "quilt" in id_lower or "quiltmc" in main_lower:
                loader = "quilt"
            elif "forge" in id_lower or "minecraftforge" in main_lower:
                loader = "forge"

            results.append({
                "id": ver_id,
                "folder": entry,
                "loader": loader,
                "inheritsFrom": data.get("inheritsFrom", "")
            })
        except Exception:
            continue
    return results

def scan_curseforge_instances(cf_path: str, mc_path: str):
    if not os.path.exists(cf_path):
        return []

    modpacks = []
    installed = scan_installed_versions(mc_path)
    installed_ids = {v["folder"] for v in installed}

    for entry in os.listdir(cf_path):
        inst_dir = os.path.join(cf_path, entry)
        if not os.path.isdir(inst_dir):
            continue
        cfg_file = os.path.join(inst_dir, "minecraftinstance.json")
        if not os.path.exists(cfg_file):
            continue
        try:
            with open(cfg_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            name = data.get("name", entry)
            sanitized = sanitize_name(name)
            game_ver = data.get("gameVersion", "Unknown")
            loader_info = data.get("baseModLoader", {}) or {}
            raw_loader = loader_info.get("name", "")

            loader_type = "unknown"
            if "forge" in raw_loader.lower() or loader_info.get("type") == 1:
                loader_type = "forge"
            elif "fabric" in raw_loader.lower() or loader_info.get("type") == 4:
                loader_type = "fabric"
            elif "neoforge" in raw_loader.lower() or loader_info.get("type") == 6:
                loader_type = "neoforge"
            elif "quilt" in raw_loader.lower() or loader_info.get("type") == 5:
                loader_type = "quilt"

            # Check mods count
            mods_dir = os.path.join(inst_dir, "mods")
            mod_count = 0
            if os.path.exists(mods_dir):
                mod_count = len([m for m in os.listdir(mods_dir) if m.endswith(".jar")])

            # Check sync status
            home_dir = os.path.join(mc_path, "home", sanitized)
            ver_dir = os.path.join(mc_path, "versions", sanitized)
            is_synced = sanitized in installed_ids and os.path.exists(home_dir)

            modpacks.append({
                "name": name,
                "sanitizedName": sanitized,
                "gameVersion": game_ver,
                "loader": loader_type,
                "rawLoader": raw_loader,
                "modCount": mod_count,
                "isSynced": is_synced,
                "instanceDir": inst_dir,
                "homeDir": home_dir,
                "versionDir": ver_dir
            })
        except Exception as e:
            continue
    return modpacks

def sync_instance(modpack_name: str, base_version: str = None, clean: bool = True, include_saves: bool = False):
    mc_path, cf_path = get_default_paths()
    instances = scan_curseforge_instances(cf_path, mc_path)

    matched = next((p for p in instances if p["name"] == modpack_name or p["sanitizedName"] == modpack_name), None)
    if not matched:
        print(f"Error: Modpack '{modpack_name}' not found in {cf_path}", file=sys.stderr)
        return False

    target_name = matched["sanitizedName"]
    versions_dir = os.path.join(mc_path, "versions")
    target_ver_dir = os.path.join(versions_dir, target_name)
    target_home_dir = os.path.join(mc_path, "home", target_name)

    # 1. Clone full version directory if base provided and not yet created
    if base_version and not os.path.exists(target_ver_dir):
        base_dir = os.path.join(versions_dir, base_version)
        if not os.path.exists(base_dir):
            print(f"Error: Base version '{base_version}' not found in {versions_dir}", file=sys.stderr)
            return False

        # Clone whole base version directory (including natives, jars, json, etc.)
        shutil.copytree(base_dir, target_ver_dir, dirs_exist_ok=True)

        # Rename base_version files to target_name
        for fname in os.listdir(target_ver_dir):
            if fname.startswith(base_version):
                new_fname = fname.replace(base_version, target_name)
                if fname != new_fname:
                    os.rename(
                        os.path.join(target_ver_dir, fname),
                        os.path.join(target_ver_dir, new_fname)
                    )

        target_json = os.path.join(target_ver_dir, f"{target_name}.json")
        if not os.path.exists(target_json):
            # Fallback rename any remaining json
            for fname in os.listdir(target_ver_dir):
                if fname.endswith(".json"):
                    os.rename(os.path.join(target_ver_dir, fname), target_json)
                    break

        # Edit id and family inside the json
        if os.path.exists(target_json):
            with open(target_json, "r", encoding="utf-8") as f:
                jdata = json.load(f)
            jdata["id"] = target_name
            jdata["family"] = target_name
            from datetime import datetime, timezone
            jdata["time"] = datetime.now(timezone.utc).isoformat()
            with open(target_json, "w", encoding="utf-8") as f:
                json.dump(jdata, f, indent=2)

        print(f"✓ Created version definition with family & id: {target_json}")

    # 2. Clone base home directory if it exists and target_home_dir does not exist
    base_home_dir = os.path.join(mc_path, "home", base_version) if base_version else None
    if not os.path.exists(target_home_dir):
        if base_home_dir and os.path.exists(base_home_dir):
            shutil.copytree(base_home_dir, target_home_dir)
            print(f"✓ Cloned base home directory from {base_home_dir}")
        else:
            os.makedirs(target_home_dir, exist_ok=True)
    else:
        if base_home_dir and os.path.exists(base_home_dir):
            shutil.copytree(base_home_dir, target_home_dir, dirs_exist_ok=True)

    # 3. Paste CurseForge instance contents inside target_home_dir, replacing conflicts
    inst_dir = matched["instanceDir"]
    ignored = {".git", ".curseclient", "cache"}
    if not include_saves:
        ignored.add("saves")

    copied = 0
    for root, dirs, files in os.walk(inst_dir):
        # Exclude ignored directories
        dirs[:] = [d for d in dirs if d not in ignored]

        rel_dir = os.path.relpath(root, inst_dir)
        dest_dir = target_home_dir if rel_dir == "." else os.path.join(target_home_dir, rel_dir)
        os.makedirs(dest_dir, exist_ok=True)

        for file in files:
            if file == ".gitignore":
                continue
            src_f = os.path.join(root, file)
            dst_f = os.path.join(dest_dir, file)
            shutil.copy2(src_f, dst_f)
            copied += 1

    # 4. Clean sync - remove orphaned mods if requested
    if clean:
        target_mods = os.path.join(target_home_dir, "mods")
        src_mods = os.path.join(inst_dir, "mods")
        if os.path.exists(target_mods) and os.path.exists(src_mods):
            src_mod_names = set(os.listdir(src_mods))
            for f in os.listdir(target_mods):
                if (f.endswith(".jar") or f.endswith(".jar.disabled")) and f not in src_mod_names:
                    try:
                        os.remove(os.path.join(target_mods, f))
                    except Exception:
                        pass

    # 5. Write sync meta
    from datetime import datetime, timezone
    meta = {
        "modpackName": matched["name"],
        "targetName": target_name,
        "source": inst_dir,
        "lastSynced": datetime.now(timezone.utc).isoformat(),
        "totalFiles": copied,
        "cleanSync": clean,
        "includeSaves": include_saves
    }
    with open(os.path.join(target_home_dir, ".sync-meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"✓ Synchronized '{matched['name']}' to: {target_home_dir}")
    return True

def main():
    parser = argparse.ArgumentParser(description="Legacy Launcher Modpack Bridge CLI")
    parser.add_argument("--scan", action="store_true", help="Scan and print detected modpacks and loaders")
    parser.add_argument("--sync", type=str, help="Modpack name to sync")
    parser.add_argument("--base", type=str, help="Base version ID to clone from")
    parser.add_argument("--clean", action="store_true", default=True, help="Clean deleted mods")
    parser.add_argument("--include-saves", action="store_true", default=False, help="Include world saves")

    args = parser.parse_args()
    mc_path, cf_path = get_default_paths()

    if args.scan or len(sys.argv) == 1:
        print("=== Legacy Launcher Modpack Bridge — Scanner ===")
        print(f"CurseForge: {cf_path}")
        print(f".minecraft:  {mc_path}\n")

        installed = scan_installed_versions(mc_path)
        print(f"Installed Loaders in .minecraft/versions ({len(installed)}):")
        for v in installed:
            print(f"  • [{v['loader'].upper()}] {v['id']}")

        modpacks = scan_curseforge_instances(cf_path, mc_path)
        print(f"\nCurseForge Instances ({len(modpacks)}):")
        for p in modpacks:
            status = "SYNCED" if p["isSynced"] else "NOT SYNCED"
            print(f"  • {p['name']} | MC {p['gameVersion']} | {p['rawLoader']} | {p['modCount']} mods | [{status}]")
    elif args.sync:
        sync_instance(args.sync, base_version=args.base, clean=args.clean, include_saves=args.include_saves)

if __name__ == "__main__":
    main()
