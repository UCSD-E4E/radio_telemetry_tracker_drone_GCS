"""Development script for running the application.

Automatically builds the frontend, then runs the Python main entry point.
"""

from radio_telemetry_tracker_drone_gcs.main import main as app_main
from scripts.utils import build_frontend


def main() -> None:
    """Build frontend and run the app in development mode."""
    build_frontend()
    app_main()
