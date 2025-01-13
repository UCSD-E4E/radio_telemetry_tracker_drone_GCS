"""Tests for the drone state machine module.

This module contains tests for state transitions and timeout handling in the drone state machine.
"""

import pytest

from radio_telemetry_tracker_drone_gcs.comms.state_machine import (
    DroneState,
    DroneStateMachine,
    StateTransition,
)


@pytest.fixture
def state_machine() -> DroneStateMachine:
    """Fixture providing a DroneStateMachine instance for testing."""
    return DroneStateMachine()


def test_initial_state(state_machine: DroneStateMachine) -> None:
    """Test that the initial state of the state machine is RADIO_CONFIG_INPUT."""
    assert state_machine.current_state == DroneState.RADIO_CONFIG_INPUT  # noqa: S101


def test_valid_transition(state_machine: DroneStateMachine) -> None:
    """Test a valid transition from RADIO_CONFIG_INPUT -> RADIO_CONFIG_WAITING."""
    transition = StateTransition(
        from_state=DroneState.RADIO_CONFIG_INPUT,
        to_state=DroneState.RADIO_CONFIG_WAITING,
        success_message="Connected",
        failure_message="Connection failed",
    )

    state_machine.transition_to(DroneState.RADIO_CONFIG_WAITING, transition)
    assert state_machine.current_state == DroneState.RADIO_CONFIG_WAITING  # noqa: S101


def test_invalid_transition(state_machine: DroneStateMachine) -> None:
    """Test an invalid transition fails and triggers state_error signal."""
    # Attempt a transition that doesn't match the from_state
    transition = StateTransition(
        from_state=DroneState.START_WAITING,
        to_state=DroneState.STOP_WAITING,
        success_message="Should not happen",
        failure_message="Wrong from_state",
    )

    state_machine.transition_to(DroneState.STOP_WAITING, transition)
    assert state_machine.current_state != DroneState.STOP_WAITING  # noqa: S101
    assert state_machine.current_state == DroneState.RADIO_CONFIG_INPUT  # noqa: S101


def test_timeout_handling(state_machine: DroneStateMachine) -> None:
    """Test handle_timeout transitions WAITING states to TIMEOUT states."""
    # Move from RADIO_CONFIG_INPUT -> RADIO_CONFIG_WAITING first
    transition = StateTransition(
        from_state=DroneState.RADIO_CONFIG_INPUT,
        to_state=DroneState.RADIO_CONFIG_WAITING,
        success_message="Connected",
        failure_message="Connection failed",
    )
    state_machine.transition_to(DroneState.RADIO_CONFIG_WAITING, transition)
    assert state_machine.current_state == DroneState.RADIO_CONFIG_WAITING  # noqa: S101

    # Now handle_timeout
    state_machine.handle_timeout()
    # Should transition from RADIO_CONFIG_WAITING -> RADIO_CONFIG_TIMEOUT
    assert state_machine.current_state == DroneState.RADIO_CONFIG_TIMEOUT  # noqa: S101
