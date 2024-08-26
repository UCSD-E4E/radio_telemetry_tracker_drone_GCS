"""Enums for the MAVModel class."""

from enum import Enum, auto


class Events(Enum):
    """Callback Events."""

    Heartbeat = auto()
    Exception = auto()
    GetFreqs = auto()
    GetOptions = auto()
    NoHeartbeat = auto()
    NewPing = auto()
    NewEstimate = auto()
    UpgradeStatus = auto()
    VehicleInfo = auto()
    ConeInfo = auto()


class SDRInitStates(Enum):
    """SDR Initialization States."""

    find_devices = 0
    wait_recycle = 1
    usrp_probe = 2
    rdy = 3
    fail = 4


class ExtsStates(Enum):
    """GPS Initialization States."""

    get_tty = 0
    get_msg = 1
    wait_recycle = 2
    rdy = 3
    fail = 4


class OutputDirStates(Enum):
    """Output Directory Initialization States."""

    get_output_dir = 0
    check_output_dir = 1
    check_space = 2
    wait_recycle = 3
    rdy = 4
    fail = 5


class RTTStates(Enum):
    """System Initialization States."""

    init = 0
    wait_init = 1
    wait_start = 2
    start = 3
    wait_end = 4
    finish = 5
    fail = 6
