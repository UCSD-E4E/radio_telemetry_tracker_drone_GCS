"""CommunicationBridge module for backend-frontend communication.

This class uses the DroneComms from the radio-telemetry-tracker-drone-comms-package
to establish connections and exchange data. It also leverages DroneDataManager
to store and emit updates for drone and signal data.
"""

from __future__ import annotations

import base64
import logging
import time
from typing import Any

import serial.tools.list_ports
from PyQt6.QtCore import QObject, QTimer, QVariant, pyqtSignal, pyqtSlot
from radio_telemetry_tracker_drone_comms_package import (
    DroneComms,
    RadioConfig,
    SyncRequestData,
    SyncResponseData,
)

# Import from local modules
from radio_telemetry_tracker_drone_gcs.data.drone_data_manager import DroneDataManager
from radio_telemetry_tracker_drone_gcs.data.models import DroneData, LocEstData, PingData
from radio_telemetry_tracker_drone_gcs.services.tile_server import (
    add_poi,
    clear_tile_cache,
    get_pois,
    get_tile,
    get_tile_info,
    remove_poi,
    rename_poi,
)

logging.basicConfig(level=logging.INFO)


class CommunicationBridge(QObject):
    """Communication bridge class for communication between Python backend and JS frontend.

    Exposes PyQt signals and slots to be accessed via QWebChannel in the web UI.
    """

    # Signals for emitting data or errors to the frontend
    error_message = pyqtSignal(str)
    tile_info_updated = pyqtSignal(QVariant)
    pois_updated = pyqtSignal(QVariant)

    # Drone data signals
    drone_data_updated = pyqtSignal(QVariant)
    ping_data_updated = pyqtSignal(QVariant)
    loc_est_data_updated = pyqtSignal(QVariant)

    # Connection status signals
    connection_status = pyqtSignal(str)
    sync_timeout = pyqtSignal()

    def __init__(self) -> None:
        """Initialize the CommunicationBridge and the DroneDataManager."""
        super().__init__()
        # Initialize data manager
        self._drone_data_manager = DroneDataManager()
        self._drone_data_manager.drone_data_updated.connect(self.drone_data_updated.emit)
        self._drone_data_manager.ping_data_updated.connect(self.ping_data_updated.emit)
        self._drone_data_manager.loc_est_data_updated.connect(self.loc_est_data_updated.emit)

        self._drone_comms: DroneComms | None = None
        self._sync_packet_id: int | None = None

    @pyqtSlot(result="QVariantList")
    def get_serial_ports(self) -> list[str]:
        """Get a list of available serial ports on the system.

        Returns a Python list of strings.
        """
        try:
            ports_info = list(serial.tools.list_ports.comports())
            logging.info("Found %d serial ports", len(ports_info))
            for p in ports_info:
                logging.info("Port: %s, Description: %s, Hardware ID: %s", p.device, p.description, p.hwid)
            return [str(port.device) for port in ports_info]
        except Exception:
            logging.exception("Error getting serial ports")
            return []

    @pyqtSlot("QVariantMap", result=bool)
    def initialize_comms(self, config: dict[str, Any]) -> bool:
        """Initialize DroneComms with the given configuration.

        config keys (string) -> dynamic. Typically includes:
          - interface_type ('serial' or 'simulated')
          - port, baudrate, host, tcp_port, server_mode
          - ack_timeout, max_retries
        """
        try:
            if config.get("server_mode"):
                self.connection_status.emit("Waiting for incoming connection...")

            radio_config = RadioConfig(
                interface_type=config["interface_type"],
                port=config.get("port"),
                baudrate=config.get("baudrate", 56700),
                host=config.get("host", "localhost"),
                tcp_port=config.get("tcp_port", 50000),
                server_mode=config.get("server_mode", False),
            )

            # Convert ack_timeout from ms to s
            ack_timeout_s = config.get("ack_timeout", 1000) / 1000.0
            max_retries = config.get("max_retries", 3)

            self._drone_comms = DroneComms(
                radio_config=radio_config,
                ack_timeout=ack_timeout_s,
                max_retries=max_retries,
                on_ack_success=self._handle_ack_success,
            )

            # Attempt to connect
            success, error_msg = self._setup_connection(radio_config)
            if not success:
                self.error_message.emit(error_msg or "Unknown error during setup connection")
                return False

            # Register sync response handler
            self._drone_comms.register_sync_response_handler(self._handle_sync_response, once=True)

            try:
                sync_request = SyncRequestData(ack_timeout=ack_timeout_s, max_retries=max_retries)
                self._sync_packet_id, _, _ = self._drone_comms.send_sync_request(sync_request)
                self.connection_status.emit("Waiting for drone to respond...")

                # Start a timer to emit sync_timeout if no response
                total_timeout = ack_timeout_s * max_retries
                QTimer.singleShot(int(total_timeout * 1000), self.sync_timeout.emit)

            except (ConnectionError, TimeoutError, serial.serialutil.SerialException):
                return self._handle_sync_request_error()

            logging.info("DroneComms initialized and sync request sent")

        except Exception as ex:
            logging.exception("Error initializing DroneComms")
            self.error_message.emit(
                f"Failed to initialize communications.\n\nError: {ex}\n\nCheck your settings and try again.",
            )
            return False
        else:
            return True

    def _setup_connection(self, radio_config: RadioConfig) -> tuple[bool, str | None]:
        """Set up the connection with the given radio configuration.

        Returns:
            (success: bool, error_message: Optional[str])
        """
        try:
            self._drone_comms.start()
        except (
            ConnectionRefusedError,
            TimeoutError,
            ConnectionResetError,
            serial.serialutil.SerialException,
            Exception,
        ) as e:
            error_message = self._get_error_message(e, radio_config)
            return False, error_message
        return True, None

    def _get_error_message(self, error: Exception, radio_config: RadioConfig) -> str:
        """Return a user-friendly error message based on the exception type."""
        if isinstance(error, ConnectionRefusedError):
            return (
                "Connection refused by the target device.\n\n"
                "Possible causes:\n"
                "1. The simulator is not running\n"
                "2. The wrong TCP port was specified\n"
                "3. The server/client mode settings don't match\n\n"
                "Please ensure:\n"
                "• The simulator is running\n"
                "• The port matches the simulator's port\n"
                "• Server/client mode is correct"
            )
        if isinstance(error, TimeoutError):
            mode = "client" if radio_config.server_mode else "server"
            return (
                f"Connection timed out in {mode} mode.\n\n"
                "Possible causes:\n"
                "1. No device listening on the specified port\n"
                "2. The network connection is blocked\n"
                "3. The wrong server/client mode selected\n\n"
                "Check:\n"
                "• The simulator is running & in the opposite mode\n"
                "• The port is not blocked by a firewall\n"
                "• The host address is correct"
            )
        if isinstance(error, ConnectionResetError):
            return (
                "The connection was reset by the remote device.\n\n"
                "Possible causes:\n"
                "1. Both devices are in the same mode (both server or both client)\n"
                "2. The remote device closed the connection"
            )
        if isinstance(error, serial.serialutil.SerialException):
            if "Access is denied" in str(error):
                return (
                    "Could not access the serial port. Ensure:\n\n"
                    "1. The port is not in use by another application\n"
                    "2. You have permission to access the port\n"
                    "3. The device is properly connected\n\n"
                    f"Details: {error}"
                )
            return f"Serial port error: {error}\n\nCheck your connection settings."
        return f"Failed to start communications: {error}\n\nCheck settings and try again."

    def _handle_sync_request_error(self) -> bool:
        """Handle errors during sync request and stop comms."""
        self.error_message.emit(
            "Connected to port but failed to synchronize with device.\n\n"
            "Ensure you are connecting to the correct device and try again.",
        )
        if self._drone_comms:
            self._drone_comms.stop()
            self._drone_comms = None
        return False

    def _handle_ack_success(self, packet_id: int) -> None:
        """Handle successful packet acknowledgment."""
        if packet_id == self._sync_packet_id:
            logging.info("Sync request acknowledged")

    def _handle_sync_response(self, data: SyncResponseData) -> None:
        """Handle sync response from drone."""
        if not data.success:
            logging.warning("Sync warning - GPS not ready or initialization incomplete")
            self.error_message.emit("Warning: GPS not ready or initialization failed. GPS data may arrive shortly.")
        else:
            self.connection_status.emit("Drone connected successfully")

    # ----- Tile and POI methods -----

    @pyqtSlot("int", "int", "int", "QString", "bool", result="QString")
    def get_tile(self, z: int, x: int, y: int, source: str, *, offline: bool = False) -> str:
        """Get a map tile as a base64 string."""
        try:
            tile_data = get_tile(z, x, y, source_id=source, offline=offline)
            if tile_data is None:
                return ""
            # Emit updated tile info after successful caching
            self.tile_info_updated.emit(QVariant(get_tile_info()))
            return base64.b64encode(tile_data).decode("utf-8")
        except Exception:
            logging.exception("Error getting tile %d/%d/%d from %s", z, x, y, source)
            return ""

    @pyqtSlot(result=QVariant)
    def get_tile_info(self) -> QVariant:
        """Get information about cached tiles."""
        try:
            info = get_tile_info()
            return QVariant(info)
        except Exception:
            logging.exception("Error getting tile info")
            return QVariant({})

    @pyqtSlot(result=bool)
    def clear_tile_cache(self) -> bool:
        """Clear the tile cache."""
        try:
            rows = clear_tile_cache()
            logging.info("Cleared %d tiles from cache", rows)
        except Exception:
            logging.exception("Error clearing tile cache")
            return False
        else:
            return rows >= 0

    # ----- POI methods -----

    @pyqtSlot(result="QVariant")
    def get_pois(self) -> list[dict]:
        """Get all POIs from the tile_server database."""
        try:
            pois = get_pois()
            logging.info("Retrieved POIs: %s", pois)
            return QVariant(pois)
        except Exception:
            logging.exception("Error getting POIs")
            return QVariant([])

    @pyqtSlot(str, "QVariantList", result=bool)
    def add_poi(self, name: str, coords: list[float]) -> bool:
        """Add a POI to the database."""
        try:
            add_poi(name, (coords[0], coords[1]))
            self._emit_pois()
        except Exception:
            logging.exception("Error adding POI")
            return False
        else:
            return True

    @pyqtSlot(str, result=bool)
    def remove_poi(self, name: str) -> bool:
        """Remove a POI from the database."""
        try:
            remove_poi(name)
            self._emit_pois()
        except Exception:
            logging.exception("Error removing POI")
            return False
        else:
            return True

    @pyqtSlot(str, str, result=bool)
    def rename_poi(self, old_name: str, new_name: str) -> bool:
        """Rename a POI."""
        try:
            rename_poi(old_name, new_name)
            self._emit_pois()
        except Exception:
            logging.exception("Error renaming POI")
            return False
        else:
            return True

    def _emit_pois(self) -> None:
        """Emit updated POI list to the frontend."""
        pois = get_pois()
        self.pois_updated.emit(QVariant(pois))

    # ----- Drone data management (via DroneDataManager) -----

    @pyqtSlot("QVariantMap", result=bool)
    def update_drone_data(self, data: dict) -> bool:
        """Update drone position and status."""
        try:
            new_data = DroneData(
                lat=data["lat"],
                long=data["long"],
                altitude=data["altitude"],
                heading=data["heading"],
                last_update=int(time.time() * 1000),
            )
            self._drone_data_manager.update_drone_data(new_data)
        except Exception:
            logging.exception("Error updating drone data")
            return False
        else:
            return True

    @pyqtSlot("QVariantMap", result=bool)
    def add_ping(self, data: dict) -> bool:
        """Add a new signal ping to the data manager."""
        try:
            ping_data = PingData(
                frequency=data["frequency"],
                amplitude=data["amplitude"],
                lat=data["lat"],
                long=data["long"],
                timestamp=int(time.time() * 1000),
            )
            self._drone_data_manager.add_ping(ping_data)
        except Exception:
            logging.exception("Error adding ping data")
            return False
        else:
            return True

    @pyqtSlot("QVariantMap", result=bool)
    def update_location_estimate(self, data: dict) -> bool:
        """Update location estimate for a given frequency."""
        try:
            loc_est_data = LocEstData(
                frequency=data["frequency"],
                lat=data["lat"],
                long=data["long"],
                timestamp=int(time.time() * 1000),
            )
            self._drone_data_manager.update_location_estimate(loc_est_data)
        except Exception:
            logging.exception("Error updating location estimate")
            return False
        else:
            return True

    @pyqtSlot(int, result=bool)
    def clear_frequency_data(self, frequency: int) -> bool:
        """Clear all data for a specific frequency."""
        try:
            return self._drone_data_manager.clear_frequency_data(frequency)
        except Exception:
            logging.exception("Error clearing frequency data")
            return False

    @pyqtSlot(result=bool)
    def clear_all_data(self) -> bool:
        """Clear all signal and location data."""
        try:
            return self._drone_data_manager.clear_all_data()
        except Exception:
            logging.exception("Error clearing all data")
            return False
