"""Build script for creating executable with PyInstaller."""

import logging
import subprocess
from pathlib import Path

from scripts.utils import build_frontend

logger = logging.getLogger(__name__)


def main() -> None:
    """Build the executable using PyInstaller."""
    root_dir = Path(__file__).parent.parent
    frontend_dir = build_frontend()

    # Base PyInstaller arguments
    cmd = [
        "pyinstaller",
        "--name=RTT-GCS",
        "--windowed",
        "--onefile",
        "--add-data", f"{frontend_dir / 'dist'}:frontend/dist",
    ]

    # Add icon if it exists
    icon_path = root_dir / "assets" / "icon.ico"
    if icon_path.exists():
        cmd.extend(["--icon", str(icon_path)])

    # Add main script
    cmd.append(str(root_dir / "radio_telemetry_tracker_drone_gcs" / "main.py"))

    logger.info("Building executable...")
    subprocess.run(cmd, check=True)  # noqa: S603
    logger.info("Build complete! Executable can be found in the dist directory.")
