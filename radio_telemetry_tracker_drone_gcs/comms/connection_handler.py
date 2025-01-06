"""Handles connection quality metrics for all packet types."""

import logging
import time
from typing import Callable

from radio_telemetry_tracker_drone_gcs.data.models import ConnectionMetrics


class ConnectionHandler:
    """Tracks packet delivery metrics and computes connection quality."""

    PING_WINDOW_SIZE = 10

    # Connection quality thresholds
    GREAT_PING_RATIO = 0.2
    GOOD_PING_RATIO = 0.4
    OK_PING_RATIO = 0.6
    BAD_PING_RATIO = 0.8
    GREAT_PACKET_LOSS = 5
    GOOD_PACKET_LOSS = 10
    OK_PACKET_LOSS = 20
    BAD_PACKET_LOSS = 30

    def __init__(
        self,
        ack_timeout: float,
        max_retries: int,
        on_metrics_updated: Callable[[ConnectionMetrics], None],
    ) -> None:
        """Initialize connection handler.

        Args:
            ack_timeout: Timeout for packet acknowledgment in seconds
            max_retries: Maximum number of packet retries
            on_metrics_updated: Callback for connection quality updates
        """
        self._ack_timeout_s = ack_timeout
        self._max_retries = max_retries
        self._on_metrics_updated = on_metrics_updated

        self._last_packet_id: int | None = None
        self._missed_packets = 0
        self._total_packets = 0
        self._last_ping_times: list[float] = []

    def handle_packet(self, packet_id: int, timestamp_us: int) -> None:
        """Update metrics based on received packet."""
        try:
            current_time_us = int(time.time() * 1_000_000)
            ping_time_ms = (current_time_us - timestamp_us) / 1000.0

            # Update ping times window
            self._last_ping_times.append(ping_time_ms)
            if len(self._last_ping_times) > self.PING_WINDOW_SIZE:
                self._last_ping_times.pop(0)
            avg_ping = sum(self._last_ping_times) / len(self._last_ping_times)

            # Update packet loss tracking
            if self._last_packet_id is not None:
                missing = packet_id - self._last_packet_id - 1
                if missing > 0:
                    self._missed_packets += missing
            self._last_packet_id = packet_id
            self._total_packets += 1

            packet_loss = 0.0
            if self._total_packets > 0:
                packet_loss = (self._missed_packets / (self._total_packets + self._missed_packets)) * 100.0

            # Compute quality
            max_ping = self._ack_timeout_s * 1000.0 * self._max_retries
            ping_ratio = avg_ping / max_ping

            if ping_ratio <= self.GREAT_PING_RATIO and packet_loss <= self.GREAT_PACKET_LOSS:
                quality = "great"
            elif ping_ratio <= self.GOOD_PING_RATIO and packet_loss <= self.GOOD_PACKET_LOSS:
                quality = "good"
            elif ping_ratio <= self.OK_PING_RATIO and packet_loss <= self.OK_PACKET_LOSS:
                quality = "ok"
            elif ping_ratio <= self.BAD_PING_RATIO and packet_loss <= self.BAD_PACKET_LOSS:
                quality = "bad"
            else:
                quality = "critical"

            metrics = ConnectionMetrics(
                ping_time=int(avg_ping),
                packet_loss=packet_loss,
                connection_quality=quality,
                last_update=current_time_us // 1000,
            )
            self._on_metrics_updated(metrics)

        except Exception:
            logging.exception("Error updating connection metrics")
