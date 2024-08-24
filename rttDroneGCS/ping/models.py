import datetime as dt
from typing import Dict
import numpy as np
import utm
import rttDroneComms.comms


class RTTCone:
    def __init__(
        self,
        lat: float,
        lon: float,
        amplitude: float,
        freq: int,
        alt: float,
        heading: float,
        time: float,
    ):
        self.lat = lat
        self.lon = lon
        self.amplitude = amplitude
        self.heading = heading
        self.freq = freq
        self.alt = alt
        self.time = dt.datetime.fromtimestamp(time)


class RTTPing:
    def __init__(
        self, lat: float, lon: float, power: float, freq: int, alt: float, time: float
    ):
        self.lat = lat
        self.lon = lon
        self.power = power
        self.freq = freq
        self.alt = alt
        self.time = dt.datetime.fromtimestamp(time)

    def to_numpy(self) -> np.ndarray:
        easting, northing, _, _ = utm.from_latlon(self.lat, self.lon)
        return np.array([easting, northing, self.alt, self.power])

    def to_dict(self) -> Dict[str, int]:
        return {
            "lat": int(self.lat * 1e7),
            "lon": int(self.lon * 1e7),
            "amp": int(self.power),
            "txf": self.freq,
            "alt": int(self.alt),
            "time": int(self.time.timestamp() * 1e3),
        }

    def to_packet(self) -> rttDroneComms.comms.rttPingPacket:
        return rttDroneComms.comms.rttPingPacket(
            self.lat, self.lon, self.alt, self.power, self.freq, self.time
        )

    @classmethod
    def from_dict(cls, packet: Dict[str, int]) -> "RTTPing":
        return cls(
            lat=float(packet["lat"]) / 1e7,
            lon=float(packet["lon"]) / 1e7,
            power=float(packet["amp"]),
            freq=int(packet["txf"]),
            alt=float(packet["alt"]),
            time=float(packet["time"]) / 1e3,
        )

    @classmethod
    def from_packet(cls, packet: rttDroneComms.comms.rttPingPacket) -> "RTTPing":
        return cls(
            lat=packet.lat,
            lon=packet.lon,
            power=packet.txp,
            freq=packet.txf,
            alt=packet.alt,
            time=packet.timestamp.timestamp(),
        )
