#!/usr/bin/env python3
"""Main entry point for the Radio Telemetry Tracker Drone Ground Control Station."""

import sys
import threading

from PyQt6.QtWidgets import QApplication

from .bridge import Bridge
from .tile_server import start_tile_server
from .window import MainWindow


def main() -> int:
    """Start the RTT Drone GCS application.

    Returns:
        int: Application exit code
    """
    # Start tile server in a separate thread
    tile_server_thread = threading.Thread(target=start_tile_server, daemon=True)
    tile_server_thread.start()

    app = QApplication(sys.argv)
    window = MainWindow()
    bridge = Bridge()
    window.set_bridge(bridge)
    window.show()
    return app.exec()


if __name__ == "__main__":
    main()
