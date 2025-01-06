"""Manages DroneData, pings, location estimates in memory. Emits PyQt signals."""

from __future__ import annotations

import logging
from dataclasses import asdict
from typing import TYPE_CHECKING

from PyQt6.QtCore import QObject, QVariant, pyqtSignal

if TYPE_CHECKING:
    from .models import DroneData, LocEstData, PingData, ConnectionMetrics


class DroneDataManager(QObject):
    """In-memory manager for drone & signal data."""

    drone_data_updated = pyqtSignal(QVariant)
    connection_metrics_updated = pyqtSignal(QVariant)
    ping_data_updated = pyqtSignal(QVariant)
    loc_est_data_updated = pyqtSignal(QVariant)

    def __init__(self) -> None:
        """Initialize the DroneDataManager."""
        super().__init__()
        self._drone_data: DroneData | None = None
        self._connection_metrics: ConnectionMetrics | None = None
        self._pings: dict[int, list[PingData]] = {}
        self._location_estimates: dict[int, LocEstData] = {}

    def update_drone_data(self, data: DroneData | None) -> None:
        """Update the drone data. If None, implies disconnected state."""
        self._drone_data = data
        if data is None:
            logging.info("Drone disconnected, emitting disconnected state")
            self.drone_data_updated.emit(QVariant({"disconnected": True}))
        else:
            logging.info("Drone data updated: %s", asdict(data))
            self.drone_data_updated.emit(QVariant(asdict(data)))

    def update_connection_metrics(self, metrics: ConnectionMetrics | None) -> None:
        self._connection_metrics = metrics
        if metrics is None:
            self.connection_metrics_updated.emit(QVariant({"disconnected": True}))
        else:
            self.connection_metrics_updated.emit(QVariant(asdict(metrics)))

    def add_ping(self, ping: PingData) -> None:
        """Add a ping to the manager."""
        freq = ping.frequency
        if freq not in self._pings:
            self._pings[freq] = []
        self._pings[freq].append(ping)
        logging.info("Added ping: freq=%d, amplitude=%.2f", freq, ping.amplitude)
        self.ping_data_updated.emit(QVariant(asdict(ping)))

    def update_location_estimate(self, loc_est: LocEstData) -> None:
        """Update the location estimate for a frequency."""
        self._location_estimates[loc_est.frequency] = loc_est
        logging.info("Location estimate updated: freq=%d", loc_est.frequency)
        self.loc_est_data_updated.emit(QVariant(asdict(loc_est)))

    def clear_frequency_data(self, frequency: int) -> bool:
        """Clear pings and loc_est for a given frequency. Emit 'cleared' signals."""
        try:
            if frequency in self._pings:
                del self._pings[frequency]
            if frequency in self._location_estimates:
                del self._location_estimates[frequency]

            self.ping_data_updated.emit(QVariant({"frequency": frequency, "cleared": True}))
            self.loc_est_data_updated.emit(QVariant({"frequency": frequency, "cleared": True}))
        except Exception:
            logging.exception("Failed to clear frequency data")
            return False
        else:
            return True

    def clear_all_data(self) -> bool:
        """Clear all frequencies' data."""
        try:
            freqs = set(list(self._pings.keys()) + list(self._location_estimates.keys()))
            self._pings.clear()
            self._location_estimates.clear()

            for f in freqs:
                self.ping_data_updated.emit(QVariant({"frequency": f, "cleared": True}))
                self.loc_est_data_updated.emit(QVariant({"frequency": f, "cleared": True}))

            # Also clear drone_data
            self.update_drone_data(None)
        except Exception:
            logging.exception("Failed to clear all data")
            return False
        else:
            return True
