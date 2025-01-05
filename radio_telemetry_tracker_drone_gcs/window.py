"""Main window module for the Radio Telemetry Tracker Drone Ground Control Station.

This module creates a QWebEngineView to display the frontend (React/Leaflet app).
It injects QWebChannel code so the JS can communicate with Python via the CommunicationBridge.
"""

import logging
from pathlib import Path

from PyQt6.QtCore import QUrl
from PyQt6.QtWebChannel import QWebChannel
from PyQt6.QtWebEngineCore import QWebEngineScript
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWidgets import QMainWindow


class MainWindow(QMainWindow):
    """Main window of the application using QWebEngineView for the frontend."""

    def __init__(self) -> None:
        """Initialize the main window."""
        super().__init__()
        self.setWindowTitle("Radio Telemetry Tracker Drone GCS")

        self.web_view = QWebEngineView()
        self.setCentralWidget(self.web_view)

        # Set up the web channel for backend communication
        self.channel = QWebChannel()
        self.bridge = None
        self.web_view.page().setWebChannel(self.channel)

        # Enable developer tools
        self.web_view.page().setDevToolsPage(self.web_view.page())

        # Load finished handler
        self.web_view.loadFinished.connect(self._on_load_finished)

        # Inject QWebChannel initialization script into the frontend
        script = QWebEngineScript()
        script.setName("qwebchannel")
        script.setSourceCode(
            """
            new QWebChannel(qt.webChannelTransport, function(channel) {
                window.backend = channel.objects.backend;
                window.backendLoaded = true;
                const event = new Event('backendLoaded');
                window.dispatchEvent(event);
            });
            """,
        )
        script.setWorldId(QWebEngineScript.ScriptWorldId.MainWorld)
        script.setInjectionPoint(QWebEngineScript.InjectionPoint.DocumentReady)
        script.setRunsOnSubFrames(False)
        self.web_view.page().scripts().insert(script)

        # Configure window size
        self.resize(1280, 720)

        # Load the local web content (frontend)
        dist_path = Path(__file__).parent.parent / "frontend" / "dist" / "index.html"
        if not dist_path.exists():
            logging.error("Frontend dist not found at %s", dist_path)
            msg = f"Frontend dist not found at {dist_path}"
            raise FileNotFoundError(msg)

        local_url = QUrl.fromLocalFile(str(dist_path))
        logging.info("Loading frontend from %s", local_url.toString())
        self.web_view.setUrl(local_url)

    def _on_load_finished(self, *, ok: bool = True) -> None:
        """Handle page load completion."""
        if ok:
            logging.info("Frontend loaded successfully")
        else:
            logging.error("Failed to load frontend")

    def set_bridge(self, bridge: object) -> None:
        """Set the communication bridge object for backend communication.

        Registers it on the WebChannel so JS can access `window.backend`.
        """
        self.bridge = bridge
        self.channel.registerObject("backend", bridge)
        logging.info("Bridge registered with WebChannel")
