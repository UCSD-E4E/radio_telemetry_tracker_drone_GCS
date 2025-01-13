"""Utility functions for RSSI-based distance calculations and related operations."""

import numpy as np


def residuals(x: np.ndarray, data: np.ndarray) -> np.ndarray:
    """Calculate the error for the signal propagation model parameterized by x.

    Args:
    ----
        x (np.ndarray): Vector of singal model parameters: x[0] is the transmit power,
        x[1] is the path loss exponent, x[2] and x[3] are the transmit coordinates in
        meters, and x[4] is the system loss constant.
        data (np.ndarray): Matrix of signal data. This matrix must have shape (m, 3),
        where m is the number of data samples. data[:, 0] is the vector of recieved
        signal power, data[:, 1] is the vector of x-coordinates of the recieved signal
        in meters, and data[:, 2] is the vector of y-coordinates of the recieved signal
        in meters.


    Returns:
    -------
        np.ndarray: A vector of shape (m, ) containing the difference between the
        data and estimated data using the provided signal model parameters.

    """
    p, n, tx, ty, k = x
    r, dx, dy = data[:, 0], data[:, 1], data[:, 2]
    d = np.linalg.norm(np.array([dx - tx, dy - ty]).transpose(), axis=1)
    return p - 10 * n * np.log10(d) + k - r


def mse(r: float, x: np.ndarray, p: float, n: float, t: np.ndarray, k: float) -> float:  # noqa: PLR0913
    """Calculate the mean squared error for the signal propagation model.

    Args:
    ----
        r (float): The recieved signal power.
        x (np.ndarray): A vector of shape (2,) containing the measurement location for
        the recieved signal in meters.
        p (float): The transmit power.
        n (float): The path loss exponent.
        t (np.ndarray): A vector of shape (2,) containing the transmit coordinates in
        meters.
        k (float): The system loss constant.

    Returns:
    -------
        float: The mean squared error of this measurement.

    """
    d = np.linalg.norm(x - t)
    return (r - p + 10 * n * np.log10(d) + k) ** 2


def rssi_to_distance(p_rx: float, p_tx: float, n: float, alt: float = 0) -> float:
    """Convert RSSI to distance, accounting for altitude if provided."""
    dist = 10 ** ((p_tx - p_rx) / (10 * n))
    if alt != 0:
        dist = np.sqrt(dist**2 - alt**2)
    return dist


def p_d(  # noqa: PLR0913
    tx: np.ndarray, dx: np.ndarray, n: float, p_rx: float, p_tx: float, d_std: float,
) -> float:
    """Calculate probability density for distance estimation."""
    modeled_distance = rssi_to_distance(p_rx, p_tx, n)
    adjusted_distance = (np.linalg.norm(dx - tx) - modeled_distance) / d_std
    return np.exp(-(adjusted_distance**2) / 2) / (np.sqrt(2 * np.pi) * d_std)
