import React, { useContext } from 'react';
import DroneStatus from './cards/DroneStatus';
import Message from './cards/Message';
import RadioConfig from './cards/RadioConfig';
import PingFinderConfig from './cards/PingFinderConfig';
import Start from './cards/Start';
import Stop from './cards/Stop';
import Disconnect from './cards/Disconnect';
import { GlobalAppContext } from '../../context/globalAppContextDef';
import { GCSState } from '../../context/globalAppTypes';

const DeviceControls: React.FC = () => {
    const context = useContext(GlobalAppContext);
    if (!context) return null;
    const { gcsState, message, messageType, messageVisible } = context;

    const showRadioConfig = [
        GCSState.RADIO_CONFIG_INPUT,
        GCSState.RADIO_CONFIG_WAITING,
        GCSState.RADIO_CONFIG_TIMEOUT
    ].includes(gcsState);

    const showPingFinder = [
        GCSState.PING_FINDER_CONFIG_INPUT,
        GCSState.PING_FINDER_CONFIG_WAITING,
        GCSState.PING_FINDER_CONFIG_TIMEOUT
    ].includes(gcsState);

    const showStart = [
        GCSState.START_INPUT,
        GCSState.START_WAITING,
        GCSState.START_TIMEOUT
    ].includes(gcsState);

    const showStop = [
        GCSState.STOP_INPUT,
        GCSState.STOP_WAITING,
        GCSState.STOP_TIMEOUT
    ].includes(gcsState);

    const hideDisconnect = [
        GCSState.RADIO_CONFIG_INPUT,
        GCSState.RADIO_CONFIG_WAITING,
        GCSState.RADIO_CONFIG_TIMEOUT
    ].includes(gcsState);

    return (
        <div className="space-y-4">
            <DroneStatus />
            {messageVisible && <Message message={message} type={messageType} />}
            {showRadioConfig && <RadioConfig />}
            {showPingFinder && <PingFinderConfig />}
            {showStart && <Start />}
            {showStop && <Stop />}
            {!hideDisconnect && <Disconnect />}
        </div>
    );
};

export default DeviceControls;
