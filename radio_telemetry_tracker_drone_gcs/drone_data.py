"""Module for handling drone and signal data."""

from __future__ import annotations

import logging
from dataclasses import asdict, dataclass
from pathlib import Path

from PyQt6.QtCore import QObject, QVariant, pyqtSignal

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration
DB_PATH = Path(__file__).parent.parent / "drone_data.db"


@dataclass
class DroneData:
    """Drone position and status data."""

    lat: float
    long: float
    altitude: float
    heading: float
    last_update: int  # timestamp in milliseconds


@dataclass
class PingData:
    """Signal ping data."""

    frequency: int
    amplitude: float
    lat: float
    long: float
    timestamp: int  # timestamp in milliseconds


@dataclass
class LocEstData:
    """Location estimation data."""

    frequency: int
    lat: float
    long: float
    timestamp: int  # timestamp in milliseconds


class DroneDataManager(QObject):
    """Manager for drone and signal data."""

    # Signals for data updates
    drone_data_updated = pyqtSignal(QVariant)
    ping_data_updated = pyqtSignal(QVariant)
    loc_est_data_updated = pyqtSignal(QVariant)

    def __init__(self) -> None:
        """Initialize the drone data manager."""
        super().__init__()
        self._current_drone_data: DroneData | None = None
        self._pings: dict[int, list[PingData]] = {}  # frequency -> list of pings
        self._location_estimates: dict[int, LocEstData] = {}  # frequency -> location estimate

    def update_drone_data(self, data: DroneData) -> None:
        """Update drone position and status."""
        self._current_drone_data = data
        # Emit signal with the new data
        self.drone_data_updated.emit(QVariant(asdict(data)))

    def add_ping(self, ping: PingData) -> None:
        """Add a new signal ping."""
        if ping.frequency not in self._pings:
            self._pings[ping.frequency] = []
        self._pings[ping.frequency].append(ping)
        # Emit signal with the new data
        self.ping_data_updated.emit(QVariant(asdict(ping)))

    def update_location_estimate(self, loc_est: LocEstData) -> None:
        """Update location estimate for a frequency."""
        self._location_estimates[loc_est.frequency] = loc_est
        # Emit signal with the new data
        self.loc_est_data_updated.emit(QVariant(asdict(loc_est)))

    def clear_frequency_data(self, frequency: int) -> bool:
        """Clear all data for a specific frequency."""
        try:
            if frequency in self._pings:
                del self._pings[frequency]
            if frequency in self._location_estimates:
                del self._location_estimates[frequency]
            # Emit a clear signal
            self.ping_data_updated.emit(QVariant({"frequency": frequency, "cleared": True}))
            self.loc_est_data_updated.emit(QVariant({"frequency": frequency, "cleared": True}))
        except Exception:
            logging.exception("Error clearing frequency data")
            return False
        return True

    def clear_all_data(self) -> bool:
        """Clear all signal and location data."""
        try:
            frequencies = list(set(list(self._pings.keys()) + list(self._location_estimates.keys())))
            self._pings.clear()
            self._location_estimates.clear()
            # Emit clear signals for all frequencies
            for freq in frequencies:
                self.ping_data_updated.emit(QVariant({"frequency": freq, "cleared": True}))
                self.loc_est_data_updated.emit(QVariant({"frequency": freq, "cleared": True}))
        except Exception:
            logging.exception("Error clearing all data")
            return False
        return True
