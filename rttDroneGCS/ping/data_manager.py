from typing import List, Tuple, Dict, Optional

from .models import RTTPing
from .location_estimator import LocationEstimator

import numpy as np
import utm
from scipy.optimize import least_squares
import rttDroneComms.comms


class DataManager:
    def __init__(self):
        self.__estimators: Dict[int, LocationEstimator] = {}
        self.zone: Optional[int] = None
        self.let: Optional[str] = None
        self.__vehicle_path: List[Tuple[float, float, float]] = []

    def add_ping(self, ping: RTTPing) -> Optional[Tuple[np.ndarray, bool]]:
        if ping.freq not in self.__estimators:
            self.__estimators[ping.freq] = LocationEstimator()
        self.__estimators[ping.freq].add_ping(ping)

        if self.zone is None:
            self.set_zone(ping.lat, ping.lon)

        return self.__estimators[ping.freq].do_estimate()

    def add_vehicle_location(self, coord: Tuple[float, float, float]):
        self.__vehicle_path.append(coord)

    def set_zone(self, lat: float, lon: float):
        _, _, zone, let = utm.from_latlon(lat, lon)
        self.zone = zone
        self.let = let

    def get_estimate(
        self, frequency: int
    ) -> Optional[Tuple[np.ndarray, bool, Optional[least_squares]]]:
        return self.__estimators[frequency].get_estimate()

    def get_frequencies(self) -> List[int]:
        return list(self.__estimators.keys())

    def get_pings(self, frequency: int) -> List[np.ndarray]:
        return self.__estimators[frequency].get_pings()

    def get_num_pings(self, frequency: int) -> int:
        return self.__estimators[frequency].get_num_pings()

    def get_vehicle_path(self) -> List[Tuple[float, float, float]]:
        return self.__vehicle_path

    def get_utm_zone(self) -> Tuple[Optional[int], Optional[str]]:
        return self.zone, self.let

    def do_precisions(self, frequency: int):
        self.__estimators[frequency].do_precision()
