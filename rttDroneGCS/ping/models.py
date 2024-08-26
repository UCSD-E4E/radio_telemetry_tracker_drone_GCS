"""Models for RTT ping and cone data structures."""

from __future__ import annotations

import datetime as dt
from datetime import timezone

import numpy as np
import rttDroneComms.comms
import utm


class RTTCone:
    """Represents an RTT cone with location, amplitude, frequency, and time data."""

    def __init__(  # noqa: PLR0913
        self,
        lat: float,
        lon: float,
        amplitude: float,
        freq: int,
        alt: float,
        heading: float,
        time: float,
    ) -> None:
        """Initialize an RTTCone instance."""
        self.lat = lat
        self.lon = lon
        self.amplitude = amplitude
        self.heading = heading
        self.freq = freq
        self.alt = alt
        self.time = dt.datetime.fromtimestamp(time, tz=timezone.utc)


class RTTPing:
    """Represents an RTT ping with location, power, frequency, and time data."""

    def __init__(  # noqa: PLR0913
        self,
        lat: float,
        lon: float,
        power: float,
        freq: int,
        alt: float,
        time: float,
    ) -> None:
        """Initialize an RTTPing instance."""
        self.lat = lat
        self.lon = lon
        self.power = power
        self.freq = freq
        self.alt = alt
        self.time = dt.datetime.fromtimestamp(time, tz=timezone.utc)

    def to_numpy(self) -> np.ndarray:
        """Convert ping data to a numpy array."""
        easting, northing, _, _ = utm.from_latlon(self.lat, self.lon)
        return np.array([easting, northing, self.alt, self.power])

    def to_dict(self) -> dict[str, int]:
        """Convert ping data to a dictionary."""
        return {
            "lat": int(self.lat * 1e7),
            "lon": int(self.lon * 1e7),
            "amp": int(self.power),
            "txf": self.freq,
            "alt": int(self.alt),
            "time": int(self.time.timestamp() * 1e3),
        }

    def to_packet(self) -> rttDroneComms.comms.rttPingPacket:
        """Convert ping data to an rttPingPacket."""
        return rttDroneComms.comms.rttPingPacket(
            self.lat,
            self.lon,
            self.alt,
            self.power,
            self.freq,
            self.time,
        )

    @classmethod
    def from_dict(cls, packet: dict[str, int]) -> RTTPing:
        """Create an RTTPing instance from a dictionary."""
        return cls(
            lat=float(packet["lat"]) / 1e7,
            lon=float(packet["lon"]) / 1e7,
            power=float(packet["amp"]),
            freq=int(packet["txf"]),
            alt=float(packet["alt"]),
            time=float(packet["time"]) / 1e3,
        )

    @classmethod
    def from_packet(cls, packet: rttDroneComms.comms.rttPingPacket) -> RTTPing:
        """Create an RTTPing instance from an rttPingPacket."""
        return cls(
            lat=packet.lat,
            lon=packet.lon,
            power=packet.txp,
            freq=packet.txf,
            alt=packet.alt,
            time=packet.timestamp.timestamp(),
        )
