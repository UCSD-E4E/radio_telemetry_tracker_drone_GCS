"""Data models used by the DroneDataManager.

These are simple Python dataclasses storing relevant info for the drone and pings.
"""

from dataclasses import dataclass


@dataclass
class DroneData:
    """Data container for drone position and status."""
    lat: float
    long: float
    altitude: float
    heading: float
    last_update: int  # ms
    ping_time: int  # ms
    packet_loss: float  # percentage
    connection_quality: str  # 'great', 'good', 'ok', 'bad', 'critical'


@dataclass
class PingData:
    """Signal ping data."""

    frequency: int
    amplitude: float
    lat: float
    long: float
    timestamp: int  # Timestamp in milliseconds


@dataclass
class LocEstData:
    """Location estimation data."""

    frequency: int
    lat: float
    long: float
    timestamp: int  # Timestamp in milliseconds
