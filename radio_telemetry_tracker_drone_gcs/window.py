"""Main window module for the Radio Telemetry Tracker Drone GCS.

Creates a QWebEngineView to display the React/Leaflet frontend
and injects QWebChannel code for communication with Python.
"""

import logging
from pathlib import Path

from PyQt6.QtCore import QUrl
from PyQt6.QtWebChannel import QWebChannel
from PyQt6.QtWebEngineCore import QWebEngineScript
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWidgets import QMainWindow


class MainWindow(QMainWindow):
    """Main window using QWebEngineView for the frontend."""

    def __init__(self) -> None:
        """Initialize the main window."""
        super().__init__()
        self.setWindowTitle("Radio Telemetry Tracker Drone GCS")

        self.web_view = QWebEngineView()
        self.setCentralWidget(self.web_view)

        # WebChannel
        self.channel = QWebChannel()
        self.bridge = None
        self.web_view.page().setWebChannel(self.channel)

        # Developer tools
        self.web_view.page().setDevToolsPage(self.web_view.page())

        # Load completion
        self.web_view.loadFinished.connect(self._on_load_finished)

        # Inject QWebChannel initialization
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

        # Window size
        self.resize(1280, 720)

        # Load local dist
        dist_path = Path(__file__).parent.parent / "frontend" / "dist" / "index.html"
        if not dist_path.exists():
            logging.error("Frontend dist not found at %s", dist_path)
            msg = f"Frontend dist not found at {dist_path}"
            raise FileNotFoundError(msg)

        local_url = QUrl.fromLocalFile(str(dist_path))
        logging.info("Loading frontend from %s", local_url.toString())
        self.web_view.setUrl(local_url)

    def _on_load_finished(self, *, ok: bool = True) -> None:
        if ok:
            logging.info("Frontend loaded successfully")
        else:
            logging.error("Failed to load frontend")

    def set_bridge(self, bridge: object) -> None:
        """Register the Python comms bridge under 'backend'."""
        self.bridge = bridge
        self.channel.registerObject("backend", bridge)
        logging.info("Bridge registered with WebChannel")
