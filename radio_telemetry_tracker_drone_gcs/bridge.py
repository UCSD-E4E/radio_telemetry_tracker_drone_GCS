"""Bridge module for backend-frontend communication."""

from __future__ import annotations

import base64
import logging
import time
from typing import Any

import serial.tools.list_ports
from PyQt6.QtCore import QObject, QVariant, pyqtSignal, pyqtSlot
from radio_telemetry_tracker_drone_comms_package import (
    DroneComms,
    RadioConfig,
    SyncRequestData,
    SyncResponseData,
)

from radio_telemetry_tracker_drone_gcs.drone_data import DroneData, DroneDataManager, LocEstData, PingData
from radio_telemetry_tracker_drone_gcs.tile_server import (
    add_poi,
    clear_tile_cache,
    get_pois,
    get_tile,
    get_tile_info,
    init_db,
    remove_poi,
)

logging.basicConfig(level=logging.INFO)


class Bridge(QObject):
    """Bridge class for communication between Python backend and JavaScript frontend."""

    error_message = pyqtSignal(str)
    tile_info_updated = pyqtSignal(QVariant)
    pois_updated = pyqtSignal(QVariant)

    # Expose drone data signals
    drone_data_updated = pyqtSignal(QVariant)
    ping_data_updated = pyqtSignal(QVariant)
    loc_est_data_updated = pyqtSignal(QVariant)

    connection_status = pyqtSignal(str)  # Add new signal

    def __init__(self) -> None:
        """Initialize the bridge."""
        super().__init__()
        # Initialize the tile server database
        init_db()

        # Initialize drone data manager
        self._drone_manager = DroneDataManager()
        self._drone_manager.drone_data_updated.connect(self.drone_data_updated.emit)
        self._drone_manager.ping_data_updated.connect(self.ping_data_updated.emit)
        self._drone_manager.loc_est_data_updated.connect(self.loc_est_data_updated.emit)

        # DroneComms instance
        self._drone_comms: DroneComms | None = None

    @pyqtSlot(result="QVariantList")
    def get_serial_ports(self) -> list[str]:
        """Get list of available serial ports."""
        try:
            # Get detailed port information
            all_ports = list(serial.tools.list_ports.comports())
            logging.info("Found %d serial ports", len(all_ports))
            for port in all_ports:
                logging.info("Port: %s, Description: %s, Hardware ID: %s", port.device, port.description, port.hwid)

            # Extract just the device names and convert to list
            ports = [str(port.device) for port in all_ports]
            logging.info("Returning port list: %s", ports)
            # Return as a plain list - PyQt will handle the conversion
        except Exception:
            logging.exception("Error getting serial ports")
            return []
        else:
            return ports

    def _get_error_message(self, error: Exception, radio_config: RadioConfig) -> str:
        """Get appropriate error message based on the exception type."""
        if isinstance(error, ConnectionRefusedError):
            return (
                "Connection refused by the target device.\n\n"
                "This usually happens when:\n"
                "1. The simulator is not running\n"
                "2. The wrong TCP port was specified\n"
                "3. The server/client mode settings don't match\n\n"
                "Please ensure:\n"
                "• The simulator is running\n"
                "• The port number matches the simulator's port\n"
                "• If you're in server mode, the simulator should be in client mode (and vice versa)"
            )
        if isinstance(error, TimeoutError):
            mode = "client" if radio_config.server_mode else "server"
            return (
                f"Connection timed out while trying to connect in {mode} mode.\n\n"
                "This usually happens when:\n"
                "1. No device is listening on the specified port\n"
                "2. The network connection is blocked\n"
                "3. The wrong server/client mode is selected\n\n"
                "Please ensure:\n"
                "• The simulator is running and in the opposite mode\n"
                "• The port is not blocked by a firewall\n"
                "• The host address is correct"
            )
        if isinstance(error, ConnectionResetError):
            return (
                "The connection was reset by the remote device.\n\n"
                "This usually happens when:\n"
                "1. Both devices are in the same mode (both server or both client)\n"
                "2. The remote device closed the connection\n\n"
                "Please check the server/client mode settings on both devices."
            )
        if isinstance(error, serial.serialutil.SerialException):
            if "Access is denied" in str(error):
                return (
                    "Could not access the serial port. Please ensure:\n\n"
                    "1. The port is not in use by another application\n"
                    "2. You have permission to access the port\n"
                    "3. The device is properly connected\n\n"
                    f"Technical details: {error!s}"
                )
            return f"Serial port error: {error!s}\n\nPlease check your connection settings and try again."
        return f"Failed to start communications: {error!s}\n\nPlease check your settings and try again."

    def _setup_connection(self, radio_config: RadioConfig) -> tuple[bool, str | None]:
        """Set up the connection with the given radio configuration.

        Returns:
            tuple[bool, str | None]: (success, error_message if any)
        """
        try:
            self._drone_comms.start()
        except (ConnectionRefusedError, TimeoutError, ConnectionResetError,
                serial.serialutil.SerialException, Exception) as e:
            error_message = self._get_error_message(e, radio_config)
            return False, error_message
        else:
            return True, None

    def _handle_sync_request_error(self) -> bool:
        """Handle errors during sync request.

        Returns:
            bool: False to indicate failure
        """
        self.error_message.emit(
            "Connected to port but failed to synchronize with device.\n\n"
            "Please ensure you're connecting to the correct device and try again.",
        )
        if self._drone_comms:
            self._drone_comms.stop()
            self._drone_comms = None
        return False

    @pyqtSlot("QVariantMap", result=bool)
    def initialize_comms(self, config: dict[str, Any]) -> bool:
        """Initialize DroneComms with the given configuration."""
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

            # Create DroneComms instance with callbacks
            self._drone_comms = DroneComms(
                radio_config=radio_config,
                ack_timeout=config.get("ack_timeout") / 1000.0,  # Convert from ms to seconds
                max_retries=config.get("max_retries"),
                on_ack_success=self._handle_ack_success,
            )

            # Try to establish connection
            success, error_message = self._setup_connection(radio_config)
            if not success:
                self.error_message.emit(error_message)
                return False

            # Register sync response handler
            self._drone_comms.register_sync_response_handler(self._handle_sync_response, once=True)

            try:
                # Send sync request
                sync_request = SyncRequestData()
                self._sync_packet_id, _, _ = self._drone_comms.send_sync_request(sync_request)
            except (ConnectionError, TimeoutError, serial.serialutil.SerialException):
                return self._handle_sync_request_error()
            else:
                logging.info("DroneComms initialized and sync request sent")
                return True

        except Exception as e:
            logging.exception("Error initializing DroneComms")
            self.error_message.emit(
                "Failed to initialize communications.\n\n"
                f"Error: {e!s}\n\n"
                "Please check your settings and try again.",
            )
            return False

    def _handle_ack_success(self, packet_id: int) -> None:
        """Handle successful packet acknowledgment."""
        if packet_id == getattr(self, "_sync_packet_id", None):
            logging.info("Sync request acknowledged")

    def _handle_sync_response(self, data: SyncResponseData) -> None:
        """Handle sync response from drone."""
        if not data.success:
            logging.warning("Sync warning - GPS not ready or initialization incomplete")
            self.error_message.emit(
                "Warning: GPS not ready or initialization failed. GPS data may arrive shortly. "
                "If not, check field device software logs.",
            )

    def _emit_tile_info(self) -> None:
        """Helper to emit tile info as QVariant."""
        info = get_tile_info()
        self.tile_info_updated.emit(QVariant(info))

    def _emit_pois(self) -> None:
        """Helper to emit POIs as QVariant."""
        pois = get_pois()
        self.pois_updated.emit(QVariant(pois))

    @pyqtSlot("int", "int", "int", "QString", "QVariantMap", result="QString")
    def get_tile(
        self,
        z: int,
        x: int,
        y: int,
        source_id: str = "osm",
        options: dict | None = None,
    ) -> str:
        """Get a map tile as base64 encoded PNG data."""
        result = ""
        try:
            options = options or {}
            offline = options.get("offline", False)
            logging.info("Tile request: z=%d, x=%d, y=%d, source=%s, offline=%s", z, x, y, source_id, offline)

            tile_data = get_tile(z, x, y, source_id, offline=offline)
            if tile_data:
                self._emit_tile_info()
                result = base64.b64encode(tile_data).decode("utf-8")
        except Exception:
            logging.exception("Error serving tile %d/%d/%d from %s", z, x, y, source_id)
        return result

    @pyqtSlot(result="QVariant")
    def get_tile_info(self) -> dict:
        """Get information about stored tiles."""
        try:
            info = get_tile_info()
            return QVariant(info)
        except Exception:
            logging.exception("Error getting tile info")
            return QVariant({})

    @pyqtSlot(result=bool)
    def clear_tile_cache(self) -> bool:
        """Clear all stored tiles."""
        try:
            removed = clear_tile_cache()
            logging.info("Cleared %d tiles", removed)
            self._emit_tile_info()
        except Exception:
            logging.exception("Error clearing tile cache")
            return False
        else:
            return True

    @pyqtSlot(result="QVariant")
    def get_pois(self) -> list[dict]:
        """Get all POIs."""
        try:
            pois = get_pois()
            logging.info("Retrieved POIs: %s", pois)
            return QVariant(pois)
        except Exception:
            logging.exception("Error getting POIs")
            return QVariant([])

    @pyqtSlot(str, "QVariantList", result=bool)
    def add_poi(self, name: str, coords: list[float]) -> bool:
        """Add a POI."""
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
        """Remove a POI."""
        try:
            remove_poi(name)
            self._emit_pois()
        except Exception:
            logging.exception("Error removing POI")
            return False
        else:
            return True

    # New methods for drone data
    @pyqtSlot("QVariantMap", result=bool)
    def update_drone_data(self, data: dict) -> bool:
        """Update drone position and status."""
        try:
            drone_data = DroneData(
                lat=data["lat"],
                long=data["long"],
                altitude=data["altitude"],
                heading=data["heading"],
                last_update=int(time.time() * 1000),  # Current time in milliseconds
            )
            self._drone_manager.update_drone_data(drone_data)
        except Exception:
            logging.exception("Error updating drone data")
            return False
        else:
            return True

    @pyqtSlot("QVariantMap", result=bool)
    def add_ping(self, data: dict) -> bool:
        """Add a new signal ping."""
        try:
            ping_data = PingData(
                frequency=data["frequency"],
                amplitude=data["amplitude"],
                lat=data["lat"],
                long=data["long"],
                timestamp=int(time.time() * 1000),  # Current time in milliseconds
            )
            self._drone_manager.add_ping(ping_data)
        except Exception:
            logging.exception("Error adding ping data")
            return False
        else:
            return True

    @pyqtSlot("QVariantMap", result=bool)
    def update_location_estimate(self, data: dict) -> bool:
        """Update location estimate for a frequency."""
        try:
            loc_est_data = LocEstData(
                frequency=data["frequency"],
                lat=data["lat"],
                long=data["long"],
                timestamp=int(time.time() * 1000),  # Current time in milliseconds
            )
            self._drone_manager.update_location_estimate(loc_est_data)
        except Exception:
            logging.exception("Error updating location estimate")
            return False
        else:
            return True

    @pyqtSlot(int, result=bool)
    def clear_frequency_data(self, frequency: int) -> bool:
        """Clear all data for a specific frequency."""
        try:
            return self._drone_manager.clear_frequency_data(frequency)
        except Exception:
            logging.exception("Error clearing frequency data")
            return False

    @pyqtSlot(result=bool)
    def clear_all_data(self) -> bool:
        """Clear all signal and location data."""
        try:
            return self._drone_manager.clear_all_data()
        except Exception:
            logging.exception("Error clearing all data")
            return False
