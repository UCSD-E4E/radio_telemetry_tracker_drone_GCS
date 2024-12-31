"""Bridge module for backend-frontend communication."""

import base64
import logging

from PyQt6.QtCore import QObject, QVariant, pyqtSignal, pyqtSlot

from .tile_server import add_poi, clear_tile_cache, get_pois, get_tile, get_tile_info, init_db, remove_poi

logging.basicConfig(level=logging.INFO)


class Bridge(QObject):
    """Bridge class for communication between Python backend and JavaScript frontend."""

    error_message = pyqtSignal(str)
    tile_info_updated = pyqtSignal(QVariant)
    pois_updated = pyqtSignal(QVariant)

    def __init__(self) -> None:
        """Initialize the bridge."""
        super().__init__()
        # Initialize the tile server database
        init_db()

    def _emit_tile_info(self) -> None:
        """Helper to emit tile info as QVariant."""
        info = get_tile_info()
        self.tile_info_updated.emit(QVariant(info))

    def _emit_pois(self) -> None:
        """Helper to emit POIs as QVariant."""
        pois = get_pois()
        self.pois_updated.emit(QVariant(pois))

    @pyqtSlot(int, int, int, str, bool, result=str)
    def get_tile(self, z: int, x: int, y: int, source_id: str = 'osm', offline: bool = False) -> str:
        """Get a map tile as base64 encoded PNG data."""
        result = ""
        try:
            logging.info("Tile request: z=%d, x=%d, y=%d, source=%s, offline=%s", z, x, y, source_id, offline)

            tile_data = get_tile(z, x, y, source_id, offline)
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
        success = False
        try:
            removed = clear_tile_cache()
            logging.info("Cleared %d tiles", removed)
            self._emit_tile_info()
            success = True
        except Exception:
            logging.exception("Error clearing tile cache")
        return success

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
        success = False
        try:
            add_poi(name, (coords[0], coords[1]))
            self._emit_pois()
            success = True
        except Exception:
            logging.exception("Error adding POI")
        return success

    @pyqtSlot(str, result=bool)
    def remove_poi(self, name: str) -> bool:
        """Remove a POI."""
        success = False
        try:
            remove_poi(name)
            self._emit_pois()
            success = True
        except Exception:
            logging.exception("Error removing POI")
        return success
