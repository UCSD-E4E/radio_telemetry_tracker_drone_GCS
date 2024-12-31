#!/usr/bin/env python3
"""Main entry point for the Radio Telemetry Tracker Drone Ground Control Station."""

import sys
from pathlib import Path

from PyQt6.QtCore import QUrl
from PyQt6.QtWebChannel import QWebChannel
from PyQt6.QtWebEngineCore import QWebEngineScript
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWidgets import QApplication

from radio_telemetry_tracker_drone_gcs.bridge import Bridge


class MainWindow(QWebEngineView):
    """Main window of the application using QWebEngineView."""

    def __init__(self) -> None:
        """Initialize the main window."""
        super().__init__()
        self.setWindowTitle("Radio Telemetry Tracker Drone GCS")

        # Set up web channel for backend communication
        self.channel = QWebChannel()
        self.bridge = Bridge()
        self.channel.registerObject("backend", self.bridge)
        self.page().setWebChannel(self.channel)

        # Inject QWebChannel initialization script
        script = QWebEngineScript()
        script.setName("qwebchannel")
        script.setSourceCode("""
            new QWebChannel(qt.webChannelTransport, function(channel) {
                window.backend = channel.objects.backend;
                window.backendLoaded = true;
                const event = new Event('backendLoaded');
                window.dispatchEvent(event);
            });
        """)
        script.setWorldId(QWebEngineScript.ScriptWorldId.MainWorld)
        script.setInjectionPoint(QWebEngineScript.InjectionPoint.DocumentReady)
        script.setRunsOnSubFrames(False)
        self.page().scripts().insert(script)

        # Set window properties
        self.resize(1200, 800)

        # Load the local web content
        local_url = QUrl.fromLocalFile(
            str(Path(__file__).parent.parent / "frontend" / "dist" / "index.html"),
        )
        self.setUrl(local_url)


def main() -> None:
    """Start the PyQt6 application."""
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
