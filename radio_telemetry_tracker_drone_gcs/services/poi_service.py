"""poi_service.py: higher-level logic for POIs, calls poi_db for CRUD operations."""

from typing import Any

from radio_telemetry_tracker_drone_gcs.services.poi_db import (
    add_poi_db,
    init_db,
    list_pois_db,
    remove_poi_db,
    rename_poi_db,
)


class PoiService:
    """Manages POI retrieval, creation, removal, rename, etc."""

    def __init__(self) -> None:
        """Initialize the POI service by initializing the database."""
        init_db()

    def get_pois(self) -> list[dict[str, Any]]:
        """Get all POIs from the database."""
        return list_pois_db()

    def add_poi(self, name: str, coords: list[float]) -> None:
        """Add a new POI to the database."""
        add_poi_db(name, coords[0], coords[1])

    def remove_poi(self, name: str) -> None:
        """Remove a POI from the database."""
        remove_poi_db(name)

    def rename_poi(self, old_name: str, new_name: str) -> None:
        """Rename a POI in the database."""
        rename_poi_db(old_name, new_name)
