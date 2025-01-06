"""CommunicationBridge: Connects Python backend to the QWebChannel (frontend).

- Handles high-level slot methods for tile/POI, Drone comm, etc.
- Delegates to DroneCommsService, GPSHandler, tile_service, poi_service, drone_data_manager
"""

import base64
import logging
import time
from typing import Any

import serial
from PyQt6.QtCore import QObject, QTimer, QVariant, pyqtSignal, pyqtSlot
from radio_telemetry_tracker_drone_comms_package import SyncResponseData

from radio_telemetry_tracker_drone_gcs.comms.drone_comms_service import DroneCommsService, RadioConfig
from radio_telemetry_tracker_drone_gcs.comms.gps_handler import GPSHandler
from radio_telemetry_tracker_drone_gcs.data.drone_data_manager import DroneDataManager
from radio_telemetry_tracker_drone_gcs.data.models import ConnectionMetrics, DroneData, LocEstData, PingData


class CommunicationBridge(QObject):
    """Bridge class for QWebChannel <-> Python, handles signals & slots.

    Handles high-level slot methods for tile/POI, Drone comm, etc.
    """

    # Signals
    error_message = pyqtSignal(str)
    tile_info_updated = pyqtSignal(QVariant)
    pois_updated = pyqtSignal(QVariant)

    drone_data_updated = pyqtSignal(QVariant)
    ping_data_updated = pyqtSignal(QVariant)
    loc_est_data_updated = pyqtSignal(QVariant)

    connection_status = pyqtSignal(str)
    sync_timeout = pyqtSignal()

    def __init__(self, drone_data_manager: DroneDataManager) -> None:
        """Initialize the communication bridge.

        Sets up data manager, services, and comms placeholders.
        """
        super().__init__()
        self._drone_data_manager = drone_data_manager

        # Initialize drone comms with separate callbacks
        self._drone_comms = DroneCommsService(
            on_drone_data=self._handle_drone_data,
            on_connection_metrics=self._handle_connection_metrics,
        )

    def _handle_drone_data(self, data: DroneData) -> None:
        """Handle new drone position data."""
        try:
            self._drone_data_manager.update_drone_data(data)
        except Exception:
            logging.exception("Error handling drone data")

    def _handle_connection_metrics(self, metrics: ConnectionMetrics) -> None:
        """Handle connection quality updates."""
        try:
            self._drone_data_manager.update_connection_metrics(metrics)
        except Exception:
            logging.exception("Error handling connection metrics")

    # --------------------------------------------------------------------------
    # SLOTS for serial port list, comm init, cancel, disconnect
    # --------------------------------------------------------------------------
    @pyqtSlot(result="QVariantList")
    def get_serial_ports(self) -> list[str]:
        """Return list of available serial ports."""
        try:
            import serial.tools.list_ports

            ports_info = list(serial.tools.list_ports.comports())
            return [str(port.device) for port in ports_info]
        except Exception:
            logging.exception("Error listing serial ports")
            return []

    @pyqtSlot("QVariantMap", result=bool)
    def initialize_comms(self, config: dict[str, Any]) -> bool:
        """Initialize DroneComms with the given configuration.

        Expects:
        {
            interface_type: 'serial' | 'simulated',
            port?: string,
            baudrate?: number,
            host?: string,
            tcp_port?: number,
            server_mode?: boolean,
            ack_timeout: number (seconds),
            max_retries: number,
        }.
        """
        try:
            # Validate config
            if config["interface_type"] == "serial" and not config.get("port"):
                self.error_message.emit("No serial port selected.")
                return False

            radio_cfg = RadioConfig(
                interface_type=config["interface_type"],
                port=config.get("port"),
                baudrate=config.get("baudrate"),
                host=config.get("host", "localhost"),
                tcp_port=config.get("tcp_port"),
                server_mode=config.get("server_mode", False),
            )

            ack_timeout_s = float(config["ack_timeout"])
            max_retries = int(config["max_retries"])

            # Create comms service
            self._drone_comms_service = DroneCommsService(
                radio_config=radio_cfg,
                ack_timeout=ack_timeout_s,
                max_retries=max_retries,
                on_ack_success=self._on_ack_success,
                on_ack_timeout=self._on_ack_timeout,
            )

            # Start it
            self._drone_comms_service.start()

            # Register GPS handler
            self._gps_handler = GPSHandler(
                drone_data_manager=self._drone_data_manager,
                ack_timeout=ack_timeout_s,
                max_retries=max_retries,
            )
            self._drone_comms_service.register_gps_handler(self._gps_handler.handle_gps_data)

            # Register sync response
            self._drone_comms_service.register_sync_response_handler(self._handle_sync_response, once=True)

            # Send sync
            self._sync_packet_id = self._drone_comms_service.send_sync_request()
            self._expected_ack_id = self._sync_packet_id
            self.connection_status.emit("Waiting for drone to respond...")

            # If not ack by ack_timeout_s * max_retries, emit sync_timeout
            total_timeout = ack_timeout_s * max_retries
            QTimer.singleShot(int(total_timeout * 1000), self._sync_timeout_check)
        except (
            ConnectionRefusedError,
            TimeoutError,
            ConnectionResetError,
            serial.serialutil.SerialException,
        ) as e:
            error_msg = self._get_error_message(e)
            self.error_message.emit(error_msg)
            return False
        except Exception as ex:
            logging.exception("Error in initialize_comms()")
            self.error_message.emit(f"Failed to initialize communications.\n\nError: {ex!s}")
            return False
        else:
            return True

    @pyqtSlot()
    def cancel_connection(self) -> None:
        """Cancel the connection attempt."""
        logging.info("Cancelling connection attempt")
        if self._drone_comms_service:
            self._drone_comms_service.stop()
            self._drone_comms_service = None
        self._sync_packet_id = None
        self.connection_status.emit("Connection cancelled")

    @pyqtSlot()
    def disconnect(self) -> None:
        """Disconnect from the drone, sending a stop request if possible."""
        logging.info("Disconnect called.")
        if not self._drone_comms_service:
            self.connection_status.emit("Disconnected")
            return

        # Attempt a stop request
        try:
            stop_packet_id = self._drone_comms_service.send_stop_request()
            self._expected_ack_id = stop_packet_id
            # Wait for ack or a short timeout
            total_timeout_s = self._drone_comms_service.ack_timeout_s * self._drone_comms_service.retries

            # We won't block in a QEventLoop. We'll just schedule a callback
            QTimer.singleShot(int(total_timeout_s * 1000), self._stop_timeout_check)
        except Exception:
            logging.exception("Failed to send stop request")
            # still stop
            self._cleanup_comms()

    # --------------------------------------------------------------------------
    # DRONE DATA SLOTS (these wrap data manager calls)
    # --------------------------------------------------------------------------
    @pyqtSlot("QVariantMap", result=bool)
    def update_drone_data(self, data: dict) -> bool:
        """Update drone data (manual override)."""
        try:
            drone_data = DroneData(
                lat=data["lat"],
                long=data["long"],
                altitude=data["altitude"],
                heading=data["heading"],
                last_update=data.get("last_update") or int(time.time() * 1000),
            )
            self._drone_data_manager.update_drone_data(drone_data)
        except Exception:
            logging.exception("Error updating drone data")
            return False
        else:
            return True

    @pyqtSlot("QVariantMap", result=bool)
    def update_connection_metrics(self, data: dict) -> bool:
        """Update connection metrics (manual override)."""
        try:
            metrics = ConnectionMetrics(
                ping_time=data["ping_time"],
                packet_loss=data["packet_loss"],
                connection_quality=data["connection_quality"],
                last_update=data.get("last_update") or int(time.time() * 1000),
            )
            self._drone_data_manager.update_connection_metrics(metrics)
        except Exception:
            logging.exception("Error updating connection metrics")
            return False
        else:
            return True

    @pyqtSlot("QVariantMap", result=bool)
    def add_ping(self, data: dict) -> bool:
        """Add a new ping (frequency, amplitude, lat, long, timestamp)."""
        try:
            ping = PingData(
                frequency=data["frequency"],
                amplitude=data["amplitude"],
                lat=data["lat"],
                long=data["long"],
                timestamp=data.get("timestamp") or 0,
            )
            self._drone_data_manager.add_ping(ping)
        except Exception:
            logging.exception("Error adding ping")
            return False
        else:
            return True

    @pyqtSlot("QVariantMap", result=bool)
    def update_location_estimate(self, data: dict) -> bool:
        """Update location estimate for a frequency."""
        try:
            est = LocEstData(
                frequency=data["frequency"],
                lat=data["lat"],
                long=data["long"],
                timestamp=data.get("timestamp") or 0,
            )
            self._drone_data_manager.update_location_estimate(est)
        except Exception:
            logging.exception("Error updating location estimate")
            return False
        else:
            return True

    @pyqtSlot(int, result=bool)
    def clear_frequency_data(self, frequency: int) -> bool:
        """Clear all data associated with the specified frequency."""
        try:
            return self._drone_data_manager.clear_frequency_data(frequency)
        except Exception:
            logging.exception("Error clearing frequency data")
            return False

    @pyqtSlot(result=bool)
    def clear_all_data(self) -> bool:
        """Clear all drone data, including pings and location estimates."""
        try:
            return self._drone_data_manager.clear_all_data()
        except Exception:
            logging.exception("Error clearing all data")
            return False

    # --------------------------------------------------------------------------
    # TILES & POIs
    # --------------------------------------------------------------------------
    @pyqtSlot("int", "int", "int", "QString", "QVariantMap", result="QString")
    def get_tile(self, z: int, x: int, y: int, source: str, options: dict) -> str:
        """Get a tile as base64 from tile_service."""
        try:
            tile_data = self._tile_service.get_tile(z, x, y, source_id=source, offline=options.get("offline", False))
            if tile_data is None:
                return ""
            # Might as well emit updated tile info if caching
            info = self._tile_service.get_tile_info()
            self.tile_info_updated.emit(QVariant(info))

            return base64.b64encode(tile_data).decode("utf-8")
        except Exception:
            logging.exception("Error in get_tile()")
            return ""

    @pyqtSlot(result=QVariant)
    def get_tile_info(self) -> QVariant:
        """Get information about cached tiles, including total count and size."""
        try:
            info = self._tile_service.get_tile_info()
            return QVariant(info)
        except Exception:
            logging.exception("Error getting tile info")
            return QVariant({})

    @pyqtSlot(result=bool)
    def clear_tile_cache(self) -> bool:
        """Clear all cached map tiles from storage."""
        try:
            return self._tile_service.clear_tile_cache()
        except Exception:
            logging.exception("Error clearing tile cache")
            return False

    @pyqtSlot(result="QVariant")
    def get_pois(self) -> list[dict]:
        """Get list of all points of interest (POIs)."""
        try:
            return self._poi_service.get_pois()
        except Exception:
            logging.exception("Error getting POIs")
            return []

    @pyqtSlot(str, "QVariantList", result=bool)
    def add_poi(self, name: str, coords: list[float]) -> bool:
        """Add a new point of interest (POI)."""
        try:
            self._poi_service.add_poi(name, coords)
            self._emit_pois()
        except Exception:
            logging.exception("Error adding POI")
            return False
        else:
            return True

    @pyqtSlot(str, result=bool)
    def remove_poi(self, name: str) -> bool:
        """Remove a point of interest (POI)."""
        try:
            self._poi_service.remove_poi(name)
            self._emit_pois()
        except Exception:
            logging.exception("Error removing POI")
            return False
        else:
            return True

    @pyqtSlot(str, str, result=bool)
    def rename_poi(self, old_name: str, new_name: str) -> bool:
        """Rename a point of interest (POI)."""
        try:
            self._poi_service.rename_poi(old_name, new_name)
            self._emit_pois()
        except Exception:
            logging.exception("Error renaming POI")
            return False
        else:
            return True

    def _emit_pois(self) -> None:
        pois = self._poi_service.get_pois()
        self.pois_updated.emit(QVariant(pois))

    # --------------------------------------------------------------------------
    # LOGGING from frontend
    # --------------------------------------------------------------------------
    @pyqtSlot(str)
    def log_message(self, message: str) -> None:
        """Log a message from the frontend."""
        logging.info("Frontend: %s", message)

    # --------------------------------------------------------------------------
    # INTERNAL UTILITY
    # --------------------------------------------------------------------------
    def _handle_sync_response(self, data: SyncResponseData) -> None:
        """Called by DroneComms after sync response arrives (SyncResponseData)."""
        if not isinstance(data, SyncResponseData):
            logging.warning("Got invalid sync response data type: %s", data)
            return

        if not data.success:
            logging.warning("Sync responded but reported GPS not ready.")
            self.error_message.emit("Warning: GPS not ready or initialization incomplete.")
        self.connection_status.emit("Drone connected successfully")

    def _sync_timeout_check(self) -> None:
        """Check if sync was acked. If not, emit sync_timeout."""
        if not self._ack_received and self._sync_packet_id is not None:
            logging.info("Emitting sync_timeout after ack not received.")
            self.sync_timeout.emit()

    def _on_ack_success(self, packet_id: int) -> None:
        """Callback when a packet ack is received."""
        if packet_id == self._expected_ack_id:
            self._ack_received = True
            logging.info("Packet %d ack received", packet_id)

    def _on_ack_timeout(self, packet_id: int) -> None:
        """Callback when a packet times out waiting for ack."""
        if packet_id == self._expected_ack_id:
            logging.warning("Ack timeout for packet %d", packet_id)
            self._ack_received = False

    def _stop_timeout_check(self) -> None:
        """Check if stop ack was received, if not forcibly disconnect."""
        if not self._ack_received and self._drone_comms_service:
            logging.warning("Stop request timed out, forcibly cleaning up.")
        self._cleanup_comms()

    def _cleanup_comms(self) -> None:
        """Stop comms, reset state, emit Disconnected."""
        if self._drone_comms_service:
            self._drone_comms_service.stop()
            self._drone_comms_service = None
        self._drone_data_manager.update_drone_data(None)
        self._sync_packet_id = None
        self._stop_packet_id = None
        self._expected_ack_id = None
        self.connection_status.emit("Disconnected")

    def _get_error_message(self, error: Exception) -> str:
        """Return a user-friendly error message for known connection issues."""
        import serial

        if isinstance(error, ConnectionRefusedError):
            return "Connection refused.\nCheck if the simulator or device is running, or if the port is correct."
        if isinstance(error, TimeoutError):
            return "Connection timed out.\nCheck your network/serial connection, or adjust ack_timeout/max_retries."
        if isinstance(error, ConnectionResetError):
            return "Connection was reset by the remote device. Possibly server/client mode mismatch."
        if isinstance(error, serial.serialutil.SerialException):
            return f"Serial exception: {error!s}"
        return f"Comms error: {error!s}"
