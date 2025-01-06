"""tile_db.py: direct SQLite code for tile caching (read/write)."""
from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "tiles.db"


def init_db() -> None:
    """Initialize the tile DB (and POI table) if not exists."""
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


def get_tile_db(z: int, x: int, y: int, source: str) -> bytes | None:
    """Retrieve a tile from DB if cached."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("SELECT data FROM tiles WHERE z=? AND x=? AND y=? AND source=?", (z, x, y, source))
        row = cursor.fetchone()
        return row[0] if row else None


def store_tile_db(z: int, x: int, y: int, source: str, data: bytes) -> None:
    """Store or update tile in DB."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO tiles (z, x, y, source, data) VALUES (?, ?, ?, ?, ?)", (z, x, y, source, data),
        )
        conn.commit()


def clear_tile_cache_db() -> int:
    """Delete all cached tiles. Return number of rows removed."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("DELETE FROM tiles")
        conn.commit()
        return cursor.rowcount


def get_tile_info_db() -> dict:
    """Return tile count and size in MB."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("SELECT COUNT(*), SUM(LENGTH(data)) FROM tiles")
        row = cursor.fetchone() or (0, 0)
        return {
            "total_tiles": row[0] or 0,
            "total_size_mb": round((row[1] or 0) / (1024 * 1024), 2),
        }
