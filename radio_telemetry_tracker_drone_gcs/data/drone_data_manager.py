"""Manager for drone telemetry data including GPS, ping detections, and location estimates."""

from __future__ import annotations

from dataclasses import asdict
from typing import TYPE_CHECKING, Any

from PyQt6.QtCore import QObject, QVariant, pyqtSignal

if TYPE_CHECKING:
    from radio_telemetry_tracker_drone_gcs.models import GpsData, LocEstData, PingData


class DroneDataManager(QObject):
    """Manages drone telemetry data including GPS and frequency data."""

    gps_data_updated = pyqtSignal(QVariant)
    frequency_data_updated = pyqtSignal(QVariant)

    def __init__(self) -> None:
        """Initialize drone data manager with empty GPS, ping, and location estimate storage."""
        super().__init__()
        self._frequency_data: dict[int, dict[str, Any]] = {}

    def update_gps(self, gps: GpsData) -> None:
        """Update current GPS data and emit update signal with the new data."""
        self.gps_data_updated.emit(QVariant(asdict(gps)))

    def add_ping(self, ping: PingData) -> None:
        """Add a new ping detection and emit update signal."""
        freq = ping.frequency
        if freq not in self._frequency_data:
            self._frequency_data[freq] = {"pings": [], "locationEstimate": None}

        ping_dict = asdict(ping)
        self._frequency_data[freq]["pings"].append(ping_dict)
        self.frequency_data_updated.emit(QVariant(self._frequency_data))

    def update_loc_est(self, loc_est: LocEstData) -> None:
        """Update location estimate for a frequency."""
        freq = loc_est.frequency
        if freq not in self._frequency_data:
            self._frequency_data[freq] = {"pings": [], "locationEstimate": None}

        loc_est_dict = asdict(loc_est)
        self._frequency_data[freq]["locationEstimate"] = loc_est_dict
        self.frequency_data_updated.emit(QVariant(self._frequency_data))

    def clear_frequency_data(self, frequency: int) -> None:
        """Clear data for specified frequency."""
        if frequency in self._frequency_data:
            del self._frequency_data[frequency]
            self.frequency_data_updated.emit(QVariant(self._frequency_data))

    def clear_all_frequency_data(self) -> None:
        """Clear all frequency data."""
        self._frequency_data.clear()
        self.frequency_data_updated.emit(QVariant(self._frequency_data))
