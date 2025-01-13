"""Build script for creating an executable with PyInstaller.

This script also handles building the frontend before bundling everything.
"""

import argparse
import logging
import subprocess
import sys
from pathlib import Path

from radio_telemetry_tracker_drone_gcs.utils.paths import APP_NAME
from scripts.utils import build_frontend

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def validate_main_script(root_dir: Path) -> Path:
    """Validate and return the path to the main script."""
    main_script = root_dir / "radio_telemetry_tracker_drone_gcs" / "main.py"
    if not main_script.exists():
        msg = f"Main script not found at {main_script}"
        raise FileNotFoundError(msg)
    return main_script


def validate_output(dist_dir: Path) -> None:
    """Validate that PyInstaller produced output files."""
    if not any(dist_dir.iterdir()):
        msg = "PyInstaller did not produce any output files"
        raise RuntimeError(msg)


def main() -> None:
    """Build the executable using PyInstaller."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--os", choices=["windows", "linux", "macos"], required=True)
    args = parser.parse_args()

    try:
        root_dir = Path(__file__).parent.parent
        logger.info("Building frontend...")
        frontend_dir = build_frontend()
        logger.info("Frontend build complete")

        cmd = [
            "pyinstaller",
            f"--name={APP_NAME}",
            "--windowed",
            "--onefile",
            "--add-data",
            f"{frontend_dir / 'dist'}{';' if args.os == 'windows' else ':'}frontend/dist",
            # Add hidden imports for path utilities
            "--hidden-import=radio_telemetry_tracker_drone_gcs.utils.paths",
        ]

        # Optional: add an icon if you have one in assets/
        icon_path = root_dir / "assets" / "icon.ico"
        if icon_path.exists():
            cmd.extend(["--icon", str(icon_path)])

        # Main script
        main_script = validate_main_script(root_dir)
        cmd.append(str(main_script))

        logger.info("Building executable with PyInstaller...")
        logger.info("Command: %s", " ".join(cmd))
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)  # noqa: S603

        if result.stdout:
            logger.info("PyInstaller output:\n%s", result.stdout)
        if result.stderr:
            logger.warning("PyInstaller warnings/errors:\n%s", result.stderr)

        dist_dir = root_dir / "dist"
        validate_output(dist_dir)
        logger.info("Build complete! Files in dist directory: %s", list(dist_dir.iterdir()))

    except Exception:
        logger.exception("Build failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
