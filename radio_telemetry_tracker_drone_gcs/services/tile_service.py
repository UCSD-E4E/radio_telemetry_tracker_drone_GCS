"""tile_service.py: orchestrates fetching tiles from internet or DB, plus offline logic."""
from __future__ import annotations

import logging
from http import HTTPStatus

import requests

from radio_telemetry_tracker_drone_gcs.services.poi_db import init_db  # Reuse same DB if needed
from radio_telemetry_tracker_drone_gcs.services.tile_db import (
    clear_tile_cache_db,
    get_tile_db,
    get_tile_info_db,
    store_tile_db,
)

# Hardcode map sources for now, or load from config
MAP_SOURCES = {
    "osm": {
        "id": "osm",
        "url_template": "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        "attribution": "© OpenStreetMap contributors",
    },
    "satellite": {
        "id": "satellite",
        "url_template": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        "attribution": "© Esri etc...",
    },
}


class TileService:
    """Handles tile caching logic, offline checks, tile fetching from net."""

    def __init__(self) -> None:
        """Initialize the tile service by ensuring the database is ready."""
        init_db()  # ensure DB is ready

    def get_tile_info(self) -> dict:
        """Get tile info from the database."""
        return get_tile_info_db()

    def clear_tile_cache(self) -> bool:
        """Clear the tile cache in the database."""
        rows = clear_tile_cache_db()
        return rows >= 0

    def get_tile(self, z: int, x: int, y: int, source_id: str, *, offline: bool) -> bytes | None:
        """Retrieve tile from DB or fetch from internet if offline=False."""
        # Check DB
        existing = get_tile_db(z, x, y, source_id)
        if existing:
            return existing

        if offline:
            # offline mode => no fetch
            logging.info("Offline mode, tile missing from DB => none returned")
            return None

        # fetch from net
        tile_data = self._fetch_tile(z, x, y, source_id)
        if tile_data:
            store_tile_db(z, x, y, source_id, tile_data)
        return tile_data

    def _fetch_tile(self, z: int, x: int, y: int, source_id: str) -> bytes | None:
        ms = MAP_SOURCES.get(source_id)
        if not ms:
            logging.error("Invalid source_id: %s", source_id)
            return None
        url = ms["url_template"].format(z=z, x=x, y=y)
        try:
            logging.info("Fetching tile from %s", url)
            resp = requests.get(url, timeout=5)
            if resp.status_code == HTTPStatus.OK:
                return resp.content
            logging.warning("Tile fetch returned status %d", resp.status_code)
        except requests.RequestException:
            logging.warning("Network error fetching tile for %d/%d/%d source=%s", z, x, y, source_id)
        return None
