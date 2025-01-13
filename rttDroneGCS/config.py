from __future__ import annotations

import os
import sys
from configparser import ConfigParser
from pathlib import Path
from typing import Any, Dict, Tuple


class Configuration:
    """Configuration file interface object"""

    def __init__(self, config_path: Path) -> None:
        self.__config_path = config_path

        self.__map_extent_nw: Tuple[float, float] = (90.0, -180.0)
        self.__map_extent_se: Tuple[float, float] = (-90.0, 180.0)

        self.__lora_port: str = self.__get_default_port()
        self.__lora_baud: int = 115200
        self.__lora_frequency: int = 915000000  # Default to 915 MHz

    @staticmethod
    def __get_default_port() -> str:
        if sys.platform.startswith("win"):
            return "COM1"
        elif sys.platform.startswith("linux"):
            return "/dev/ttyUSB0"
        elif sys.platform.startswith("darwin"):
            return "/dev/tty.usbserial-0001"
        else:
            return ""

    def __create_dict(self):
        return {
            "LastCoords": {
                "lat1": self.__map_extent_nw[0],
                "lat2": self.__map_extent_se[0],
                "lon1": self.__map_extent_nw[1],
                "lon2": self.__map_extent_se[1],
            },
            "LoRa": {
                "port": self.__lora_port,
                "baud": self.__lora_baud,
                "frequency": self.__lora_frequency,
            },
        }

    def load(self) -> None:
        """Loads the configuration from the specified file"""
        parser = ConfigParser()
        parser.read_dict(self.__create_dict())
        parser.read(self.__config_path)

        self.__map_extent_nw = (
            parser["LastCoords"].getfloat("lat1"),
            parser["LastCoords"].getfloat("lon1"),
        )
        self.__map_extent_se = (
            parser["LastCoords"].getfloat("lat2"),
            parser["LastCoords"].getfloat("lon2"),
        )

        self.__lora_port = parser["LoRa"].get("port")
        self.__lora_baud = parser["LoRa"].getint("baud")
        self.__lora_frequency = parser["LoRa"].getint("frequency")

    def write(self) -> None:
        """Writes the configuration to the file"""
        parser = ConfigParser()
        parser.read_dict(self.__create_dict())
        with open(self.__config_path, "w", encoding="ascii") as handle:
            parser.write(handle)

    @property
    def lora_port(self) -> str:
        """LoRa port

        Returns:
            str: LoRa port
        """
        return self.__lora_port

    @lora_port.setter
    def lora_port(self, value: Any) -> None:
        if not isinstance(value, str):
            raise TypeError
        self.__lora_port = value

    @property
    def lora_baud(self) -> int:
        """LoRa baud rate

        Returns:
            int: LoRa baud rate
        """
        return self.__lora_baud

    @lora_baud.setter
    def lora_baud(self, value: Any) -> None:
        if not isinstance(value, int):
            raise TypeError
        if value <= 0:
            raise ValueError
        self.__lora_baud = value

    @property
    def lora_frequency(self) -> int:
        """LoRa frequency in Hz

        Returns:
            int: LoRa frequency
        """
        return self.__lora_frequency

    @lora_frequency.setter
    def lora_frequency(self, value: Any) -> None:
        if not isinstance(value, int):
            raise TypeError
        if value <= 0:
            raise ValueError
        self.__lora_frequency = value

    @property
    def map_extent(self) -> Tuple[Tuple[float, float], Tuple[float, float]]:
        """Map previous extent

        Returns:
            Tuple[Tuple[float, float], Tuple[float, float]]: NW and SE map extents in dd.dddddd
        """
        return (self.__map_extent_nw, self.__map_extent_se)

    @map_extent.setter
    def map_extent(self, value: Any) -> None:
        if not isinstance(value, tuple):
            raise TypeError
        if len(value) != 2:
            raise TypeError
        for coordinate in value:
            if not isinstance(coordinate, tuple):
                raise TypeError
            if len(value) != 2:
                raise TypeError

            if not isinstance(coordinate[0], float):
                raise TypeError
            if not -90 <= coordinate[0] <= 90:
                raise ValueError

            if not isinstance(coordinate[1], float):
                raise TypeError
            if not -180 <= coordinate[1] <= 180:
                raise ValueError
        self.__map_extent_nw = value[0]
        self.__map_extent_se = value[1]

    def __enter__(self) -> Configuration:
        self.load()
        return self

    def __exit__(self, exc, exp, exv) -> None:
        self.write()


__config_instance: Dict[Path, Configuration] = {}


def get_instance(path: Path) -> Configuration:
    """Retrieves the corresponding configuration instance singleton

    Args:
        path (Path): Path to config path

    Returns:
        Configuration: Configuration singleton
    """
    if path not in __config_instance:
        __config_instance[path] = Configuration(path)
    return __config_instance[path]


def get_config_path() -> Path:
    """Retrieves the application configuration path

    Returns:
        Path: Path to configuration file
    """
    return Path("gcsConfig.ini")
