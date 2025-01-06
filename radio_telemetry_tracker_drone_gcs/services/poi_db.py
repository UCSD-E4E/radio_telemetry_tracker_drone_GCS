"""poi_db.py: direct POI DB logic (create, read, update, delete)."""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "tiles.db"


def init_db() -> None:
    """Ensure POI table exists. Shared DB with tiles."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS pois (
                name TEXT PRIMARY KEY,
                latitude REAL,
                longitude REAL
            )
        """)
        conn.commit()


def list_pois_db() -> list[dict]:
    """Get list of all POIs from database, formatted as {name, coords} dicts."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("SELECT name, latitude, longitude FROM pois")
        rows = cursor.fetchall()
        return [
            {
                "name": r[0],
                "coords": [r[1], r[2]],
            }
            for r in rows
        ]


def add_poi_db(name: str, lat: float, lng: float) -> None:
    """Add a new POI to the database."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO pois (name, latitude, longitude) VALUES (?, ?, ?)",
            (name, lat, lng),
        )
        conn.commit()


def remove_poi_db(name: str) -> None:
    """Remove a POI from the database."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM pois WHERE name = ?", (name,))
        conn.commit()


def rename_poi_db(old_name: str, new_name: str) -> None:
    """Rename a POI in the database."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("UPDATE pois SET name=? WHERE name=?", (new_name, old_name))
        conn.commit()
