"""Module for estimating location based on RTT pings."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import numpy as np
from scipy.optimize import least_squares

from .io_operations import save_csv, save_tiff
from .utils import p_d, rssi_to_distance

if TYPE_CHECKING:
    from .models import RTTPing

logger = logging.getLogger(__name__)


class LocationEstimator:
    """Estimates location based on RTT pings."""

    def __init__(self) -> None:
        """Initialize the LocationEstimator with empty pings and parameters."""
        self._pings: list[np.ndarray] = []
        self._params: np.ndarray | None = None
        self._stale_estimate: bool = True
        self.result: least_squares | None = None
        self.last_l_tx0: float = 0
        self.last_l_tx1: float = 0
        self.index: int = 0

    def add_ping(self, ping: RTTPing) -> None:
        """Add a new RTT ping to the estimator."""
        self._pings.append(ping.to_numpy())

    def do_estimate(self) -> tuple[np.ndarray, bool] | None:
        """Perform location estimation based on collected pings."""
        if len(self._pings) < 4:  # noqa: PLR2004
            return None

        pings = np.array(self._pings)
        x_tx_0, y_tx_0 = np.mean(pings[:, :2], axis=0)
        p_tx_0 = np.max(pings[:, 3])
        n_0 = 2
        self._params = np.array([x_tx_0, y_tx_0, p_tx_0, n_0])
        res_x = least_squares(
            self._residuals,
            self._params,
            bounds=([0, 167000, -np.inf, 2], [833000, 10000000, np.inf, 2.1]),
        )

        if res_x.success:
            self._params = res_x.x
            self._stale_estimate = False
        else:
            self._stale_estimate = True

        self.result = res_x
        return self._params, self._stale_estimate

    def d_to_prx(
        self,
        ping_vector: np.ndarray,
        param_vector: np.ndarray,
    ) -> float:
        """Calculate the received power from a ping."""
        l_rx = ping_vector[:3]
        l_tx = np.array([param_vector[0], param_vector[1], 0])
        p_tx, n = param_vector[2:4]

        d = max(np.linalg.norm(l_rx - l_tx), 0.01)
        return p_tx - 10 * n * np.log10(d)

    def _residuals(self, param_vect: np.ndarray) -> np.ndarray:
        return np.array(
            [ping[3] - self.d_to_prx(ping, param_vect) for ping in self._pings],
        )

    def do_precision(
        self,
        data_dir: str = "holder",
        freq: int = 17350000,
        zone_num: int = 11,
        zone: str = "S",
    ) -> None:
        """Perform precision estimation based on collected pings."""
        logger.info("%.3f MHz has %d pings", freq / 1e6, len(self._pings))

        l_tx, p, n = self._params[:2], self._params[2], self._params[3]
        pings = np.array(self._pings)

        distances = np.linalg.norm(pings[:, :3] - np.array([*l_tx, 0]), axis=1)
        calculated_distances = rssi_to_distance(pings[:, 3], p, n)

        distance_errors = calculated_distances - distances
        std_distances = np.std(distance_errors)
        p_rx = pings[:, 3]

        size = 25
        heat_map_area = self._generate_heat_map(
            size,
            l_tx,
            pings,
            n,
            p_rx,
            p,
            std_distances,
        )

        save_csv(data_dir, l_tx, size, heat_map_area)
        save_tiff(data_dir, freq, zone_num, zone, l_tx, size, heat_map_area)

    def _generate_heat_map(  # noqa: PLR0913
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
    ) -> tuple[np.ndarray, bool, least_squares | None] | None:
        """Get the current estimate."""
        if self._params is None:
            return None
        return self._params, self._stale_estimate, self.result

    def get_pings(self) -> list[np.ndarray]:
        """Get the current pings."""
        return self._pings

    def get_num_pings(self) -> int:
        """Get the number of pings."""
        return len(self._pings)

    def set_pings(self, pings: list[np.ndarray]) -> None:
        """Set the pings."""
        self._pings = pings
