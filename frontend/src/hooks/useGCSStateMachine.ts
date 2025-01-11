import { useState, useCallback } from 'react';
import { GCSState } from '../context/globalAppTypes';
import type { DroneBackend } from '../utils/backend';

interface MessageState {
    message: string;
    messageVisible: boolean;
    messageType: 'error' | 'success';
}

export interface GCSStateMachineState extends MessageState {
    gcsState: GCSState;
    connectionStatus: 1 | 0;
    setupStateHandlers: () => void;
    setMessageVisible: (visible: boolean) => void;
    setGcsState: (state: GCSState) => void;
}

export function useGCSStateMachine(backend: DroneBackend | null): GCSStateMachineState {
    const [gcsState, setGcsState] = useState<GCSState>(GCSState.RADIO_CONFIG_INPUT);
    const [connectionStatus, setConnectionStatus] = useState<1 | 0>(0);
    const [message, setMessage] = useState<string>('');
    const [messageVisible, setMessageVisible] = useState<boolean>(false);
    const [messageType, setMessageType] = useState<'error' | 'success'>('error');

    const setupStateHandlers = useCallback(() => {
        if (!backend) return;

        backend.sync_success.connect((msg: string) => {
            if (gcsState === GCSState.RADIO_CONFIG_WAITING || gcsState === GCSState.RADIO_CONFIG_TIMEOUT) {
                setGcsState(GCSState.PING_FINDER_CONFIG_INPUT);
                setMessage(msg);
                setMessageVisible(true);
                setMessageType('success');
                setConnectionStatus(1);
            }
        });

        backend.sync_failure.connect((msg: string) => {
            if (gcsState === GCSState.RADIO_CONFIG_WAITING || gcsState === GCSState.RADIO_CONFIG_TIMEOUT) {
                setGcsState(GCSState.RADIO_CONFIG_INPUT);
                setMessage(msg);
                setMessageVisible(true);
                setMessageType('error');
            }
        });

        backend.sync_timeout.connect(() => {
            if (gcsState === GCSState.RADIO_CONFIG_WAITING) {
                setGcsState(GCSState.RADIO_CONFIG_TIMEOUT);
            }
        });

        backend.config_success.connect((msg: string) => {
            if (gcsState === GCSState.PING_FINDER_CONFIG_WAITING || gcsState === GCSState.PING_FINDER_CONFIG_TIMEOUT) {
                setGcsState(GCSState.START_INPUT);
                setMessage(msg);
                setMessageVisible(true);
                setMessageType('success');
            }
        });

        backend.config_failure.connect((msg: string) => {
            if (gcsState === GCSState.PING_FINDER_CONFIG_WAITING || gcsState === GCSState.PING_FINDER_CONFIG_TIMEOUT) {
                setGcsState(GCSState.PING_FINDER_CONFIG_INPUT);
                setMessage(msg);
                setMessageVisible(true);
                setMessageType('error');
            }
        });

        backend.config_timeout.connect(() => {
            if (gcsState === GCSState.PING_FINDER_CONFIG_WAITING) {
                setGcsState(GCSState.PING_FINDER_CONFIG_TIMEOUT);
            }
        });

        backend.start_success.connect((msg: string) => {
            if (gcsState === GCSState.START_WAITING || gcsState === GCSState.START_TIMEOUT) {
                setGcsState(GCSState.STOP_INPUT);
                setMessage(msg);
                setMessageVisible(true);
                setMessageType('success');
            }
        });

        backend.start_failure.connect((msg: string) => {
            if (gcsState === GCSState.START_WAITING || gcsState === GCSState.START_TIMEOUT) {
                setGcsState(GCSState.START_INPUT);
                setMessage(msg);
                setMessageVisible(true);
                setMessageType('error');
            }
        });

        backend.start_timeout.connect(() => {
            if (gcsState === GCSState.START_WAITING) {
                setGcsState(GCSState.START_TIMEOUT);
            }
        });

        backend.stop_success.connect((msg: string) => {
            if (gcsState === GCSState.STOP_WAITING || gcsState === GCSState.STOP_TIMEOUT) {
                setGcsState(GCSState.RADIO_CONFIG_INPUT);
                setMessage(msg);
                setMessageVisible(true);
                setMessageType('success');
            }
        });

        backend.stop_failure.connect((msg: string) => {
            if (gcsState === GCSState.STOP_WAITING || gcsState === GCSState.STOP_TIMEOUT) {
                setGcsState(GCSState.STOP_INPUT);
                setMessage(msg);
                setMessageVisible(true);
                setMessageType('error');
            }
        });

        backend.stop_timeout.connect(() => {
            if (gcsState === GCSState.STOP_WAITING) {
                setGcsState(GCSState.STOP_TIMEOUT);
            }
        });

        backend.disconnect_success.connect((msg: string) => {
            setGcsState(GCSState.RADIO_CONFIG_INPUT);
            setConnectionStatus(0);
            setMessage(msg);
            setMessageVisible(true);
            setMessageType('success');
        });

        backend.disconnect_failure.connect((msg: string) => {
            setGcsState(GCSState.RADIO_CONFIG_INPUT);
            setConnectionStatus(0);
            setMessage(msg);
            setMessageVisible(true);
            setMessageType('error');
        });
    }, [backend, gcsState]);

    return {
        gcsState,
        connectionStatus,
        message,
        messageVisible,
        messageType,
        setupStateHandlers,
        setMessageVisible,
        setGcsState
    };
} 