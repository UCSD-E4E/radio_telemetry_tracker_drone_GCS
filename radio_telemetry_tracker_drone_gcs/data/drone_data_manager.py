"""Manager for drone telemetry data including GPS, ping detections, and location estimates."""

from __future__ import annotations

from dataclasses import asdict
from typing import TYPE_CHECKING

from PyQt6.QtCore import QObject, QVariant, pyqtSignal

if TYPE_CHECKING:
    from radio_telemetry_tracker_drone_gcs.models import GpsData, LocEstData, PingData


class DroneDataManager(QObject):
    """Manages and emits drone telemetry data including GPS position, ping detections, and location estimates."""

    gps_data_updated = pyqtSignal(QVariant)
    ping_data_updated = pyqtSignal(QVariant)
    loc_est_data_updated = pyqtSignal(QVariant)

    def __init__(self) -> None:
        """Initialize drone data manager with empty GPS, ping, and location estimate storage."""
        super().__init__()
        self._gps_data: GpsData | None = None
        self._pings: dict[int, list[PingData]] = {}
        self._loc_est_data: dict[int, LocEstData] = {}

    def update_gps_data(self, gps: GpsData | None) -> None:
        """Update current GPS data and emit update signal with the new data."""
        self._gps_data = gps
        self.gps_data_updated.emit(QVariant(asdict(gps)))

    def add_ping(self, ping: PingData) -> None:
        """Add a new ping detection and emit update signal with the ping data."""
        freq = ping.frequency
        if freq not in self._pings:
            self._pings[freq] = []
        self._pings[freq].append(ping)
        self.ping_data_updated.emit(QVariant(asdict(ping)))

    def update_loc_est_data(self, loc_est: LocEstData) -> None:
        """Update location estimate for a frequency and emit update signal with the new data."""
        self._loc_est_data[loc_est.frequency] = loc_est
        self.loc_est_data_updated.emit(QVariant(asdict(loc_est)))

    def clear_frequency_data(self, frequency: int) -> None:
        """Clear all ping detections and location estimates for the specified frequency."""
        if frequency in self._pings:
            del self._pings[frequency]
            self.ping_data_updated.emit(QVariant({"frequency": frequency, "cleared": True}))
        if frequency in self._loc_est_data:
            del self._loc_est_data[frequency]
            self.loc_est_data_updated.emit(QVariant({"frequency": frequency, "cleared": True}))

    def clear_all_frequency_data(self) -> None:
        """Clear all ping detections and location estimates for all frequencies."""
        for frequency in list(self._pings.keys()):
            self.clear_frequency_data(frequency)
        for frequency in list(self._loc_est_data.keys()):
            self.clear_frequency_data(frequency)
