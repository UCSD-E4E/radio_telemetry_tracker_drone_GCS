"""DroneDataManager module for handling drone and signal data in memory.

Emits PyQt signals upon data updates so the JS side can react in real-time.
"""

import logging

from PyQt6.QtCore import QObject, QVariant, pyqtSignal

from .models import DroneData, LocEstData, PingData

logging.basicConfig(level=logging.INFO)


class DroneDataManager(QObject):
    """Manager for drone and signal data stored in memory.

    Exposes signals:
      - drone_data_updated
      - ping_data_updated
      - loc_est_data_updated
    """

    # Signals for data updates
    drone_data_updated = pyqtSignal(QVariant)
    ping_data_updated = pyqtSignal(QVariant)
    loc_est_data_updated = pyqtSignal(QVariant)

    def __init__(self) -> None:
        """Initialize the drone data manager."""
        super().__init__()
        self._current_drone_data: DroneData | None = None
        self._pings: dict[int, list[PingData]] = {}
        self._location_estimates: dict[int, LocEstData] = {}

    def update_drone_data(self, data: DroneData) -> None:
        """Update the current drone position and status.

        Emit 'drone_data_updated' with the new data.
        """
        self._current_drone_data = data
        from dataclasses import asdict

        self.drone_data_updated.emit(QVariant(asdict(data)))

    def add_ping(self, ping: PingData) -> None:
        """Add a new signal ping to our internal dictionary.

        Emit 'ping_data_updated' with the new ping.
        """
        if ping.frequency not in self._pings:
            self._pings[ping.frequency] = []
        self._pings[ping.frequency].append(ping)

        from dataclasses import asdict

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

