"""Tests for the POI service module.

This module contains tests for POI (Points of Interest) creation, retrieval, and management.
"""

from unittest.mock import patch

import pytest

from radio_telemetry_tracker_drone_gcs.services.poi_service import PoiService


@pytest.fixture
def poi_service() -> PoiService:
    """Fixture providing a PoiService instance for testing."""
    return PoiService()


def test_get_pois(poi_service: PoiService) -> None:
    """Verify that get_pois does not error out and returns a list."""
    with patch(
        "radio_telemetry_tracker_drone_gcs.services.poi_service.list_pois_db",
        return_value=[],
    ) as mock_list:
        pois = poi_service.get_pois()
        assert isinstance(pois, list)  # noqa: S101
        mock_list.assert_called_once()


def test_add_poi(poi_service: PoiService) -> None:
    """Test adding a POI (happy path)."""
    with patch(
        "radio_telemetry_tracker_drone_gcs.services.poi_service.add_poi_db",
        return_value=True,
    ) as mock_add:
        result = poi_service.add_poi("TestPOI", [32.88, -117.24])
        assert result is True  # noqa: S101
        mock_add.assert_called_once_with("TestPOI", 32.88, -117.24)


def test_remove_poi(poi_service: PoiService) -> None:
    """Test removing a POI."""
    with patch(
        "radio_telemetry_tracker_drone_gcs.services.poi_service.remove_poi_db",
        return_value=True,
    ) as mock_remove:
        result = poi_service.remove_poi("TestPOI")
        assert result is True  # noqa: S101
        mock_remove.assert_called_once_with("TestPOI")


def test_rename_poi(poi_service: PoiService) -> None:
    """Test renaming a POI."""
    with patch(
        "radio_telemetry_tracker_drone_gcs.services.poi_service.rename_poi_db",
        return_value=True,
    ) as mock_rename:
        result = poi_service.rename_poi("OldPOI", "NewPOI")
        assert result is True  # noqa: S101
        mock_rename.assert_called_once_with("OldPOI", "NewPOI")
