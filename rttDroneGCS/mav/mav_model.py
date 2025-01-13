"""Module for the MAVModel class."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Callable

import rttDroneComms.comms

from rttDroneGCS.ping import DataManager, RTTPing

from .enums import Events, ExtsStates, OutputDirStates, RTTStates, SDRInitStates


class MAVModel:
    """Provides an object-oriented view of the vehicle state."""

    BASE_OPTIONS = 0x00
    EXP_OPTIONS = 0x01
    ENG_OPTIONS = 0xFF
    TGT_PARAMS = 0x100

    CACHE_GOOD = 0
    CACHE_INVALID = 1
    CACHE_DIRTY = 2

    def __init__(self, receiver: rttDroneComms.comms.gcsComms) -> None:
        """Initialize a new MAVModel.

        Args:
        ----
            receiver (rttDroneComms.comms.gcsComms): gcsComms Object

        """
        self._log = logging.getLogger("rttDroneGCS:MavModel")
        self._rx = receiver
        self._option_cache_dirty = {
            self.BASE_OPTIONS: self.CACHE_INVALID,
            self.EXP_OPTIONS: self.CACHE_INVALID,
            self.ENG_OPTIONS: self.CACHE_INVALID,
            self.TGT_PARAMS: self.CACHE_INVALID,
        }
        self.state = self._initialize_state()
        self.pp_options = self._initialize_pp_options()
        self.est_mgr = DataManager()
        self._callbacks = {event: [] for event in Events}
        self._ack_vectors = {}
        self._register_rx_callbacks()

    def _initialize_state(self) -> dict:
        return {
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

    def _initialize_pp_options(self) -> dict:
        return {
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

    def _register_rx_callbacks(self) -> None:
        callback_mapping = {
            rttDroneComms.comms.EVENTS.STATUS_HEARTBEAT: self._process_heartbeat,
            rttDroneComms.comms.EVENTS.GENERAL_NO_HEARTBEAT: self._process_no_heartbeat,
            rttDroneComms.comms.EVENTS.STATUS_EXCEPTION: self._handle_remote_exception,
            rttDroneComms.comms.EVENTS.COMMAND_ACK: self._process_ack,
            rttDroneComms.comms.EVENTS.CONFIG_FREQUENCIES: self._process_frequencies,
            rttDroneComms.comms.EVENTS.CONFIG_OPTIONS: self._process_options,
            rttDroneComms.comms.EVENTS.DATA_PING: self._process_ping,
            rttDroneComms.comms.EVENTS.DATA_VEHICLE: self._process_vehicle,
            rttDroneComms.comms.EVENTS.DATA_CONE: self._process_cone,
        }
        for event, callback in callback_mapping.items():
            self._rx.registerCallback(event, callback)

    async def start(self) -> None:
        """Initialize the MAVModel object."""
        await self._rx.start()
        self._log.info("MAVModel Started")

    async def stop(self) -> None:
        """Stop the MAVModel and underlying resources."""
        await self._rx.stop()
        self._log.info("MAVModel Stopped")

    def register_callback(self, event: Events, callback: Callable) -> None:
        """Register a callback for the specific event.

        Args:
        ----
            event (Events): Event to trigger on
            callback (Callable): Callback to call

        Raises:
        ------
            TypeError: If the event type is invalid

        """
        if not isinstance(event, Events):
            msg = "Invalid event type"
            raise TypeError(msg)
        self._callbacks[event].append(callback)

    async def start_mission(self) -> None:
        """Send the start mission command."""
        await self._send_command_and_wait(
            0x07,
            rttDroneComms.comms.rttSTARTCommand(),
            "START",
        )

    async def stop_mission(self) -> None:
        """Send the stop mission command."""
        await self._send_command_and_wait(
            0x09,
            rttDroneComms.comms.rttSTOPCommand(),
            "STOP",
        )

    async def _send_command_and_wait(
        self,
        command_id: int,
        command: rttDroneComms.comms.BinaryPacket,
        command_name: str,
    ) -> None:
        event = asyncio.Event()
        self._ack_vectors[command_id] = [event, 0]
        await self._rx.sendPacket(command)
        self._log.info(f"Sent {command_name} command")
        try:
            await asyncio.wait_for(event.wait(), timeout=10)
        except asyncio.TimeoutError as err:
            msg = f"{command_name} timed out"
            raise RuntimeError(msg) from err
        if not self._ack_vectors.pop(command_id)[1]:
            msg = f"{command_name} NACKED"
            raise RuntimeError(msg)

    async def get_frequencies(self) -> list[int]:
        """Retrieve the PRX_frequencies from the payload.

        Returns
        -------
            List of frequencies

        """
        if self._option_cache_dirty[self.TGT_PARAMS] == self.CACHE_INVALID:
            frequency_pack_event = asyncio.Event()
            self.register_callback(Events.GetFreqs, frequency_pack_event.set)

            await self._rx.sendPacket(rttDroneComms.comms.rttGETFCommand())
            self._log.info("Sent getF command")

            try:
                await asyncio.wait_for(
                    frequency_pack_event.wait(),
                    timeout=10,
                )
            except asyncio.TimeoutError as err:
                msg = "Timeout waiting for frequencies"
                raise RuntimeError(msg) from err
        return self.pp_options["TGT_frequencies"]

    async def set_frequencies(self, freqs: list[int]) -> None:
        """Send the command to set the specific PRX_frequencies.

        Args:
        ----
            freqs (list[int]): Frequencies to set

        """
        if not isinstance(freqs, list) or not all(
            isinstance(freq, int) for freq in freqs
        ):
            msg = "Invalid frequencies"
            raise TypeError(msg)

        self._option_cache_dirty[self.TGT_PARAMS] = self.CACHE_DIRTY
        await self._send_command_and_wait(
            0x03,
            rttDroneComms.comms.rttSETFCommand(freqs),
            "SETF",
        )

    async def add_frequency(self, frequency: int) -> None:
        """Add the specified frequency to the target frequencies.

        If the specified frequency is already in TGT_frequencies, this function does
        nothing. Otherwise, this function will update the TGT_frequencies on the
        payload.

        Args:
        ----
            frequency (int): Frequency to add

        """
        if frequency not in self.pp_options["TGT_frequencies"]:
            await self.set_frequencies(
                self.pp_options["TGT_frequencies"] + [frequency],
            )

    async def remove_frequency(self, frequency: int) -> None:
        """Remove the specified frequency from the target frequencies.

        If the specified frequency is not in TGT_frequencies, this function raises a
        RuntimeError. Otherwise, this function will update the TGT_frequencies on the
        payload.

        Args:
        ----
            frequency (int): Frequency to remove

        """
        if frequency not in self.pp_options["TGT_frequencies"]:
            msg = "Invalid frequency"
            raise RuntimeError(msg)
        new_freqs = [f for f in self.pp_options["TGT_frequencies"] if f != frequency]
        await self.set_frequencies(new_freqs)

    async def get_options(self, scope: int) -> dict:
        """Retrieve and return the options as a dictionary from the remote.

        Scope should be set to one of MAVModel.BASE_OPTIONS, MAVModel.EXP_OPTIONS, or
        MAVModel.ENG_OPTIONS.

        Args:
        ----
            scope (int): Scope of options to retrieve

        Returns:
        -------
            Dictionary of options

        """
        option_packet_event = asyncio.Event()
        self.register_callback(Events.GetOptions, option_packet_event.set)

        await self._rx.sendPacket(rttDroneComms.comms.rttGETOPTCommand(scope))
        self._log.info("Sent GETOPT command")

        try:
            await asyncio.wait_for(option_packet_event.wait(), timeout=10)
        except asyncio.TimeoutError as err:
            msg = "Timeout waiting for options"
            raise RuntimeError(msg) from err

        accepted_keywords = []
        if scope >= self.BASE_OPTIONS:
            accepted_keywords.extend(self._base_option_keywords)
        if scope >= self.EXP_OPTIONS:
            accepted_keywords.extend(self._exp_option_keywords)
        if scope >= self.ENG_OPTIONS:
            accepted_keywords.extend(self._eng_option_keywords)

        return {key: self.pp_options[key] for key in accepted_keywords}

    async def get_option(self, keyword: str) -> any | None:
        """Retrieve a specific option by keyword.

        Args:
        ----
            keyword: Keyword of the option to retrieve

        Returns:
        -------
            The option value or None if the keyword is invalid

        """
        option_groups = [
            (self._base_option_keywords, self.BASE_OPTIONS),
            (self._exp_option_keywords, self.EXP_OPTIONS),
            (self._eng_option_keywords, self.ENG_OPTIONS),
        ]

        for keywords, scope in option_groups:
            if (
                keyword in keywords
                and self._option_cache_dirty[scope] == self.CACHE_INVALID
            ):
                options = await self.get_options(scope)
                return options.get(keyword)

        return self.pp_options.get(keyword)

    async def set_options(self, **kwargs: dict[str, Any]) -> None:
        """Set the specified options on the payload.

        Args:
        ----
            kwargs: Options to set by keyword

        """
        scope = self.BASE_OPTIONS
        for keyword in kwargs:
            if keyword in self._base_option_keywords:
                scope = max(scope, self.BASE_OPTIONS)
            elif keyword in self._exp_option_keywords:
                scope = max(scope, self.EXP_OPTIONS)
            elif keyword in self._eng_option_keywords:
                scope = max(scope, self.ENG_OPTIONS)
            else:
                msg = f"Invalid option keyword: {keyword}"
                raise KeyError(msg)

        self.pp_options.update(kwargs)
        accepted_keywords = []
        if scope >= self.BASE_OPTIONS:
            self._option_cache_dirty[self.BASE_OPTIONS] = self.CACHE_DIRTY
            accepted_keywords.extend(self._base_option_keywords)
        if scope >= self.EXP_OPTIONS:
            self._option_cache_dirty[self.EXP_OPTIONS] = self.CACHE_DIRTY
            accepted_keywords.extend(self._exp_option_keywords)
        if scope >= self.ENG_OPTIONS:
            self._option_cache_dirty[self.ENG_OPTIONS] = self.CACHE_DIRTY
            accepted_keywords.extend(self._eng_option_keywords)

        await self._send_command_and_wait(
            0x05,
            rttDroneComms.comms.rttSETOPTCommand(
                scope,
                **{key: self.pp_options[key] for key in accepted_keywords},
            ),
            "SETOPT",
        )

    async def send_upgrade_packet(self, byte_stream: bytes) -> None:
        """Send the upgrade packet to the payload.

        Args:
        ----
            byte_stream (bytes): Byte stream to send

        """
        num_packets = -1
        if len(byte_stream) % 1000 != 0:
            num_packets = len(byte_stream) // 1000 + 1
        else:
            num_packets = len(byte_stream) // 1000
        for i in range(num_packets):
            start_idx = i * 1000
            end_idx = start_idx + 1000
            await self._rx.sendPacket(
                rttDroneComms.comms.rttUpgradePacket(
                    i + 1,
                    num_packets,
                    byte_stream[start_idx:end_idx],
                ),
            )

    async def _process_heartbeat(
        self,
        packet: rttDroneComms.comms.rttHeartBeatPacket,
    ) -> None:
        self._log.info("Received heartbeat")
        self.state.update(
            {
                "STS_sdr_status": SDRInitStates(packet.sdrState),
                "STS_dir_status": OutputDirStates(packet.storageState),
                "STS_gps_status": ExtsStates(packet.sensorState),
                "STS_sys_status": RTTStates(packet.systemState),
                "STS_sw_status": packet.switchState,
            },
        )
        for callback in self._callbacks[Events.Heartbeat]:
            callback()

    async def _process_no_heartbeat(self) -> None:
        for callback in self._callbacks[Events.NoHeartbeat]:
            callback()

    async def _handle_remote_exception(
        self,
        packet: rttDroneComms.comms.rttRemoteExceptionPacket,
    ) -> None:
        self._log.exception("Remote Exception: %s", packet.exception)
        self._log.exception("Remote Traceback: %s", packet.traceback)
        for callback in self._callbacks[Events.Exception]:
            callback()

    async def _process_ack(self, packet: rttDroneComms.comms.rttACKCommand) -> None:
        command_id = packet.commandID
        if command_id in self._ack_vectors:
            vector = self._ack_vectors[command_id]
            vector[1] = packet.ack
            vector[0].set()

    async def _process_frequencies(
        self,
        packet: rttDroneComms.comms.rttFrequenciesPacket,
    ) -> None:
        self._log.info("Received frequencies")
        self.pp_options["TGT_frequencies"] = packet.frequencies
        self._option_cache_dirty[self.TGT_PARAMS] = self.CACHE_GOOD
        for callback in self._callbacks[Events.GetFreqs]:
            callback()

    async def _process_options(
        self,
        packet: rttDroneComms.comms.rttOptionsPacket,
    ) -> None:
        self._log.info("Received options")
        for parameter in packet.options:
            self.pp_options[parameter] = packet.options[parameter]
        if packet.scope >= self.BASE_OPTIONS:
            self._option_cache_dirty[self.BASE_OPTIONS] = self.CACHE_GOOD
        if packet.scope >= self.EXP_OPTIONS:
            self._option_cache_dirty[self.EXP_OPTIONS] = self.CACHE_GOOD
        if packet.scope >= self.ENG_OPTIONS:
            self._option_cache_dirty[self.ENG_OPTIONS] = self.CACHE_GOOD

        for callback in self._callbacks[Events.GetOptions]:
            callback()

    async def _process_ping(self, packet: rttDroneComms.comms.rttPingPacket) -> None:
        ping_obj = RTTPing.from_packet(packet)
        estimate = self.est_mgr.add_ping(ping_obj)
        for callback in self._callbacks[Events.NewPing]:
            callback()
        if estimate is not None:
            for callback in self._callbacks[Events.NewEstimate]:
                callback()

    async def _process_vehicle(
        self,
        packet: rttDroneComms.comms.rttVehiclePacket,
    ) -> None:
        coordinate = [packet.lat, packet.lon, packet.alt, packet.hdg]
        self.state["VCL_track"][packet.timestamp] = coordinate
        for callback in self._callbacks[Events.VehicleInfo]:
            callback()

    async def _process_cone(self, packet: rttDroneComms.comms.rttConePacket) -> None:
        coordinate = [packet.lat, packet.lon, packet.alt, packet.power, packet.angle]
        self.state["CONE_track"][packet.timestamp] = coordinate
        for callback in self._callbacks[Events.ConeInfo]:
            callback()
