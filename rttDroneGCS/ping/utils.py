import math
import numpy as np


def residuals(x: np.ndarray, data: np.ndarray) -> np.ndarray:
    P, n, tx, ty, k = x
    R, dx, dy = data[:, 0], data[:, 1], data[:, 2]
    d = np.linalg.norm(np.array([dx - tx, dy - ty]).transpose(), axis=1)
    return P - 10 * n * np.log10(d) + k - R


def mse(r: float, x: np.ndarray, p: float, n: float, t: np.ndarray, k: float) -> float:
    d = np.linalg.norm(x - t)
    return (r - p + 10 * n * np.log10(d) + k) ** 2


def rssi_to_distance(p_rx: float, p_tx: float, n: float, alt: float = 0) -> float:
    dist = 10 ** ((p_tx - p_rx) / (10 * n))
    if alt != 0:
        dist = np.sqrt(dist**2 - alt**2)
    return dist


def p_d(
    tx: np.ndarray, dx: np.ndarray, n: float, p_rx: float, p_tx: float, d_std: float
) -> float:
    modeled_distance = rssi_to_distance(p_rx, p_tx, n)
    adjusted_distance = (np.linalg.norm(dx - tx) - modeled_distance) / d_std
    return math.exp(-(adjusted_distance**2) / 2) / (math.sqrt(2 * math.pi) * d_std)
