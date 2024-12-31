"""Development script for running the application with frontend build."""

from radio_telemetry_tracker_drone_gcs.main import main as app_main
from scripts.utils import build_frontend


def main() -> None:
    """Build frontend and run the application in development mode."""
    build_frontend()
    app_main()
