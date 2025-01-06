"""Data models for storing drone position, ping data, location estimates, etc."""

from dataclasses import dataclass


@dataclass
class ConnectionMetrics:
    """Represents connection quality metrics based on packet delivery."""
    ping_time: int  # ms
    packet_loss: float  # percentage
    connection_quality: str  # 'great', 'good', 'ok', 'bad', 'critical'
    last_update: int  # ms


@dataclass
class DroneData:
    """Represents current drone state including position."""
    lat: float
    long: float
    altitude: float
    heading: float
    last_update: int  # ms


@dataclass
class PingData:
    """Represents a single ping detection with frequency, amplitude, and location."""
    frequency: int
    amplitude: float
    lat: float
    long: float
    timestamp: int  # ms


@dataclass
class LocEstData:
    """Represents an estimated location for a frequency based on ping detections."""
    frequency: int
    lat: float
    long: float
    timestamp: int  # ms
