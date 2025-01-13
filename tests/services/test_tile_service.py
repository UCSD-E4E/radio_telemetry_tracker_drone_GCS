"""Tests for the tile service module.

This module contains tests for tile fetching, caching, and management functionality.
"""

from unittest.mock import MagicMock, patch

import pytest

from radio_telemetry_tracker_drone_gcs.services.tile_service import TileService


@pytest.fixture
def tile_service() -> TileService:
    """Fixture providing a TileService instance for testing."""
    return TileService()


def test_get_tile_info(tile_service: TileService) -> None:
    """Test retrieving tile cache information."""
    with patch(
        "radio_telemetry_tracker_drone_gcs.services.tile_service.get_tile_info_db",
        return_value={"total_tiles": 0, "total_size_mb": 0},
    ) as mock_info:
        info = tile_service.get_tile_info()
        assert "total_tiles" in info  # noqa: S101
        assert "total_size_mb" in info  # noqa: S101
        mock_info.assert_called_once()


def test_clear_tile_cache(tile_service: TileService) -> None:
    """Test clearing the tile cache."""
    with patch(
        "radio_telemetry_tracker_drone_gcs.services.tile_service.clear_tile_cache_db",
        return_value=10,
    ) as mock_clear:
        success = tile_service.clear_tile_cache()
        assert success is True  # noqa: S101
        mock_clear.assert_called_once()


def test_get_tile_offline(tile_service: TileService) -> None:
    """Test requesting a tile in offline mode that does not exist in DB => returns None."""
    with patch(
        "radio_telemetry_tracker_drone_gcs.services.tile_service.get_tile_db",
        return_value=None,
    ) as mock_get:
        data = tile_service.get_tile(1, 2, 3, "osm", offline=True)
        assert data is None  # noqa: S101
        mock_get.assert_called_once_with(1, 2, 3, "osm")


def test_get_tile_db_cached(tile_service: TileService) -> None:
    """Test requesting a tile that is cached in the DB."""
    fake_tile_data = b"FAKE_TILE"
    with patch(
        "radio_telemetry_tracker_drone_gcs.services.tile_service.get_tile_db",
        return_value=fake_tile_data,
    ) as mock_get:
        data = tile_service.get_tile(1, 2, 3, "osm", offline=False)
        assert data == fake_tile_data  # noqa: S101
        mock_get.assert_called_once_with(1, 2, 3, "osm")


def test_fetch_tile_http_success(tile_service: TileService) -> None:
    """Test fetching a tile from the internet when not in DB."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.content = b"MOCK_TILE_DATA"

    with (
        patch(
            "radio_telemetry_tracker_drone_gcs.services.tile_service.get_tile_db",
            return_value=None,
        ) as mock_get,
        patch(
            "radio_telemetry_tracker_drone_gcs.services.tile_service.requests.get",
            return_value=mock_response,
        ) as mock_http,
        patch(
            "radio_telemetry_tracker_drone_gcs.services.tile_service.store_tile_db",
            return_value=True,
        ) as mock_store,
    ):
        data = tile_service.get_tile(1, 2, 3, "osm", offline=False)
        assert data == b"MOCK_TILE_DATA"  # noqa: S101
        mock_get.assert_called_once_with(1, 2, 3, "osm")
        mock_store.assert_called_once_with(1, 2, 3, "osm", b"MOCK_TILE_DATA")
        mock_http.assert_called_once()
