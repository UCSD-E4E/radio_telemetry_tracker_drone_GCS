"""Bridge module for backend-frontend communication."""
from __future__ import annotations

import base64
import logging
import time

from PyQt6.QtCore import QObject, QVariant, pyqtSignal, pyqtSlot

from .drone_data import DroneData, DroneDataManager, LocEstData, PingData
from .tile_server import (
    add_poi,
    clear_tile_cache,
    get_pois,
    get_tile,
    get_tile_info,
    init_db,
    remove_poi,
)

logging.basicConfig(level=logging.INFO)


class Bridge(QObject):
    """Bridge class for communication between Python backend and JavaScript frontend."""

    error_message = pyqtSignal(str)
    tile_info_updated = pyqtSignal(QVariant)
    pois_updated = pyqtSignal(QVariant)

    # Expose drone data signals
    drone_data_updated = pyqtSignal(QVariant)
    ping_data_updated = pyqtSignal(QVariant)
    loc_est_data_updated = pyqtSignal(QVariant)

    def __init__(self) -> None:
        """Initialize the bridge."""
        super().__init__()
        # Initialize the tile server database
        init_db()

        # Initialize drone data manager
        self._drone_manager = DroneDataManager()
        self._drone_manager.drone_data_updated.connect(self.drone_data_updated.emit)
        self._drone_manager.ping_data_updated.connect(self.ping_data_updated.emit)
        self._drone_manager.loc_est_data_updated.connect(self.loc_est_data_updated.emit)

    def _emit_tile_info(self) -> None:
        """Helper to emit tile info as QVariant."""
        info = get_tile_info()
        self.tile_info_updated.emit(QVariant(info))

    def _emit_pois(self) -> None:
        """Helper to emit POIs as QVariant."""
        pois = get_pois()
        self.pois_updated.emit(QVariant(pois))

    @pyqtSlot("int", "int", "int", "QString", "QVariantMap", result="QString")
    def get_tile(
        self,
        z: int,
        x: int,
        y: int,
        source_id: str = "osm",
        options: dict | None = None,
    ) -> str:
        """Get a map tile as base64 encoded PNG data."""
        result = ""
        try:
            options = options or {}
            offline = options.get("offline", False)
            logging.info("Tile request: z=%d, x=%d, y=%d, source=%s, offline=%s", z, x, y, source_id, offline)

            tile_data = get_tile(z, x, y, source_id, offline=offline)
            if tile_data:
                self._emit_tile_info()
                result = base64.b64encode(tile_data).decode("utf-8")
        except Exception:
            logging.exception("Error serving tile %d/%d/%d from %s", z, x, y, source_id)
        return result

    @pyqtSlot(result="QVariant")
    def get_tile_info(self) -> dict:
        """Get information about stored tiles."""
        try:
            info = get_tile_info()
            return QVariant(info)
        except Exception:
            logging.exception("Error getting tile info")
            return QVariant({})

    @pyqtSlot(result=bool)
    def clear_tile_cache(self) -> bool:
        """Clear all stored tiles."""
        try:
            removed = clear_tile_cache()
            logging.info("Cleared %d tiles", removed)
            self._emit_tile_info()
        except Exception:
            logging.exception("Error clearing tile cache")
            return False
        else:
            return True

    @pyqtSlot(result="QVariant")
    def get_pois(self) -> list[dict]:
        """Get all POIs."""
        try:
            pois = get_pois()
            logging.info("Retrieved POIs: %s", pois)
            return QVariant(pois)
        except Exception:
            logging.exception("Error getting POIs")
            return QVariant([])

    @pyqtSlot(str, "QVariantList", result=bool)
    def add_poi(self, name: str, coords: list[float]) -> bool:
        """Add a POI."""
        try:
            add_poi(name, (coords[0], coords[1]))
            self._emit_pois()
        except Exception:
            logging.exception("Error adding POI")
            return False
        else:
            return True

    @pyqtSlot(str, result=bool)
    def remove_poi(self, name: str) -> bool:
        """Remove a POI."""
        try:
            remove_poi(name)
            self._emit_pois()
        except Exception:
            logging.exception("Error removing POI")
            return False
        else:
            return True

    # New methods for drone data
    @pyqtSlot("QVariantMap", result=bool)
    def update_drone_data(self, data: dict) -> bool:
        """Update drone position and status."""
        try:
            drone_data = DroneData(
                lat=data["lat"],
                long=data["long"],
                altitude=data["altitude"],
                heading=data["heading"],
                last_update=int(time.time() * 1000),  # Current time in milliseconds
            )
            self._drone_manager.update_drone_data(drone_data)
        except Exception:
            logging.exception("Error updating drone data")
            return False
        else:
            return True

    @pyqtSlot("QVariantMap", result=bool)
    def add_ping(self, data: dict) -> bool:
        """Add a new signal ping."""
        try:
            ping_data = PingData(
                frequency=data["frequency"],
                amplitude=data["amplitude"],
                lat=data["lat"],
                long=data["long"],
                timestamp=int(time.time() * 1000),  # Current time in milliseconds
            )
            self._drone_manager.add_ping(ping_data)
        except Exception:
            logging.exception("Error adding ping data")
            return False
        else:
            return True

    @pyqtSlot("QVariantMap", result=bool)
    def update_location_estimate(self, data: dict) -> bool:
        """Update location estimate for a frequency."""
        try:
            loc_est_data = LocEstData(
                frequency=data["frequency"],
                lat=data["lat"],
                long=data["long"],
                timestamp=int(time.time() * 1000),  # Current time in milliseconds
            )
            self._drone_manager.update_location_estimate(loc_est_data)
        except Exception:
            logging.exception("Error updating location estimate")
            return False
        else:
            return True

    @pyqtSlot(int, result=bool)
    def clear_frequency_data(self, frequency: int) -> bool:
        """Clear all data for a specific frequency."""
        try:
            return self._drone_manager.clear_frequency_data(frequency)
        except Exception:
            logging.exception("Error clearing frequency data")
            return False

    @pyqtSlot(result=bool)
    def clear_all_data(self) -> bool:
        """Clear all signal and location data."""
        try:
            return self._drone_manager.clear_all_data()
        except Exception:
            logging.exception("Error clearing all data")
            return False
