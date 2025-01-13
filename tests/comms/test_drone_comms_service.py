"""Tests for the drone communications service module.

This module contains tests for drone communication service initialization, start/stop functionality,
and message handling.
"""

from unittest.mock import MagicMock, patch

import pytest
from radio_telemetry_tracker_drone_comms_package import RadioConfig

from radio_telemetry_tracker_drone_gcs.comms.drone_comms_service import DroneCommsService


@pytest.fixture
def mock_drone_comms() -> MagicMock:
    """Fixture to create a mock DroneComms instance."""
    with patch("radio_telemetry_tracker_drone_gcs.comms.drone_comms_service.DroneComms") as mock_class:
        yield mock_class


@pytest.fixture
def drone_comms_service(mock_drone_comms: MagicMock) -> DroneCommsService:  # noqa: ARG001
    """Return a DroneCommsService with a mocked DroneComms instance."""
    radio_cfg = RadioConfig(
        interface_type="serial",
        port="COM3",
        baudrate=9600,
        host="",
        tcp_port=0,
        server_mode=False,
    )
    service = DroneCommsService(
        radio_config=radio_cfg,
        ack_timeout=2.0,
        max_retries=3,
    )
    # Add test helper method
    service.get_comms = lambda: service._comms  # type: ignore  # noqa: PGH003, SLF001
    return service


def test_start_stop(drone_comms_service: DroneCommsService) -> None:
    """Test starting and stopping the DroneCommsService."""
    assert not drone_comms_service.is_started()  # noqa: S101

    # Start
    drone_comms_service.start()
    assert drone_comms_service.is_started()  # noqa: S101
    drone_comms_service.get_comms().start.assert_called_once()

    # Stop
    drone_comms_service.stop()
    assert not drone_comms_service.is_started()  # noqa: S101
    drone_comms_service.get_comms().stop.assert_called_once()


def test_register_handlers(drone_comms_service: DroneCommsService) -> None:
    """Test registering sync response handler."""
    mock_callback = MagicMock()
    drone_comms_service.register_sync_response_handler(mock_callback, once=True)
    drone_comms_service.get_comms().register_sync_response_handler.assert_called_once_with(mock_callback, once=True)


def test_send_sync_request(drone_comms_service: DroneCommsService) -> None:
    """Test that send_sync_request calls DroneComms.send_sync_request correctly."""
    packet_id = 123
    drone_comms_service.get_comms().send_sync_request.return_value = (packet_id, True, 1.0)

    result = drone_comms_service.send_sync_request()
    drone_comms_service.get_comms().send_sync_request.assert_called_once()
    assert result == packet_id  # noqa: S101
