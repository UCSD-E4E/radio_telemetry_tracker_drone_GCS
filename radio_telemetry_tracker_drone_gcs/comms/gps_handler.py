"""GPS handler: converts UTM to lat/long, updates DroneData."""

import logging
from typing import Callable

import pyproj
from radio_telemetry_tracker_drone_comms_package import GPSData as DroneGPSData

from radio_telemetry_tracker_drone_gcs.data.models import DroneData


class GPSHandler:
    """Handles incoming GPSData from DroneComms, converts UTM to lat/long."""

    def __init__(self, on_drone_data: Callable[[DroneData], None]) -> None:
        """Initialize GPS handler.

        Args:
            on_drone_data: Callback for new drone position data
        """
        self._on_drone_data = on_drone_data

    def handle_gps_data(self, data: DroneGPSData) -> None:
        """Convert from UTM to lat/long, update DroneData."""
        try:
            # E.g. EPSG code 32610 => zone=10, hemisphere=north
            epsg_str = str(data.epsg_code)
            zone = epsg_str[-2:]  # last two digits
            # If the third-last digit is '6' => northern hemisphere (EPSG:326xx), else southern
            hemisphere = "north" if epsg_str[-3] == "6" else "south"

            utm_proj = pyproj.Proj(proj="utm", zone=zone, ellps="WGS84", hemisphere=hemisphere)
            wgs84_proj = pyproj.Proj("epsg:4326")
            transformer = pyproj.Transformer.from_proj(utm_proj, wgs84_proj, always_xy=True)

            longitude, latitude = transformer.transform(data.easting, data.northing)

            new_data = DroneData(
                lat=latitude,
                long=longitude,
                altitude=data.altitude,
                heading=data.heading,
                last_update=data.timestamp_us // 1000,  # Convert to ms
            )
            self._on_drone_data(new_data)

        except Exception:
            logging.exception("Error handling GPS data in GPSHandler")
