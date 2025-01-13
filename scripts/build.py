"""Build script for creating an executable with PyInstaller.

This script also handles building the frontend before bundling everything.
"""

import logging
import subprocess
from pathlib import Path

from radio_telemetry_tracker_drone_gcs.utils.paths import APP_NAME
from scripts.utils import build_frontend

logger = logging.getLogger(__name__)


def main() -> None:
    """Build the executable using PyInstaller."""
    root_dir = Path(__file__).parent.parent
    frontend_dir = build_frontend()

    cmd = [
        "pyinstaller",
        f"--name={APP_NAME}",
        "--windowed",
        "--onefile",
        "--add-data",
        f"{frontend_dir / 'dist'}:frontend/dist",
        # Add hidden imports for path utilities
        "--hidden-import=radio_telemetry_tracker_drone_gcs.utils.paths",
    ]

    # Optional: add an icon if you have one in assets/
    icon_path = root_dir / "assets" / "icon.ico"
    if icon_path.exists():
        cmd.extend(["--icon", str(icon_path)])

    # Main script
    cmd.append(str(root_dir / "radio_telemetry_tracker_drone_gcs" / "main.py"))

    logger.info("Building executable with PyInstaller...")
    subprocess.run(cmd, check=True)  # noqa: S603
    logger.info("Build complete! Executable can be found in the 'dist' directory.")
