"""Module for managing data."""

from __future__ import annotations

from typing import TYPE_CHECKING

import utm

from .location_estimator import LocationEstimator

if TYPE_CHECKING:
    import numpy as np
    from scipy.optimize import least_squares

    from .models import RTTPing


class DataManager:
    """Class for managing data."""

    def __init__(self) -> None:
        """Initialize the DataManager."""
        self._estimators: dict[int, LocationEstimator] = {}
        self.zone: int | None = None
        self.let: str | None = None
        self._vehicle_path: list[tuple[float, float, float]] = []

    def add_ping(self, ping: RTTPing) -> tuple[np.ndarray, bool] | None:
        """Add a new ping and update the estimator for the corresponding frequency.

        Args:
        ----
            ping (RTTPing): The ping to add.

        Returns:
        -------
            Optional[Tuple[np.ndarray, bool]]: The estimation result, if available.

        """
        if ping.freq not in self._estimators:
            self._estimators[ping.freq] = LocationEstimator()

        self._estimators[ping.freq].add_ping(ping)

        if self.zone is None:
            self.set_zone(ping.lat, ping.lon)

        return self._estimators[ping.freq].do_estimate()

    def add_vehicle_location(self, coord: tuple[float, float, float]) -> None:
        """Add a new vehicle location to the path.

        Args:
        ----
            coord (Tuple[float, float, float]): The coordinates (lat, lon, alt) of the
            vehicle.

        """
        self._vehicle_path.append(coord)

    def set_zone(self, lat: float, lon: float) -> None:
        """Set the UTM zone based on the given latitude and longitude.

        Args:
        ----
            lat (float): Latitude
            lon (float): Longitude

        """
        _, _, zone, let = utm.from_latlon(lat, lon)
        self.zone = zone
        self.let = let

    def get_estimate(
        self,
        frequency: int,
    ) -> tuple[np.ndarray, bool, least_squares | None] | None:
        """Get the current estimate for a specific frequency.

        Args:
        ----
            frequency (int): The frequency to get the estimate for.

        Returns:
        -------
            Optional[Tuple[np.ndarray, bool, Optional[least_squares]]]: The estimation
            result, if available.

        """
        return self._estimators.get(frequency, LocationEstimator()).get_estimate()

    def get_frequencies(self) -> list[int]:
        """Get a list of all frequencies with estimators.

        Returns
        -------
            List[int]: List of frequencies.

        """
        return list(self._estimators.keys())

    def get_pings(self, frequency: int) -> list[np.ndarray]:
        """Get all pings for a specific frequency.

        Args:
        ----
            frequency (int): The frequency to get pings for.

        Returns:
        -------
            List[np.ndarray]: List of pings for the given frequency.

        """
        return self._estimators.get(frequency, LocationEstimator()).get_pings()

    def get_num_pings(self, frequency: int) -> int:
        """Get the number of pings for a specific frequency.

        Args:
        ----
            frequency (int): The frequency to get the ping count for.

        Returns:
        -------
            int: Number of pings for the given frequency.

        """
        return self._estimators.get(frequency, LocationEstimator()).get_num_pings()

    def get_vehicle_path(self) -> list[tuple[float, float, float]]:
        """Get the vehicle path.

        Returns
        -------
            List[Tuple[float, float, float]]: List of vehicle coordinates.

        """
        return self._vehicle_path

    def get_utm_zone(self) -> tuple[int | None, str | None]:
        """Get the UTM zone information.

        Returns
        -------
            Tuple[Optional[int], Optional[str]]: UTM zone number and letter.

        """
        return self.zone, self.let

    def do_precisions(self, frequency: int) -> None:
        """Perform precision calculations for a specific frequency.

        Args:
        ----
            frequency (int): The frequency to calculate precisions for.

        """
        self._estimators.get(frequency, LocationEstimator()).do_precision()
