"""Local tile server with SQLite-based tile storage.

Handles:
- Caching of tiles in a SQLite DB
- Adding/removing POIs
- Retrieving tile info
"""

from __future__ import annotations

import logging
import sqlite3
from http import HTTPStatus
from pathlib import Path
from typing import TypedDict

import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent.parent / "tiles.db"

# Data structures
class MapSource(TypedDict):
    """Type definition for map source configuration.

    Attributes:
        id: Unique identifier for the map source
        name: Display name of the map source
        url_template: URL template for fetching tiles
        attribution: Copyright attribution text
    """

    id: str
    name: str
    url_template: str
    attribution: str


SATELLITE_ATTRIBUTION = (
    "© Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, "
    "Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
)

MAP_SOURCES = {
    "osm": {
        "id": "osm",
        "name": "OpenStreetMap",
        "url_template": "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        "attribution": "© OpenStreetMap contributors",
    },
    "satellite": {
        "id": "satellite",
        "name": "Satellite",
        "url_template": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        "attribution": SATELLITE_ATTRIBUTION,
    },
}


def init_db() -> None:
    """Initialize the tile and POI database tables if they don't exist."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tiles (
                z INTEGER,
                x INTEGER,
                y INTEGER,
                source TEXT,
                data BLOB,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (z, x, y, source)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS pois (
                name TEXT PRIMARY KEY,
                latitude REAL,
                longitude REAL
            )
        """)
        conn.commit()


def get_pois() -> list[dict]:
    """Retrieve all POIs from the database."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("SELECT name, latitude, longitude FROM pois")
        return [
            {
                "name": row[0],
                "coords": [row[1], row[2]],
            }
            for row in cursor.fetchall()
        ]


def add_poi(name: str, coords: tuple[float, float]) -> None:
    """Add or replace a POI in the database."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO pois (name, latitude, longitude) VALUES (?, ?, ?)",
            (name, coords[0], coords[1]),
        )
        conn.commit()


def remove_poi(name: str) -> None:
    """Remove a POI from the database."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM pois WHERE name = ?", (name,))
        conn.commit()


def rename_poi(old_name: str, new_name: str) -> None:
    """Rename a POI in the database."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "UPDATE pois SET name = ? WHERE name = ?",
            (new_name, old_name),
        )
        conn.commit()


def clear_tile_cache() -> int:
    """Clear all stored tiles. Returns the number of removed rows."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("DELETE FROM tiles")
        conn.commit()
        return cursor.rowcount


def get_tile_info() -> dict:
    """Get info about how many tiles are stored and their total size in MB."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("""
            SELECT COUNT(*) as total, SUM(LENGTH(data)) as total_size
            FROM tiles
        """)
        total, total_size = cursor.fetchone() or (0, 0)
        return {
            "total_tiles": total or 0,
            "total_size_mb": round((total_size or 0) / (1024 * 1024), 2),
        }


def fetch_tile(z: int, x: int, y: int, source_id: str) -> bytes | None:
    """Fetch a tile from the internet."""
    source = MAP_SOURCES.get(source_id)
    if not source:
        logger.error("Invalid map source: %s", source_id)
        return None

    url = source["url_template"].format(z=z, x=x, y=y)
    try:
        headers = {"User-Agent": "RTT-Drone-GCS/1.0", "Accept": "image/png"}
        logger.info("Fetching tile from %s", url)
        response = requests.get(url, headers=headers, timeout=3)
        if response.status_code != HTTPStatus.OK:
            return None
    except requests.RequestException:
        logger.info("Network error fetching tile - possibly offline.")
        return None
    else:
        return response.content


def get_tile(z: int, x: int, y: int, *, source_id: str = "osm", offline: bool = False) -> bytes | None:
    """Retrieve a tile from the local DB cache, or fetch from the internet if offline=False."""
    init_db()  # Ensure DB is ready
    with sqlite3.connect(DB_PATH, timeout=1) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA cache_size=-2000")

        cursor = conn.cursor()
        cursor.execute(
            "SELECT data FROM tiles WHERE z = ? AND x = ? AND y = ? AND source = ?",
            (z, x, y, source_id),
        )
        row = cursor.fetchone()
        if row:
            # Cached tile
            return row[0]

        if offline:
            # If offline mode and tile not in cache, return None
            logger.info("Tile not in cache and offline mode is enabled: %d/%d/%d source=%s", z, x, y, source_id)
            return None

        # Attempt to fetch from the internet
        tile_data = fetch_tile(z, x, y, source_id)
        if tile_data:
            cursor.execute(
                "INSERT OR REPLACE INTO tiles (z, x, y, source, data) VALUES (?, ?, ?, ?, ?)",
                (z, x, y, source_id, tile_data),
            )
            conn.commit()
            logger.info("Tile saved to cache: %d/%d/%d source=%s", z, x, y, source_id)
            return tile_data

        logger.warning("Failed to fetch tile: %d/%d/%d source=%s", z, x, y, source_id)
        return None
