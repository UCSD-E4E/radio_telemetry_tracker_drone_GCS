"""Bridge module for handling communication between Qt frontend and drone backend.

Provides a Qt-based interface for drone operations, tile management, and POI handling.
"""

from __future__ import annotations

import base64
import logging
import time
from typing import Any

import pyproj
from PyQt6.QtCore import QObject, QTimer, QVariant, pyqtSignal, pyqtSlot
from radio_telemetry_tracker_drone_comms_package import (
    ConfigRequestData,
    ConfigResponseData,
    ErrorData,
    GPSData,
    LocEstData,
    PingData,
    RadioConfig,
    StartResponseData,
    StopResponseData,
    SyncResponseData,
)

from radio_telemetry_tracker_drone_gcs.comms.drone_comms_service import DroneCommsService
from radio_telemetry_tracker_drone_gcs.comms.state_machine import DroneState, DroneStateMachine, StateTransition
from radio_telemetry_tracker_drone_gcs.data.drone_data_manager import DroneDataManager
from radio_telemetry_tracker_drone_gcs.data.models import (
    GpsData as InternalGpsData,
)
from radio_telemetry_tracker_drone_gcs.data.models import (
    LocEstData as InternalLocEstData,
)
from radio_telemetry_tracker_drone_gcs.data.models import (
    PingData as InternalPingData,
)
from radio_telemetry_tracker_drone_gcs.services.poi_service import PoiService
from radio_telemetry_tracker_drone_gcs.services.tile_service import TileService


class CommunicationBridge(QObject):
    """Bridge between Qt frontend and drone communications backend, handling all drone-related operations."""

    # Sync/Connect
    sync_success = pyqtSignal(str)
    sync_failure = pyqtSignal(str)
    sync_timeout = pyqtSignal()

    # Config
    config_success = pyqtSignal(str)
    config_failure = pyqtSignal(str)
    config_timeout = pyqtSignal()

    # Start
    start_success = pyqtSignal(str)
    start_failure = pyqtSignal(str)
    start_timeout = pyqtSignal()

    # Stop
    stop_success = pyqtSignal(str)
    stop_failure = pyqtSignal(str)
    stop_timeout = pyqtSignal()

    # Disconnect
    disconnect_success = pyqtSignal(str)
    disconnect_failure = pyqtSignal(str)

    # Fatal error
    fatal_error = pyqtSignal()

    # Tile & POI signals
    tile_info_updated = pyqtSignal(QVariant)
    pois_updated = pyqtSignal(QVariant)

    # GPS, Ping, LocEst
    gps_data_updated = pyqtSignal(QVariant)
    frequency_data_updated = pyqtSignal(QVariant)

    def __init__(self) -> None:
        """Initialize the communication bridge with data manager and services."""
        super().__init__()

        self._drone_data_manager = DroneDataManager()
        self._drone_data_manager.gps_data_updated.connect(self.gps_data_updated.emit)
        self._drone_data_manager.frequency_data_updated.connect(self.frequency_data_updated.emit)

        # Tile & POI
        self._tile_service = TileService()
        self._poi_service = PoiService()

        # State machine
        self._state_machine = DroneStateMachine()
        self._state_machine.state_error.connect(self.fatal_error.emit)
        self._setup_state_handlers()

        # Comms
        self._comms_service: DroneCommsService | None = None
        self._response_received: bool = False
        self._expected_packet_id: int | None = None

    def _setup_state_handlers(self) -> None:
        """Set up state machine handlers."""
        self._state_machine.register_transition_handler(
            DroneState.CONNECTING,
            lambda: self._comms_service.register_sync_response_handler(self._on_sync_response, once=True),
        )
        self._state_machine.register_transition_handler(
            DroneState.CONFIGURING,
            lambda: self._comms_service.register_config_response_handler(self._on_config_response, once=True),
        )
        self._state_machine.register_transition_handler(
            DroneState.READY,
            lambda: self._comms_service.register_start_response_handler(self._on_start_response, once=True),
        )
        self._state_machine.register_transition_handler(
            DroneState.RUNNING,
            lambda: self._comms_service.register_stop_response_handler(self._on_stop_response, once=True),
        )

    # --------------------------------------------------------------------------
    # Basic slots for comms
    # --------------------------------------------------------------------------

    @pyqtSlot(result="QVariantList")
    def get_serial_ports(self) -> list[str]:
        """Return a list of available serial port device names."""
        import serial.tools.list_ports

        port_info = list(serial.tools.list_ports.comports())
        return [str(p.device) for p in port_info]

    @pyqtSlot("QVariantMap", result=bool)
    def initialize_comms(self, config: dict[str, Any]) -> bool:
        """Initialize drone communications with the given configuration.

        Args:
            config: Dictionary containing radio and acknowledgment settings.

        Returns:
            bool: True if initialization succeeded, False otherwise.
        """
        try:
            radio_cfg = RadioConfig(
                interface_type=config["interface_type"],
                port=config["port"],
                baudrate=int(config["baudrate"]),
                host=config["host"],
                tcp_port=int(config["tcp_port"]),
                server_mode=False,
            )
            ack_s = float(config["ack_timeout"])
            max_r = int(config["max_retries"])

            self._comms_service = DroneCommsService(
                radio_config=radio_cfg,
                ack_timeout=ack_s,
                max_retries=max_r,
                on_ack_success=self._on_ack_success,
                on_ack_timeout=self._on_ack_timeout,
            )
            self._comms_service.start()

            # Register packet handlers
            self._comms_service.register_error_handler(self._handle_error_packet)

            # Transition to connecting state
            self._state_machine.transition_to(
                DroneState.CONNECTING,
                StateTransition(
                    from_state=DroneState.DISCONNECTED,
                    to_state=DroneState.CONNECTING,
                    success_message="Drone connected successfully",
                    failure_message="Failed to connect to drone",
                ),
            )

            # Send sync
            packet_id = self._comms_service.send_sync_request()
            self._expected_packet_id = packet_id
            self._response_received = False

            tt = ack_s * max_r
            QTimer.singleShot(int(tt * 1000), self._sync_timeout_check)
        except Exception as e:
            logging.exception("Error in initialize_comms")
            self.sync_failure.emit(f"Initialize comms failed: {e!s}")
            return False
        else:
            return True

    @pyqtSlot()
    def cancel_connection(self) -> None:
        """User cancels sync/connect attempt."""
        if self._comms_service:
            self._comms_service.stop()
            self._comms_service = None
            self._state_machine.transition_to(DroneState.DISCONNECTED)

    @pyqtSlot()
    def disconnect(self) -> None:
        """Disconnect from the drone and clean up communication resources."""
        if not self._comms_service:
            self.disconnect_success.emit("UNDEFINED BEHAVIOR: Not Connected.")
            return
        try:
            self._comms_service.register_stop_response_handler(self._on_disconnect_response, once=True)
            packet_id = self._comms_service.send_stop_request()
            self._expected_packet_id = packet_id
            self._response_received = False

            tt = self._comms_service.ack_timeout * self._comms_service.max_retries
            QTimer.singleShot(int(tt * 1000), self._disconnect_timeout_check)
        except Exception:
            logging.exception("Stop request failed => forcing cleanup.")
            self.disconnect_failure.emit("Stop request failed... forcing cleanup.")
            self._cleanup()

    # --------------------------------------------------------------------------
    # Config
    # --------------------------------------------------------------------------
    @pyqtSlot("QVariantMap", result=bool)
    def send_config_request(self, cfg: dict[str, Any]) -> bool:
        """Send config => wait => user can cancel => if ack fails => config_timout."""
        if not self._comms_service:
            self.config_failure.emit("UNDEFINED BEHAVIOR: Not Connected.")
            return False

        try:
            req = ConfigRequestData(
                gain=float(cfg["gain"]),
                sampling_rate=int(cfg["sampling_rate"]),
                center_frequency=int(cfg["center_frequency"]),
                run_num=int(time.time()),
                enable_test_data=bool(cfg["enable_test_data"]),
                ping_width_ms=int(cfg["ping_width_ms"]),
                ping_min_snr=int(cfg["ping_min_snr"]),
                ping_max_len_mult=float(cfg["ping_max_len_mult"]),
                ping_min_len_mult=float(cfg["ping_min_len_mult"]),
                target_frequencies=list(map(int, cfg["target_frequencies"])),
            )
            self._comms_service.register_config_response_handler(self._on_config_response, once=True)
            packet_id = self._comms_service.send_config_request(req)
            self._expected_packet_id = packet_id
            self._response_received = False

            tt = self._comms_service.ack_timeout * self._comms_service.max_retries
            QTimer.singleShot(int(tt * 1000), self._config_timeout_check)
        except Exception as e:
            logging.exception("Error in send_config_request")
            self.config_failure.emit(str(e))
            return False
        else:
            return True

    @pyqtSlot(result=bool)
    def cancel_config_request(self) -> bool:
        """Cancel the config request."""
        if not self._comms_service:
            self.config_failure.emit("UNDEFINED BEHAVIOR: Not Connected.")
            return False
        self._comms_service.unregister_config_response_handler(self._on_config_response)
        return True

    # --------------------------------------------------------------------------
    # Start
    # --------------------------------------------------------------------------
    @pyqtSlot(result=bool)
    def send_start_request(self) -> bool:
        """Send start request => wait => user can cancel => if ack fails => start_timeout."""
        if not self._comms_service:
            self.start_failure.emit("UNDEFINED BEHAVIOR: Not Connected.")
            return False

        try:
            self._comms_service.register_start_response_handler(self._on_start_response, once=True)
            packet_id = self._comms_service.send_start_request()
            self._expected_packet_id = packet_id
            self._response_received = False

            tt = self._comms_service.ack_timeout * self._comms_service.max_retries
            QTimer.singleShot(int(tt * 1000), self._start_timeout_check)
        except Exception as e:
            logging.exception("Error in send_start_request")
            self.start_failure.emit(str(e))
            return False
        else:
            return True

    @pyqtSlot(result=bool)
    def cancel_start_request(self) -> bool:
        """Cancel the start request."""
        if not self._comms_service:
            self.start_failure.emit("UNDEFINED BEHAVIOR: Not Connected.")
            return False
        self._comms_service.unregister_start_response_handler(self._on_start_response)
        return True

    # --------------------------------------------------------------------------
    # Stop
    # --------------------------------------------------------------------------
    @pyqtSlot(result=bool)
    def send_stop_request(self) -> bool:
        """Send stop request => wait => user can cancel => if ack fails => stop_timeout."""
        if not self._comms_service:
            self.stop_failure.emit("UNDEFINED BEHAVIOR: Not Connected.")
            return False

        try:
            self._comms_service.register_stop_response_handler(self._on_stop_response, once=True)
            packet_id = self._comms_service.send_stop_request()
            self._expected_packet_id = packet_id
            self._response_received = False

            tt = self._comms_service.ack_timeout * self._comms_service.max_retries
            QTimer.singleShot(int(tt * 1000), self._stop_timeout_check)
        except Exception as e:
            logging.exception("Error in send_stop_request")
            self.stop_failure.emit(str(e))
            return False
        else:
            return True

    @pyqtSlot(result=bool)
    def cancel_stop_request(self) -> bool:
        """Cancel the stop request."""
        if not self._comms_service:
            self.stop_failure.emit("UNDEFINED BEHAVIOR: Not Connected.")
            return False
        self._comms_service.unregister_stop_response_handler(self._on_stop_response)
        return True

    # --------------------------------------------------------------------------
    # GPS, Ping, LocEst
    # --------------------------------------------------------------------------
    def _handle_gps_data(self, gps: GPSData) -> None:
        lat, lng = self._transform_coords(gps.easting, gps.northing, gps.epsg_code)
        internal_gps = InternalGpsData(
            lat=lat,
            long=lng,
            altitude=gps.altitude,
            heading=gps.heading,
            timestamp=gps.timestamp,
            packet_id=gps.packet_id,
        )
        self._drone_data_manager.update_gps(internal_gps)

    def _handle_ping_data(self, ping: PingData) -> None:
        lat, lng = self._transform_coords(ping.easting, ping.northing, ping.epsg_code)
        internal_ping = InternalPingData(
            frequency=ping.frequency,
            amplitude=ping.amplitude,
            lat=lat,
            long=lng,
            timestamp=ping.timestamp,
            packet_id=ping.packet_id,
        )
        self._drone_data_manager.add_ping(internal_ping)

    def _handle_loc_est_data(self, loc_est: LocEstData) -> None:
        lat, lng = self._transform_coords(loc_est.easting, loc_est.northing, loc_est.epsg_code)
        internal_loc_est = InternalLocEstData(
            frequency=loc_est.frequency,
            lat=lat,
            long=lng,
            timestamp=loc_est.timestamp,
            packet_id=loc_est.packet_id,
        )
        self._drone_data_manager.update_loc_est(internal_loc_est)

    # --------------------------------------------------------------------------
    # Error
    # --------------------------------------------------------------------------
    def _handle_error_packet(self, _: ErrorData) -> None:
        logging.error("Received fatal error packet")
        self.fatal_error.emit()

    # --------------------------------------------------------------------------
    # Tile & POI bridging
    # --------------------------------------------------------------------------
    @pyqtSlot("int", "int", "int", "QString", "QVariantMap", result="QString")
    def get_tile(self, z: int, x: int, y: int, source: str, options: dict) -> str:
        """Get map tile data for the specified coordinates and zoom level.

        Args:
            z: Zoom level
            x: X coordinate
            y: Y coordinate
            source: Tile source identifier
            options: Additional options including offline mode

        Returns:
            Base64 encoded tile data or empty string on error
        """
        try:
            offline = bool(options["offline"])
            tile_data = self._tile_service.get_tile(z, x, y, source_id=source, offline=offline)
            if not tile_data:
                return ""
            # We can update tile info
            info = self._tile_service.get_tile_info()
            self.tile_info_updated.emit(QVariant(info))
            return base64.b64encode(tile_data).decode("utf-8")
        except Exception:
            logging.exception("Error in get_tile()")
            return ""

    @pyqtSlot(result=QVariant)
    def get_tile_info(self) -> QVariant:
        """Get information about the current tile cache state."""
        try:
            info = self._tile_service.get_tile_info()
            return QVariant(info)
        except Exception:
            logging.exception("Error in get_tile_info()")
            return QVariant({})

    @pyqtSlot(result=bool)
    def clear_tile_cache(self) -> bool:
        """Clear the map tile cache and return success status."""
        try:
            return self._tile_service.clear_tile_cache()
        except Exception:
            logging.exception("Error clearing tile cache")
            return False

    @pyqtSlot(result="QVariant")
    def get_pois(self) -> list[dict]:
        """Get list of all points of interest (POIs) in the system."""
        try:
            return self._poi_service.get_pois()
        except Exception:
            logging.exception("Error getting POIs")
            return []

    @pyqtSlot(str, "QVariantList", result=bool)
    def add_poi(self, name: str, coords: list[float]) -> bool:
        """Add a new point of interest with the given name and coordinates."""
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
        """Remove a point of interest with the specified name."""
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
        """Rename a point of interest from old_name to new_name."""
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
    # LAYERS
    # --------------------------------------------------------------------------
    @pyqtSlot(int, result=bool)
    def clear_frequency_data(self, frequency: int) -> bool:
        """Clear all data for the specified frequency and return success status."""
        try:
            self._drone_data_manager.clear_frequency_data(frequency)
        except Exception:
            logging.exception("Error clearing frequency data")
            return False
        else:
            return True

    @pyqtSlot(int, result=bool)
    def clear_all_frequency_data(self) -> bool:
        """Clear all frequency-related data across all frequencies and return success status."""
        try:
            self._drone_data_manager.clear_all_frequency_data()
        except Exception:
            logging.exception("Error clearing all frequency data")
            return False
        else:
            return True

    # --------------------------------------------------------------------------
    # TIMEOUTS
    # --------------------------------------------------------------------------
    def _sync_timeout_check(self) -> None:
        if not self._response_received and self._expected_packet_id:
            logging.warning("Sync response not received => sync_timeout.")
            self.sync_timeout.emit()

    def _config_timeout_check(self) -> None:
        if not self._response_received and self._expected_packet_id:
            logging.warning("Config response not received => config_timeout.")
            self.config_timeout.emit()

    def _start_timeout_check(self) -> None:
        if not self._response_received and self._expected_packet_id:
            logging.warning("Start response not received => start_timeout.")
            self.start_timeout.emit()

    def _stop_timeout_check(self) -> None:
        if not self._response_received and self._expected_packet_id:
            logging.warning("Stop response not received => stop_timeout.")
            self.stop_timeout.emit()

    def _disconnect_timeout_check(self) -> None:
        if not self._response_received and self._expected_packet_id:
            logging.warning("Stop response not received => forcibly cleanup => disconnect_timeout.")
            self.disconnect_failure.emit("Stop response not received => forcibly cleanup => disconnect_timeout.")
            self._cleanup()

    # --------------------------------------------------------------------------
    # RESPONSES
    # --------------------------------------------------------------------------
    def _on_sync_response(self, rsp: SyncResponseData) -> None:
        self._response_received = True
        self._expected_packet_id = None

        if not rsp.success:
            logging.warning("Sync success=False => device not ready.")
            self.sync_failure.emit("Warning: device not ready or initialization failed.")
            self._state_machine.transition_to(DroneState.ERROR)
            return

        self._comms_service.register_gps_handler(self._handle_gps_data, once=False)
        self.sync_success.emit("Drone connected successfully")
        self._state_machine.transition_to(DroneState.CONFIGURING)

    def _on_config_response(self, rsp: ConfigResponseData) -> None:
        self._response_received = True
        self._expected_packet_id = None

        if not rsp.success:
            logging.warning("Config success=False => Undefined behavior")
            self.config_failure.emit("UNDEFINED BEHAVIOR: Config failed.")
            self._state_machine.transition_to(DroneState.ERROR)
            return

        self.config_success.emit("Config sent to drone.")
        self._state_machine.transition_to(DroneState.READY)

    def _on_start_response(self, rsp: StartResponseData) -> None:
        self._response_received = True
        self._expected_packet_id = None

        if not rsp.success:
            logging.warning("Start success=False => Improper state.")
            self.start_failure.emit("UNDEFINED BEHAVIOR: Improper state.")
            self._state_machine.transition_to(DroneState.ERROR)
            return

        self.start_success.emit("Drone is now starting.")
        self._comms_service.register_ping_handler(self._handle_ping_data, once=False)
        self._comms_service.register_loc_est_handler(self._handle_loc_est_data, once=False)
        self._state_machine.transition_to(DroneState.RUNNING)

    def _on_stop_response(self, rsp: StopResponseData) -> None:
        self._response_received = True
        self._expected_packet_id = None

        if not rsp.success:
            logging.warning("Stop success=False => Improper state.")
            self.stop_failure.emit("UNDEFINED BEHAVIOR: Improper state.")
            self._state_machine.transition_to(DroneState.ERROR)
            return

        self.stop_success.emit("Drone is now stopping.")
        self._comms_service.unregister_ping_handler(self._handle_ping_data)
        self._comms_service.unregister_loc_est_handler(self._handle_loc_est_data)
        self._state_machine.transition_to(DroneState.READY)

    def _on_disconnect_response(self, rsp: StopResponseData) -> None:
        self._response_received = True
        self._expected_packet_id = None

        if not rsp.success:
            logging.warning("Disconnect success=False => Improper state.")
            self.disconnect_failure.emit("UNDEFINED BEHAVIOR: Improper state.")
            self._state_machine.transition_to(DroneState.ERROR)
            return

        self.disconnect_success.emit("Drone is now disconnected.")
        self._cleanup()

    # --------------------------------------------------------------------------
    # Ack callbacks from DroneComms
    # --------------------------------------------------------------------------
    def _on_ack_success(self, packet_id: int) -> None:
        logging.info("Packet %d ack success", packet_id)

    def _on_ack_timeout(self, packet_id: int) -> None:
        logging.warning("Ack timeout for packet %d", packet_id)

    # --------------------------------------------------------------------------
    # UTILS
    # --------------------------------------------------------------------------
    def _cleanup(self) -> None:
        if self._comms_service:
            self._comms_service.stop()
            self._comms_service = None
        self._state_machine.transition_to(DroneState.DISCONNECTED)
        self.disconnect_success.emit("Disconnected")

    def _transform_coords(self, easting: float, northing: float, epsg_code: int) -> tuple[float, float]:
        epsg_str = str(epsg_code)
        zone = epsg_str[-2:]
        hemisphere = "north" if epsg_str[-3] == "6" else "south"

        utm_proj = pyproj.Proj(proj="utm", zone=zone, ellps="WGS84", hemisphere=hemisphere)
        wgs84_proj = pyproj.Proj("epsg:4326")
        transformer = pyproj.Transformer.from_proj(utm_proj, wgs84_proj, always_xy=True)
        lng, lat = transformer.transform(easting, northing)
        return (lat, lng)

    # Add logging method to match TypeScript interface
    @pyqtSlot(str)
    def log_message(self, message: str) -> None:
        """Log a message from the frontend."""
        logging.info("Frontend log: %s", message)
