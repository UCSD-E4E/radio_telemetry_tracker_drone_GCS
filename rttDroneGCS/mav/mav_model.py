import logging
import threading
import copy
from .enums import Events, SDRInitStates, ExtsStates, OutputDirStates, RTTStates
import rttDroneComms.comms
from rttDroneGCS.ping import RTTPing, DataManager


class MAVModel:
    """
    RTT Drone Payload Model - This class provides an object-oriented view of the vehicle state
    """

    BASE_OPTIONS = 0x00
    EXP_OPTIONS = 0x01
    ENG_OPTIONS = 0xFF
    TGT_PARAMS = 0x100

    CACHE_GOOD = 0
    CACHE_INVALID = 1
    CACHE_DIRTY = 2

    __base_option_keywords = ["SDR_center_freq", "SDR_sampling_freq", "SDR_gain"]
    __exp_option_keywords = [
        "DSP_ping_width",
        "DSP_ping_snr",
        "DSP_ping_max",
        "DSP_ping_min",
        "SYS_output_dir",
    ]
    __eng_option_keywords = ["GPS_mode", "GPS_baud", "GPS_device", "SYS_autostart"]

    def __init__(self, receiver: rttDroneComms.comms.gcsComms):
        """
        Creates a new MAVModel
        Args:
            receiver: gcsComms Object
        """
        self.__log = logging.getLogger("rttDroneGCS:MavModel")
        self.__rx = receiver

        self._option_cache_dirty = {
            self.BASE_OPTIONS: self.CACHE_INVALID,
            self.EXP_OPTIONS: self.CACHE_INVALID,
            self.ENG_OPTIONS: self.CACHE_INVALID,
            self.TGT_PARAMS: self.CACHE_INVALID,
        }

        self.state = {
            "STS_sdr_status": 0,
            "STS_dir_status": 0,
            "STS_gps_status": 0,
            "STS_sys_status": 0,
            "STS_sw_status": 0,
            "UPG_state": -1,
            "UPG_msg": "",
            "VCL_track": {},
            "CONE_track": {},
        }

        self.pp_options = {
            "TGT_frequencies": [],
            "SDR_center_freq": 0,
            "SDR_sampling_freq": 0,
            "SDR_gain": 0,
            "DSP_ping_width": 0,
            "DSP_ping_snr": 0,
            "DSP_ping_max": 0,
            "DSP_ping_min": 0,
            "SYS_output_dir": "",
            "GPS_mode": 0,
            "GPS_baud": 0,
            "GPS_device": "",
            "SYS_autostart": False,
        }

        self.est_mgr = DataManager()

        self.__callbacks = {event: [] for event in Events}
        self.__log.info("MAVModel Created")

        self.__ack_vectors = {}

        self.__register_rx_callbacks()

    def __register_rx_callbacks(self):
        self.__rx.registerCallback(
            rttDroneComms.comms.EVENTS.STATUS_HEARTBEAT, self.__process_heartbeat
        )
        self.__rx.registerCallback(
            rttDroneComms.comms.EVENTS.GENERAL_NO_HEARTBEAT, self.__process_no_heartbeat
        )
        self.__rx.registerCallback(
            rttDroneComms.comms.EVENTS.STATUS_EXCEPTION, self.__handle_remote_exception
        )
        self.__rx.registerCallback(
            rttDroneComms.comms.EVENTS.COMMAND_ACK, self.__process_ack
        )
        self.__rx.registerCallback(
            rttDroneComms.comms.EVENTS.CONFIG_FREQUENCIES, self.__process_frequencies
        )
        self.__rx.registerCallback(
            rttDroneComms.comms.EVENTS.CONFIG_OPTIONS, self.__process_options
        )
        self.__rx.registerCallback(
            rttDroneComms.comms.EVENTS.DATA_PING, self.__process_ping
        )
        self.__rx.registerCallback(
            rttDroneComms.comms.EVENTS.DATA_VEHICLE, self.__process_vehicle
        )
        self.__rx.registerCallback(
            rttDroneComms.comms.EVENTS.DATA_CONE, self.__process_cone
        )

    def start(self):
        """
        Initializes the MAVModel object
        """
        self.__rx.start()
        self.__log.info("MAVModel Started")

    def stop(self):
        """
        Stop the MAVModel and underlying resources
        """
        self.__rx.stop()
        self.__log.info("MAVModel Stopped")

    def register_callback(self, event: Events, callback):
        """
        Registers a callback for the specific event
        Args:
            event: Event to trigger on
            callback: Callback to call
        """
        assert isinstance(event, Events)
        self.__callbacks[event].append(callback)

    def start_mission(self, timeout: int):
        """
        Sends the start mission command
        Args:
            timeout: Timeout in seconds
        """
        self.__send_command_and_wait(
            0x07, rttDroneComms.comms.rttSTARTCommand(), timeout, "START"
        )

    def stop_mission(self, timeout: int):
        """
        Sends the stop mission command
        Args:
            timeout: Timeout in seconds
        """
        self.__send_command_and_wait(
            0x09, rttDroneComms.comms.rttSTOPCommand(), timeout, "STOP"
        )

    def __send_command_and_wait(
        self, command_id: int, command, timeout: int, command_name: str
    ):
        event = threading.Event()
        self.__ack_vectors[command_id] = [event, 0]
        self.__rx.sendPacket(command)
        self.__log.info(f"Sent {command_name} command")
        event.wait(timeout=timeout)
        if not self.__ack_vectors.pop(command_id)[1]:
            raise RuntimeError(f"{command_name} NACKED")

    def get_frequencies(self, timeout: int):
        """
        Retrieves the PRX_frequencies from the payload
        Args:
            timeout: Seconds to wait before timing out
        """
        if self._option_cache_dirty[self.TGT_PARAMS] == self.CACHE_INVALID:
            frequency_pack_event = threading.Event()
            self.register_callback(Events.GetFreqs, frequency_pack_event.set)

            self.__rx.sendPacket(rttDroneComms.comms.rttGETFCommand())
            self.__log.info("Sent getF command")

            frequency_pack_event.wait(timeout=timeout)
        return self.pp_options["TGT_frequencies"]

    def set_frequencies(self, freqs: list, timeout: int):
        """
        Sends the command to set the specific PRX_frequencies
        Args:
            freqs: Frequencies to set as a list
            timeout: Timeout in seconds
        """
        assert isinstance(freqs, list)
        assert all(isinstance(freq, int) for freq in freqs)

        self._option_cache_dirty[self.TGT_PARAMS] = self.CACHE_DIRTY
        self.__send_command_and_wait(
            0x03, rttDroneComms.comms.rttSETFCommand(freqs), timeout, "SETF"
        )

    def add_frequency(self, frequency: int, timeout: int):
        """
        Adds the specified frequency to the target frequencies.
        If the specified frequency is already in TGT_frequencies, this function does nothing.
        Otherwise, this function will update the TGT_frequencies on the payload.
        Args:
            frequency: Frequency to add
            timeout: Timeout in seconds
        """
        if frequency not in self.pp_options["TGT_frequencies"]:
            self.set_frequencies(
                self.pp_options["TGT_frequencies"] + [frequency], timeout
            )

    def remove_frequency(self, frequency: int, timeout: int):
        """
        Removes the specified frequency from the target frequencies.
        If the specified frequency is not in TGT_frequencies, this function raises a RuntimeError.
        Otherwise, this function will update the TGT_frequencies on the payload.
        Args:
            frequency: Frequency to remove
            timeout: Timeout in seconds
        """
        if frequency not in self.pp_options["TGT_frequencies"]:
            raise RuntimeError("Invalid frequency")
        new_freqs = [f for f in self.pp_options["TGT_frequencies"] if f != frequency]
        self.set_frequencies(new_freqs, timeout)

    def get_options(self, scope: int, timeout: int):
        """
        Retrieves and returns the options as a dictionary from the remote.
        Scope should be set to one of MAVModel.BASE_OPTIONS, MAVModel.EXP_OPTIONS, or MAVModel.ENG_OPTIONS.
        Args:
            scope: Scope of options to retrieve
            timeout: Timeout in seconds
        """
        option_packet_event = threading.Event()
        self.register_callback(Events.GetOptions, option_packet_event.set)

        self.__rx.sendPacket(rttDroneComms.comms.rttGETOPTCommand(scope))
        self.__log.info("Sent GETOPT command")

        option_packet_event.wait(timeout=timeout)

        accepted_keywords = []
        if scope >= self.BASE_OPTIONS:
            accepted_keywords.extend(self.__base_option_keywords)
        if scope >= self.EXP_OPTIONS:
            accepted_keywords.extend(self.__exp_option_keywords)
        if scope >= self.ENG_OPTIONS:
            accepted_keywords.extend(self.__eng_option_keywords)

        return {key: self.pp_options[key] for key in accepted_keywords}

    def get_option(self, keyword: str, timeout: int = 10):
        """
        Retrieves a specific option by keyword
        Args:
            keyword: Keyword of the option to retrieve
            timeout: Timeout in seconds
        """
        if keyword in self.__base_option_keywords:
            if self._option_cache_dirty[self.BASE_OPTIONS] == self.CACHE_INVALID:
                return self.get_options(self.BASE_OPTIONS, timeout)[keyword]
        elif keyword in self.__exp_option_keywords:
            if self._option_cache_dirty[self.EXP_OPTIONS] == self.CACHE_INVALID:
                return self.get_options(self.EXP_OPTIONS, timeout)[keyword]
        elif keyword in self.__eng_option_keywords:
            if self._option_cache_dirty[self.ENG_OPTIONS] == self.CACHE_INVALID:
                return self.get_options(self.ENG_OPTIONS, timeout)[keyword]
        return copy.deepcopy(self.pp_options[keyword])

    def set_options(self, timeout: int, **kwargs):
        """
        Sets the specified options on the payload.
        Args:
            timeout: Timeout in seconds
            kwargs: Options to set by keyword
        """
        scope = self.BASE_OPTIONS
        for keyword in kwargs:
            if keyword in self.__base_option_keywords:
                scope = max(scope, self.BASE_OPTIONS)
            elif keyword in self.__exp_option_keywords:
                scope = max(scope, self.EXP_OPTIONS)
            elif keyword in self.__eng_option_keywords:
                scope = max(scope, self.ENG_OPTIONS)
            else:
                raise KeyError

        self.pp_options.update(kwargs)
        accepted_keywords = []
        if scope >= self.BASE_OPTIONS:
            self._option_cache_dirty[self.BASE_OPTIONS] = self.CACHE_DIRTY
            accepted_keywords.extend(self.__base_option_keywords)
        if scope >= self.EXP_OPTIONS:
            self._option_cache_dirty[self.EXP_OPTIONS] = self.CACHE_DIRTY
            accepted_keywords.extend(self.__exp_option_keywords)
        if scope >= self.ENG_OPTIONS:
            self._option_cache_dirty[self.ENG_OPTIONS] = self.CACHE_DIRTY
            accepted_keywords.extend(self.__eng_option_keywords)

        self.__send_command_and_wait(
            0x05,
            rttDroneComms.comms.rttSETOPTCommand(
                scope, **{key: self.pp_options[key] for key in accepted_keywords}
            ),
            timeout,
            "SETOPT",
        )

    def send_upgrade_packet(self, byte_stream: bytes):
        num_packets = -1
        if len(byte_stream) % 1000 != 0:
            num_packets = len(byte_stream) // 1000 + 1
        else:
            num_packets = len(byte_stream) // 1000
        for i in range(num_packets):
            start_idx = i * 1000
            end_idx = start_idx + 1000
            self.__rx.sendPacket(
                rttDroneComms.comms.rttUpgradePacket(
                    i + 1, num_packets, byte_stream[start_idx:end_idx]
                )
            )

    def __process_heartbeat(self, packet: rttDroneComms.comms.rttHeartBeatPacket):
        """
        Internal callback for heartbeat packets.
        Args:
            packet: Heartbeat packet payload
            addr: Source of the packet
        """
        self.__log.info("Received heartbeat")
        self.state.update(
            {
                "STS_sdr_status": SDRInitStates(packet.sdrState),
                "STS_dir_status": OutputDirStates(packet.storageState),
                "STS_gps_status": ExtsStates(packet.sensorState),
                "STS_sys_status": RTTStates(packet.systemState),
                "STS_sw_status": packet.switchState,
            }
        )
        for callback in self.__callbacks[Events.Heartbeat]:
            callback()

    def __process_no_heartbeat(self, packet, addr):
        """
        Internal callback to handle no heartbeat messages
        Args:
            packet: None
            addr: None
        """
        for callback in self.__callbacks[Events.NoHeartbeat]:
            callback()

    def __handle_remote_exception(
        self, packet: rttDroneComms.comms.rttRemoteExceptionPacket
    ):
        """
        Internal callback to handle traceback messages
        Args:
            packet: Traceback packet payload
            addr: Source of packet
        """
        self.__log.exception("Remote Exception: %s", packet.exception)
        self.__log.exception("Remote Traceback: %s", packet.traceback)
        for callback in self.__callbacks[Events.Exception]:
            callback()

    def __process_ack(self, packet: rttDroneComms.comms.rttACKCommand):
        """
        Internal callback to handle command ACK packets from the payload.
        Args:
            packet: ACK message
            addr: Source address
        """
        command_id = packet.commandID
        if command_id in self.__ack_vectors:
            vector = self.__ack_vectors[command_id]
            vector[1] = packet.ack
            vector[0].set()

    def __process_frequencies(self, packet: rttDroneComms.comms.rttFrequenciesPacket):
        """
        Internal callback to handle frequency messages.
        Args:
            packet: Frequency message payload
            addr: Source of packet as a string
        """
        self.__log.info("Received frequencies")
        self.pp_options["TGT_frequencies"] = packet.frequencies
        self._option_cache_dirty[self.TGT_PARAMS] = self.CACHE_GOOD
        for callback in self.__callbacks[Events.GetFreqs]:
            callback()

    def __process_options(self, packet: rttDroneComms.comms.rttOptionsPacket):
        """
        Internal callback to handle options messages.
        Args:
            packet: Options packet payload
            addr: Source of packet
        """
        self.__log.info("Received options")
        for parameter in packet.options:
            self.pp_options[parameter] = packet.options[parameter]
        if packet.scope >= self.BASE_OPTIONS:
            self._option_cache_dirty[self.BASE_OPTIONS] = self.CACHE_GOOD
        if packet.scope >= self.EXP_OPTIONS:
            self._option_cache_dirty[self.EXP_OPTIONS] = self.CACHE_GOOD
        if packet.scope >= self.ENG_OPTIONS:
            self._option_cache_dirty[self.ENG_OPTIONS] = self.CACHE_GOOD

        for callback in self.__callbacks[Events.GetOptions]:
            callback()

    def __process_ping(self, packet: rttDroneComms.comms.rttPingPacket):
        """
        Internal callback to handle ping packets from the payload.
        Args:
            packet: Ping packet
            addr: Source address
        """
        ping_obj = RTTPing.from_packet(packet)
        estimate = self.est_mgr.add_ping(ping_obj)
        for callback in self.__callbacks[Events.NewPing]:
            callback()
        if estimate is not None:
            for callback in self.__callbacks[Events.NewEstimate]:
                callback()

    def __process_vehicle(self, packet: rttDroneComms.comms.rttVehiclePacket):
        """
        Internal callback to handle vehicle position packets from the payload.
        Args:
            packet: Vehicle Position packet
            addr: Source address
        """
        coordinate = [packet.lat, packet.lon, packet.alt, packet.hdg]
        self.state["VCL_track"][packet.timestamp] = coordinate
        for callback in self.__callbacks[Events.VehicleInfo]:
            callback()

    def __process_cone(self, packet: rttDroneComms.comms.rttConePacket):
        """
        Internal callback to handle cone packets from the payload.
        Args:
            packet: Cone packet
            addr: Source address
        """
        coordinate = [packet.lat, packet.lon, packet.alt, packet.power, packet.angle]
        self.state["CONE_track"][packet.timestamp] = coordinate
        for callback in self.__callbacks[Events.ConeInfo]:
            callback()
