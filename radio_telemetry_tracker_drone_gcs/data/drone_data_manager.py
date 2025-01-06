"""DroneDataManager module for handling drone and signal data in memory.

Emits PyQt signals upon data updates so the JS side can react in real-time.
"""

import logging
from dataclasses import asdict

from PyQt6.QtCore import QObject, QVariant, pyqtSignal

from .models import DroneData, LocEstData, PingData

logging.basicConfig(level=logging.INFO)


class DroneDataManager(QObject):
    """Manages drone telemetry and signal data in memory.

    Emits signals when data is updated so the frontend can react.
    """

    # Signals for data updates
    drone_data_updated = pyqtSignal(QVariant)
    ping_data_updated = pyqtSignal(QVariant)
    loc_est_data_updated = pyqtSignal(QVariant)

    def __init__(self) -> None:
        """Initialize the DroneDataManager."""
        super().__init__()
        self._drone_data: DroneData | None = None
        self._pings: dict[int, list[PingData]] = {}  # frequency -> list of pings
        self._location_estimates: dict[int, LocEstData] = {}  # frequency -> location estimate

    def update_drone_data(self, data: DroneData | None) -> None:
        """Update drone position and status.

        If data is None, indicates drone is disconnected.
        """
        self._drone_data = data
        if data is None:
            # Emit disconnected state
            logging.info("Emitting disconnected state to frontend")
            self.drone_data_updated.emit(QVariant({"disconnected": True}))
        else:
            # Emit normal data update
            logging.info("Emitting drone data to frontend: %s", asdict(data))
            self.drone_data_updated.emit(QVariant(asdict(data)))

    def add_ping(self, ping: PingData) -> None:
        """Add a new signal ping for a frequency.

        Emit 'ping_data_updated' with the new ping.
        """
        if ping.frequency not in self._pings:
            self._pings[ping.frequency] = []
        self._pings[ping.frequency].append(ping)

        self.ping_data_updated.emit(QVariant(asdict(ping)))

    def update_location_estimate(self, loc_est: LocEstData) -> None:
        """Update the location estimate for a specific frequency.

        Emit 'loc_est_data_updated' with the new estimate.
        """
        self._location_estimates[loc_est.frequency] = loc_est

        from dataclasses import asdict

        self.loc_est_data_updated.emit(QVariant(asdict(loc_est)))

    def clear_frequency_data(self, frequency: int) -> bool:
        """Clear all data for a specific frequency (pings + location estimate).

        Emits a 'cleared' signal for both ping and location estimate.
        """
        try:
            if frequency in self._pings:
                del self._pings[frequency]
            if frequency in self._location_estimates:
                del self._location_estimates[frequency]

            self.ping_data_updated.emit(QVariant({"frequency": frequency, "cleared": True}))
            self.loc_est_data_updated.emit(QVariant({"frequency": frequency, "cleared": True}))
        except Exception:
            logging.exception("Error clearing frequency data")
            return False
        else:
            return True

    def clear_all_data(self) -> bool:
        """Clear all signal and location data for all frequencies.

        Emits a 'cleared' signal for each frequency found.
        """
        try:
            frequencies = set(list(self._pings.keys()) + list(self._location_estimates.keys()))
            self._pings.clear()
            self._location_estimates.clear()

            for freq in frequencies:
                self.ping_data_updated.emit(QVariant({"frequency": freq, "cleared": True}))
                self.loc_est_data_updated.emit(QVariant({"frequency": freq, "cleared": True}))
        except Exception:
            logging.exception("Error clearing all data")
            return False
        else:
            return True

