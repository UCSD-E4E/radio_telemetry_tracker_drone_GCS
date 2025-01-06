"""DroneCommsService wraps radio-telemetry-tracker-drone-comms-package."""

from __future__ import annotations

import logging
import time
from typing import Callable

from radio_telemetry_tracker_drone_comms_package import (
    DroneComms,
    RadioConfig,
    StopRequestData,
)
from radio_telemetry_tracker_drone_comms_package import (
    GPSData as DroneGPSData,
)

from radio_telemetry_tracker_drone_gcs.comms.connection_handler import ConnectionHandler
from radio_telemetry_tracker_drone_gcs.data.models import ConnectionMetrics, DroneData


class DroneCommsService:
    """Manages the DroneComms lifecycle (start, stop), sync/stop requests, ack tracking, etc."""

    def __init__(  # noqa: PLR0913
        self,
        radio_config: RadioConfig | None = None,
        on_drone_data: Callable[[DroneData], None] | None = None,
        on_connection_metrics: Callable[[ConnectionMetrics], None] | None = None,
        on_ack_success: Callable[[int], None] | None = None,
        on_ack_timeout: Callable[[int], None] | None = None,
        ack_timeout: float = 1.0,
        max_retries: int = 3,
    ) -> None:
        """Initialize the drone communications service.

        Args:
            radio_config: Configuration for radio interface
            on_drone_data: Callback for new drone position data
            on_connection_metrics: Callback for connection quality updates
            on_ack_success: Callback when acknowledgment received
            on_ack_timeout: Callback when acknowledgment timeout
            ack_timeout: Timeout for packet acknowledgment in seconds
            max_retries: Maximum number of packet retries
        """
        self._on_drone_data = on_drone_data
        self.ack_timeout = ack_timeout
        self.max_retries = max_retries
        self._on_ack_success = on_ack_success

        # Initialize connection handler
        self._connection_handler = ConnectionHandler(
            ack_timeout=ack_timeout,
            max_retries=max_retries,
            on_metrics_updated=on_connection_metrics,
        )

        # Initialize DroneComms if radio_config provided
        self._drone_comms = None
        if radio_config is not None:
            self._drone_comms = DroneComms(
                radio_config=radio_config,
                ack_timeout=ack_timeout,
                max_retries=max_retries,
                on_ack_success=self._on_ack_success,
                on_ack_timeout=on_ack_timeout,
            )

    def handle_gps_data(self, data: DroneGPSData) -> None:
        """Handle incoming GPS data from drone."""
        try:
            # Update connection metrics first
            self._connection_handler.handle_packet(packet_id=data.packet_id, timestamp_us=data.timestamp_us)

            # Process GPS data
            drone_data = DroneData(
                lat=data.latitude,
                long=data.longitude,
                altitude=data.altitude,
                heading=data.heading,
                last_update=data.timestamp_us // 1000,  # Convert to ms
            )
            self._on_drone_data(drone_data)

        except Exception:
            logging.exception("Error handling GPS data")

    def register_gps_handler(self, callback: Callable[[dict], None]) -> None:
        """Register a handler for GPS data messages from the drone."""
        self._drone_comms.register_gps_handler(callback)

    def send_stop_request(self) -> int:
        """Send a stop request. Returns the packet_id for tracking."""
        stop_data = StopRequestData()
        packet_id, _, _ = self._drone_comms.send_stop_request(stop_data)
        # Update connection metrics for this packet too
        self._connection_handler.handle_packet(packet_id=packet_id, timestamp_us=int(time.time() * 1_000_000))
        return packet_id

    @property
    def ack_timeout_s(self) -> float:
        """Expose the ack timeout in seconds."""
        return self.ack_timeout

    @property
    def retries(self) -> int:
        """Get the maximum number of retries for packet acknowledgment."""
        return self.max_retries


# Re-export RadioConfig for use by communication_bridge
__all__ = ["DroneCommsService", "RadioConfig"]
