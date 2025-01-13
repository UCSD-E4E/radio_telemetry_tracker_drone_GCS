"""Tests for the communication bridge module.

This module contains tests for the communication bridge class, which manages the connection
and communication with the drone.
"""

from unittest.mock import MagicMock, patch

import pytest
from pytestqt.qtbot import QtBot

from radio_telemetry_tracker_drone_gcs.comms.communication_bridge import CommunicationBridge


@pytest.fixture
def communication_bridge() -> CommunicationBridge:
    """Fixture that returns a CommunicationBridge instance."""
    bridge = CommunicationBridge()
    # Add test helper method
    bridge.get_comms_service = lambda: bridge._comms_service  # type: ignore  # noqa: PGH003, SLF001
    bridge.set_comms_service = lambda x: setattr(bridge, "_comms_service", x)  # type: ignore  # noqa: PGH003
    return bridge


def test_initialize_comms_success(qtbot: QtBot, communication_bridge: CommunicationBridge) -> None:  # noqa: ARG001
    """Test a successful initialize_comms call."""
    mock_comms_service = MagicMock()
    with patch(
        "radio_telemetry_tracker_drone_gcs.comms.communication_bridge.DroneCommsService",
        return_value=mock_comms_service,
    ):
        config = {
            "interface_type": "serial",
            "port": "COM4",
            "baudrate": 115200,
            "host": "",
            "tcp_port": 0,
            "ack_timeout": 3,
            "max_retries": 2,
        }

        success = communication_bridge.initialize_comms(config)
        assert success is True  # noqa: S101
        mock_comms_service.start.assert_called_once()
        mock_comms_service.send_sync_request.assert_called_once()

    # We can also advance the QTimer to simulate no response or mock the response.


def test_initialize_comms_failure(communication_bridge: CommunicationBridge) -> None:
    """Test initialize_comms call that fails with an exception."""
    with patch(
        "radio_telemetry_tracker_drone_gcs.comms.communication_bridge.DroneCommsService",
        side_effect=Exception("Test failure"),
    ):
        config = {
            "interface_type": "serial",
            "port": "COM4",
            "baudrate": 115200,
            "host": "",
            "tcp_port": 0,
            "ack_timeout": 3,
            "max_retries": 2,
        }
        success = communication_bridge.initialize_comms(config)
        assert success is False  # noqa: S101


def test_cancel_connection(communication_bridge: CommunicationBridge) -> None:
    """Test cancelling a connection attempt."""
    # Simulate an active comms service
    mock_comms_service = MagicMock()
    communication_bridge.set_comms_service(mock_comms_service)
    communication_bridge.cancel_connection()

    assert communication_bridge.get_comms_service() is None  # noqa: S101
    mock_comms_service.stop.assert_called_once()


def test_disconnect_no_service(communication_bridge: CommunicationBridge, qtbot: QtBot) -> None:  # noqa: ARG001
    """Test disconnect when there's no active comms service."""

    # We can listen for a signal or log message
    def on_success(msg: str) -> None:
        assert "UNDEFINED BEHAVIOR" in msg  # noqa: S101

    communication_bridge.disconnect_success.connect(on_success)
    communication_bridge.disconnect()


def test_send_config_request_success(communication_bridge: CommunicationBridge) -> None:
    """Test sending a config request successfully."""
    mock_comms_service = MagicMock()
    communication_bridge.set_comms_service(mock_comms_service)
    cfg = {
        "gain": 10,
        "sampling_rate": 48000,
        "center_frequency": 1000000,
        "enable_test_data": True,
        "ping_width_ms": 5,
        "ping_min_snr": 20,
        "ping_max_len_mult": 1.5,
        "ping_min_len_mult": 0.5,
        "target_frequencies": [100000, 200000],
    }
    success = communication_bridge.send_config_request(cfg)
    assert success is True  # noqa: S101
    mock_comms_service.send_config_request.assert_called_once()


def test_send_start_request_no_service(communication_bridge: CommunicationBridge) -> None:
    """Test sending a start request when _comms_service is None."""
    communication_bridge.set_comms_service(None)
    # We can connect a slot to start_failure to confirm it emitted
    with patch.object(communication_bridge, "start_failure") as mock_signal:
        communication_bridge.send_start_request()
        mock_signal.emit.assert_called_once()
