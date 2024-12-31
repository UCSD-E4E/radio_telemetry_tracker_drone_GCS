"""Local tile server with SQLite-based tile storage."""

from __future__ import annotations

import logging
import sqlite3
from http import HTTPStatus
from pathlib import Path

import requests
from werkzeug.serving import WSGIRequestHandler

# Suppress development server warning
WSGIRequestHandler.log_request = lambda *_, **__: None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration
DB_PATH = Path(__file__).parent.parent / "tiles.db"


def init_db() -> None:
    """Initialize the tile database."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tiles (
                z INTEGER,
                x INTEGER,
                y INTEGER,
                data BLOB,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (z, x, y)
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


def get_tile_from_db(z: int, x: int, y: int) -> bytes | None:
    """Get a tile from the database."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("SELECT data FROM tiles WHERE z = ? AND x = ? AND y = ?", (z, x, y))
        row = cursor.fetchone()
        return row[0] if row else None


def save_tile_to_db(z: int, x: int, y: int, data: bytes) -> None:
    """Save a tile to the database."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO tiles (z, x, y, data) VALUES (?, ?, ?, ?)",
            (z, x, y, data),
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


def fetch_tile(z: int, x: int, y: int) -> bytes | None:
    """Fetch a tile from OpenStreetMap."""
    try:
        url = f"https://tile.openstreetmap.org/{z}/{x}/{y}.png"
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


def get_tile(z: int, x: int, y: int) -> bytes | None:
    """Get a tile from the database or fetch it from the server."""
    logging.info("Tile request: z=%d, x=%d, y=%d", z, x, y)

    # Try to get from database first
    tile_data = get_tile_from_db(z, x, y)
    if tile_data:
        return tile_data

    # Try to fetch from server
    try:
        tile_data = fetch_tile(z, x, y)
        if tile_data:
            save_tile_to_db(z, x, y, tile_data)
            return tile_data
    except Exception:
        logging.exception("Error fetching tile %d/%d/%d", z, x, y)

    return None


def start_tile_server() -> None:
    """Start the tile server."""
    init_db()
