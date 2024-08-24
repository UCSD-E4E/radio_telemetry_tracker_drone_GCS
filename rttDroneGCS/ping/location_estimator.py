import csv
import datetime as dt
import math
import os
from typing import List, Tuple, Dict, Optional

import numpy as np
from osgeo import gdal, osr
from scipy.optimize import least_squares

from .models import RTTPing
from .utils import rssi_to_distance, p_d
from .io_operations import save_csv, save_tiff

import logging

logger = logging.getLogger(__name__)


class LocationEstimator:
    def __init__(self):
        self.__pings: List[np.ndarray] = []
        self.__params: Optional[np.ndarray] = None
        self.__stale_estimate: bool = True
        self.result: Optional[least_squares] = None
        self.last_l_tx0: float = 0
        self.last_l_tx1: float = 0
        self.index: int = 0

    def add_ping(self, ping: RTTPing):
        self.__pings.append(ping.to_numpy())

    def do_estimate(self) -> Optional[Tuple[np.ndarray, bool]]:
        if len(self.__pings) < 4:
            return None

        pings = np.array(self.__pings)
        x_tx_0, y_tx_0 = np.mean(pings[:, :2], axis=0)
        p_tx_0 = np.max(pings[:, 3])
        n_0 = 2
        self.__params = np.array([x_tx_0, y_tx_0, p_tx_0, n_0])
        res_x = least_squares(
            self.__residuals,
            self.__params,
            bounds=([0, 167000, -np.inf, 2], [833000, 10000000, np.inf, 2.1]),
        )

        if res_x.success:
            self.__params = res_x.x
            self.__stale_estimate = False
        else:
            self.__stale_estimate = True

        self.result = res_x
        return self.__params, self.__stale_estimate

    def d_to_prx(self, ping_vector: np.ndarray, param_vector: np.ndarray) -> float:
        l_rx = ping_vector[:3]
        l_tx = np.array([param_vector[0], param_vector[1], 0])
        p_tx, n = param_vector[2:4]

        d = max(np.linalg.norm(l_rx - l_tx), 0.01)
        return p_tx - 10 * n * np.log10(d)

    def __residuals(self, param_vect: np.ndarray) -> np.ndarray:
        return np.array(
            [ping[3] - self.d_to_prx(ping, param_vect) for ping in self.__pings]
        )

    def do_precision(
        self,
        data_dir: str = "holder",
        freq: int = 17350000,
        zone_num: int = 11,
        zone: str = "S",
    ):
        logger.info(f"{freq / 1e6:.3f} MHz has {len(self.__pings)} pings")

        l_tx, P, n = self.__params[:2], self.__params[2], self.__params[3]
        pings = np.array(self.__pings)

        distances = np.linalg.norm(pings[:, :3] - np.array([*l_tx, 0]), axis=1)
        calculated_distances = rssi_to_distance(pings[:, 3], P, n)

        distance_errors = calculated_distances - distances
        std_distances = np.std(distance_errors)
        p_rx = pings[:, 3]

        size = 25
        heat_map_area = self.__generate_heat_map(
            size, l_tx, pings, n, p_rx, P, std_distances
        )

        save_csv(data_dir, l_tx, size, heat_map_area)
        save_tiff(data_dir, freq, zone_num, zone, l_tx, size, heat_map_area)

    def __generate_heat_map(
        self,
        size: int,
        l_tx: np.ndarray,
        pings: np.ndarray,
        n: float,
        p_rx: np.ndarray,
        p: float,
        std_distances: float,
    ) -> np.ndarray:
        heat_map_area = np.ones((size, size)) / (size * size)

        min_y = l_tx[1] - (size / 2)
        ref_x = l_tx[0] - (size / 2)

        for y in range(size):
            for x in range(size):
                for i in range(len(pings)):
                    heat_map_area[y, x] *= p_d(
                        np.array([x + ref_x, y + min_y, 0]),
                        pings[i, :3],
                        n,
                        p_rx[i],
                        p,
                        std_distances,
                    )

        return heat_map_area / heat_map_area.sum()

    def get_estimate(
        self,
    ) -> Optional[Tuple[np.ndarray, bool, Optional[least_squares]]]:
        if self.__params is None:
            return None
        return self.__params, self.__stale_estimate, self.result

    def get_pings(self) -> List[np.ndarray]:
        return self.__pings

    def get_num_pings(self) -> int:
        return len(self.__pings)

    def set_pings(self, pings: List[np.ndarray]):
        self.__pings = pings
