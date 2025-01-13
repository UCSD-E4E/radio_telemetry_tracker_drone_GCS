"""Tests for the drone data manager module.

This module contains tests for GPS, ping, and location estimate data management.
"""

import pytest
from pytestqt.qtbot import QtBot

from radio_telemetry_tracker_drone_gcs.data.drone_data_manager import DroneDataManager
from radio_telemetry_tracker_drone_gcs.data.models import GpsData, LocEstData, PingData

# Test constants
TEST_FREQUENCY = 150000  # Hz
TEST_FREQUENCY_2 = 200000  # Hz
EXPECTED_FREQUENCY_COUNT = 2  # Number of test frequencies used in tests


@pytest.fixture
def data_manager() -> DroneDataManager:
    """Fixture providing a DroneDataManager instance for testing."""
    return DroneDataManager()


def test_update_gps(data_manager: DroneDataManager, qtbot: QtBot) -> None:  # noqa: ARG001
    """Test that GPS data is updated and signal is emitted."""
    gps_signal_received = []

    def on_gps(qvar: object) -> None:
        gps_signal_received.append(qvar)

    data_manager.gps_data_updated.connect(on_gps)

    gps = GpsData(lat=32.88, long=-117.24, altitude=5.0, heading=90.0, timestamp=1234567890, packet_id=1)
    data_manager.update_gps(gps)

    assert len(gps_signal_received) == 1  # noqa: S101


def test_add_ping(data_manager: DroneDataManager, qtbot: QtBot) -> None:  # noqa: ARG001
    """Test that a PingData is added and signal is emitted."""
    freq_signal_received = []

    def on_freq(qvar: object) -> None:
        freq_signal_received.append(qvar)

    data_manager.frequency_data_updated.connect(on_freq)

    ping = PingData(
        frequency=TEST_FREQUENCY,
        amplitude=10.0,
        lat=32.88,
        long=-117.24,
        timestamp=1234567891,
        packet_id=2,
    )
    data_manager.add_ping(ping)

    assert len(freq_signal_received) == 1  # noqa: S101


def test_update_loc_est(data_manager: DroneDataManager) -> None:
    """Test updating location estimates."""
    loc_est = LocEstData(frequency=TEST_FREQUENCY, lat=32.5, long=-117.0, timestamp=1234567892, packet_id=3)
    data_manager.update_loc_est(loc_est)


def test_clear_frequency_data(data_manager: DroneDataManager) -> None:
    """Test clearing frequency data for a specific frequency."""
    ping = PingData(frequency=TEST_FREQUENCY, amplitude=10.0, lat=32.88, long=-117.24, timestamp=1, packet_id=1)
    data_manager.add_ping(ping)
    assert data_manager.has_frequency(TEST_FREQUENCY)  # noqa: S101

    data_manager.clear_frequency_data(TEST_FREQUENCY)
    assert not data_manager.has_frequency(TEST_FREQUENCY)  # noqa: S101


def test_clear_all_frequency_data(data_manager: DroneDataManager) -> None:
    """Test clearing all frequency data."""
    ping1 = PingData(frequency=TEST_FREQUENCY, amplitude=10.0, lat=32.88, long=-117.24, timestamp=1, packet_id=1)
    ping2 = PingData(frequency=TEST_FREQUENCY_2, amplitude=8.0, lat=32.70, long=-117.20, timestamp=2, packet_id=2)
    data_manager.add_ping(ping1)
    data_manager.add_ping(ping2)

    assert len(data_manager.get_frequencies()) == EXPECTED_FREQUENCY_COUNT  # noqa: S101

    data_manager.clear_all_frequency_data()
    assert len(data_manager.get_frequencies()) == 0  # noqa: S101
