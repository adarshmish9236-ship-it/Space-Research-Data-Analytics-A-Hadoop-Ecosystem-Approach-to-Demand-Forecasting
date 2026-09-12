"""
ORBITALYTICS — HDFS Initialization Script
==========================================
Mirrors the HDFS directory structure on local filesystem for development.
For real Hadoop cluster deployment, set USE_REAL_HDFS=true in .env
and ensure 'hadoop' CLI is in PATH.

HDFS Structure mirrored:
  /space/raw/missions
  /space/raw/launches
  /space/raw/satellites
  /space/raw/agencies
  /space/processed/missions
  /space/processed/launches
  /space/processed/satellites
  /space/processed/merged
  /space/analytics/yearly
  /space/analytics/country
  /space/analytics/mission_type
  /space/analytics/forecast
  /space/analytics/scenarios
  /space/models
"""

import os
import sys
import shutil
import subprocess
import logging
from pathlib import Path
from typing import Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s [HDFS] %(message)s")
log = logging.getLogger(__name__)

# HDFS path map: hdfs_path -> local_relative_path
HDFS_DIRECTORIES = [
    "/space/raw/missions",
    "/space/raw/launches",
    "/space/raw/satellites",
    "/space/raw/agencies",
    "/space/processed/missions",
    "/space/processed/launches",
    "/space/processed/satellites",
    "/space/processed/merged",
    "/space/analytics/yearly",
    "/space/analytics/country",
    "/space/analytics/mission_type",
    "/space/analytics/forecast",
    "/space/analytics/scenarios",
    "/space/models",
]


def hdfs_to_local(hdfs_path: str, base_local: str) -> str:
    """Convert HDFS path /space/raw/missions -> local path base_local/raw/missions."""
    rel = hdfs_path.lstrip("/space/").lstrip("/space")
    if hdfs_path.startswith("/space/"):
        rel = hdfs_path[len("/space/"):]
    elif hdfs_path.startswith("/space"):
        rel = hdfs_path[len("/space"):]
    return os.path.join(base_local, rel)


def run_hadoop_cmd(cmd: str) -> bool:
    """Run a hadoop fs command. Returns True on success."""
    try:
        result = subprocess.run(
            f"hadoop fs {cmd}",
            shell=True,
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0:
            log.info(f"HDFS: hadoop fs {cmd} -> OK")
            return True
        else:
            log.warning(f"HDFS cmd failed: {result.stderr.strip()}")
            return False
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def init_hdfs_directories(
    use_real_hdfs: bool = False,
    local_base: str = "../data",
    replication_factor: int = 1,
) -> dict:
    """
    Initialize HDFS directory structure.

    Args:
        use_real_hdfs:      True = use actual hadoop fs commands
        local_base:         Base path for local filesystem mirror
        replication_factor: HDFS replication factor (1 for pseudo-distributed)

    Returns:
        Status dict with created directories and mode
    """
    status = {
        "mode": "real_hdfs" if use_real_hdfs else "local_mirror",
        "directories_created": [],
        "directories_failed": [],
    }

    log.info(f"Initializing HDFS structure (mode={status['mode']})")

    for hdfs_path in HDFS_DIRECTORIES:
        if use_real_hdfs:
            # Try real HDFS commands
            success = run_hadoop_cmd(f"-mkdir -p {hdfs_path}")
            if success:
                run_hadoop_cmd(
                    f"-setrep -R {replication_factor} {hdfs_path}"
                )
                status["directories_created"].append(hdfs_path)
            else:
                status["directories_failed"].append(hdfs_path)
        else:
            # Local filesystem mirror
            local_path = hdfs_to_local(hdfs_path, local_base)
            try:
                os.makedirs(local_path, exist_ok=True)
                log.info(f"  [LOCAL] {hdfs_path} -> {local_path}")
                status["directories_created"].append(hdfs_path)
            except OSError as e:
                log.error(f"  [FAIL] {hdfs_path}: {e}")
                status["directories_failed"].append(hdfs_path)

    log.info(
        f"HDFS init complete: "
        f"{len(status['directories_created'])} created, "
        f"{len(status['directories_failed'])} failed"
    )
    return status


def upload_to_hdfs(
    local_file: str,
    hdfs_dest: str,
    use_real_hdfs: bool = False,
    local_base: str = "../data",
    overwrite: bool = True,
) -> bool:
    """
    Upload a file to HDFS (or copy to local mirror).

    Args:
        local_file:   Source file on local filesystem
        hdfs_dest:    Destination HDFS path (e.g. /space/raw/missions/missions.csv)
        use_real_hdfs: Use actual hadoop fs -put
        local_base:   Base for local mirror
        overwrite:    Overwrite existing file

    Returns:
        True on success
    """
    if not os.path.exists(local_file):
        log.error(f"Source file not found: {local_file}")
        return False

    if use_real_hdfs:
        flag = "-f" if overwrite else ""
        return run_hadoop_cmd(f"-put {flag} {local_file} {hdfs_dest}")
    else:
        local_dest = hdfs_to_local(os.path.dirname(hdfs_dest), local_base)
        dest_file = os.path.join(local_dest, os.path.basename(local_file))
        os.makedirs(local_dest, exist_ok=True)
        if overwrite or not os.path.exists(dest_file):
            shutil.copy2(local_file, dest_file)
            log.info(f"  [COPY] {local_file} -> {dest_file}")
            return True
        log.info(f"  [SKIP] {dest_file} already exists")
        return True


def validate_hdfs_structure(
    use_real_hdfs: bool = False,
    local_base: str = "../data",
) -> dict:
    """Validate that all required HDFS directories exist."""
    results = {}
    for hdfs_path in HDFS_DIRECTORIES:
        if use_real_hdfs:
            exists = run_hadoop_cmd(f"-test -d {hdfs_path}")
        else:
            local_path = hdfs_to_local(hdfs_path, local_base)
            exists = os.path.isdir(local_path)
        results[hdfs_path] = "OK" if exists else "MISSING"

    missing = [p for p, s in results.items() if s == "MISSING"]
    if missing:
        log.warning(f"Missing HDFS paths: {missing}")
    else:
        log.info("All HDFS directories validated OK")
    return results


def bulk_upload_raw_data(
    raw_data_dir: str,
    use_real_hdfs: bool = False,
    local_base: str = "../data",
) -> dict:
    """Upload all CSV files from raw_data_dir to their HDFS paths."""
    file_map = {
        "missions.csv":  "/space/raw/missions/missions.csv",
        "launches.csv":  "/space/raw/launches/launches.csv",
        "satellites.csv": "/space/raw/satellites/satellites.csv",
        "agencies.csv":  "/space/raw/agencies/agencies.csv",
    }
    results = {}
    for filename, hdfs_dest in file_map.items():
        local_file = os.path.join(raw_data_dir, filename)
        if os.path.exists(local_file):
            size_mb = os.path.getsize(local_file) / (1024 * 1024)
            log.info(f"Uploading {filename} ({size_mb:.1f} MB)...")
            success = upload_to_hdfs(local_file, hdfs_dest, use_real_hdfs, local_base)
            results[filename] = "OK" if success else "FAILED"
        else:
            log.warning(f"File not found: {local_file}")
            results[filename] = "NOT_FOUND"
    return results


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="ORBITALYTICS HDFS Initialization")
    parser.add_argument("--real-hdfs", action="store_true", help="Use real Hadoop HDFS")
    parser.add_argument("--local-base", default="../data", help="Local base directory")
    parser.add_argument("--raw-data", default="../data/raw", help="Raw data directory")
    parser.add_argument("--validate-only", action="store_true", help="Only validate structure")
    args = parser.parse_args()

    if args.validate_only:
        results = validate_hdfs_structure(args.real_hdfs, args.local_base)
        for path, status in results.items():
            print(f"  {'OK' if status == 'OK' else 'MISS'} {path}")
    else:
        init_status = init_hdfs_directories(args.real_hdfs, args.local_base)
        upload_results = bulk_upload_raw_data(args.raw_data, args.real_hdfs, args.local_base)
        print("\nHDFS Init Status:")
        print(f"  Mode: {init_status['mode']}")
        print(f"  Directories: {len(init_status['directories_created'])} created")
        print("\nUpload Results:")
        for f, r in upload_results.items():
            print(f"  {r:10s} {f}")
