"""Local tile server with SQLite-based tile storage."""

from __future__ import annotations

import logging
import sqlite3
from http import HTTPStatus
from pathlib import Path
from typing import TypedDict

import requests
from werkzeug.serving import WSGIRequestHandler

# Suppress development server warning
WSGIRequestHandler.log_request = lambda *_, **__: None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration
DB_PATH = Path(__file__).parent.parent / "tiles.db"

class MapSource(TypedDict):
    """Map source configuration."""
    id: str
    name: str
    url_template: str
    attribution: str

# Split the long attribution string
SATELLITE_ATTRIBUTION = (
    "© Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, "
    "Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
)

MAP_SOURCES = {
    "osm": MapSource(
        id="osm",
        name="OpenStreetMap",
        url_template="https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution="© OpenStreetMap contributors",
    ),
    "satellite": MapSource(
        id="satellite",
        name="Satellite",
        url_template="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution=SATELLITE_ATTRIBUTION,
    ),
}

def init_db() -> None:
    """Initialize the tile database."""
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
    """Get all POIs."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("SELECT name, latitude, longitude FROM pois")
        return [
            {
                "name": name,
                "coords": [lat, lng],
            }
            for name, lat, lng in cursor.fetchall()
        ]

def add_poi(name: str, coords: tuple[float, float]) -> None:
    """Add a POI."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO pois (name, latitude, longitude) VALUES (?, ?, ?)",
            (name, coords[0], coords[1]),
        )
        conn.commit()

def remove_poi(name: str) -> None:
    """Remove a POI."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM pois WHERE name = ?", (name,))
        conn.commit()

def get_tile_from_db(z: int, x: int, y: int, source: str) -> bytes | None:
    """Get a tile from the database."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute(
            "SELECT data FROM tiles WHERE z = ? AND x = ? AND y = ? AND source = ?",
            (z, x, y, source),
        )
        row = cursor.fetchone()
        return row[0] if row else None

def save_tile_to_db(z: int, x: int, y: int, source: str, data: bytes) -> None:
    """Save a tile to the database."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO tiles (z, x, y, source, data) VALUES (?, ?, ?, ?, ?)",
            (z, x, y, source, data),
        )
        conn.commit()

def clear_tile_cache() -> int:
    """Clear all stored tiles. Returns number of tiles removed."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("DELETE FROM tiles")
        conn.commit()
        return cursor.rowcount

def get_tile_info() -> dict:
    """Get information about stored tiles."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("""
            SELECT COUNT(*) as total, SUM(LENGTH(data)) as total_size
            FROM tiles
        """)
        total, total_size = cursor.fetchone()
        return {
            "total_tiles": total or 0,
            "total_size_mb": round((total_size or 0) / (1024 * 1024), 2),
        }

def fetch_tile(z: int, x: int, y: int, source: str) -> bytes | None:
    """Fetch a tile from the specified source."""
    if source not in MAP_SOURCES:
        return None

    try:
        url = MAP_SOURCES[source]["url_template"].format(z=z, x=x, y=y)
        headers = {
            "User-Agent": "RTT-Drone-GCS/1.0",
            "Accept": "image/png",
        }
        logger.info("Fetching tile from %s", url)
        response = requests.get(url, headers=headers, timeout=3)
        if response.status_code != HTTPStatus.OK:
            return None
    except (requests.RequestException, ValueError):
        logger.info("Network error fetching tile - working offline")
        return None
    return response.content

def get_tile(
    z: int,
    x: int,
    y: int,
    source_id: str = "osm",
    *,  # Make offline a keyword-only argument
    offline: bool = False,
) -> bytes | None:
    """Get a map tile, either from cache or from the internet."""
    source = MAP_SOURCES.get(source_id)
    if not source:
        logger.error("Invalid map source: %s", source_id)
        return None

    # Use connection pooling with context manager
    with sqlite3.connect(DB_PATH, timeout=1) as conn:
        conn.execute("PRAGMA journal_mode=WAL")  # Use Write-Ahead Logging
        conn.execute("PRAGMA synchronous=NORMAL")  # Reduce synchronous mode
        conn.execute("PRAGMA cache_size=-2000")  # Set cache size to 2MB

        # Try to get from cache first
        cursor = conn.cursor()
        cursor.execute(
            "SELECT data FROM tiles WHERE z = ? AND x = ? AND y = ? AND source = ?",
            (z, x, y, source_id),
        )
        row = cursor.fetchone()
        if row:
            logger.info("Tile found in cache: z=%d, x=%d, y=%d, source=%s", z, x, y, source_id)
            return row[0]

        # If not in cache and offline mode, return None
        if offline:
            logger.info("Tile not in cache and offline mode enabled: z=%d, x=%d, y=%d, source=%s", z, x, y, source_id)
            return None

        # Fetch from internet
        logger.info("Fetching tile from internet: z=%d, x=%d, y=%d, source=%s", z, x, y, source_id)
        tile_data = fetch_tile(z, x, y, source_id)
        if tile_data:
            # Use executemany for better performance
            cursor.execute(
                "INSERT OR REPLACE INTO tiles (z, x, y, source, data) VALUES (?, ?, ?, ?, ?)",
                (z, x, y, source_id, tile_data),
            )
            conn.commit()
            logger.info("Tile saved to cache: z=%d, x=%d, y=%d, source=%s", z, x, y, source_id)
        else:
            logger.warning("Failed to fetch tile: z=%d, x=%d, y=%d, source=%s", z, x, y, source_id)
        return tile_data

def start_tile_server() -> None:
    """Start the tile server."""
    init_db()
