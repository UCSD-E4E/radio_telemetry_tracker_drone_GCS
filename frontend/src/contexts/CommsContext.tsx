import React, { useState, useCallback } from 'react';
import { CommsContext, CommsContextValue } from '../types/commsContext';
import type { CommsConfig } from '../utils/backend';

export { CommsContext } from '../types/commsContext';

export const CommsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [interfaceType, setInterfaceType] = useState<'serial' | 'simulated'>('serial');
    const [serialPorts, setSerialPorts] = useState<string[]>([]);
    const [selectedPort, setSelectedPort] = useState('');
    const [baudRate, setBaudRate] = useState(115200);
    const [host, setHost] = useState('localhost');
    const [tcpPort, setTcpPort] = useState(50000);
    const [ackTimeout, setAckTimeout] = useState(1000);
    const [maxRetries, setMaxRetries] = useState(3);

    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [showCancelSync, setShowCancelSync] = useState(false);

    const loadSerialPorts = useCallback(async () => {
        if (!window.backend) return;
        try {
            const ports = await window.backend.get_serial_ports();
            setSerialPorts(ports);
        } catch (err) {
            console.error('Error getting serial ports:', err);
            setErrorMessage('Failed to get serial ports');
        }
    }, []);

    const initializeComms = useCallback(async (config: CommsConfig) => {
        if (!window.backend) return false;

        setIsConnecting(true);
        setErrorMessage('');
        setConnectionStatus('Connecting...');

        try {
            const success = await window.backend.initialize_comms(config);
            if (!success) {
                throw new Error('Failed to initialize communications');
            }
            setIsConnected(true);
            setConnectionStatus('Connected');
            return true;
        } catch (err) {
            console.error('Error connecting:', err);
            setErrorMessage(err instanceof Error ? err.message : 'Unknown error connecting');
            setConnectionStatus('Connection failed');
            setIsConnected(false);
            return false;
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const cancelConnection = useCallback(() => {
        setIsConnected(false);
        setErrorMessage('');
        setConnectionStatus('Disconnected');
        setShowCancelSync(false);
    }, []);

    const value: CommsContextValue = {
        interfaceType,
        setInterfaceType,
        serialPorts,
        loadSerialPorts,
        selectedPort,
        setSelectedPort,
        baudRate,
        setBaudRate,
        host,
        setHost,
        tcpPort,
        setTcpPort,
        ackTimeout,
        setAckTimeout,
        maxRetries,
        setMaxRetries,

        isConnecting,
        isConnected,
        connectionStatus,
        errorMessage,

        showCancelSync,
        setShowCancelSync,

        initializeComms,
        cancelConnection,
    };

    return <CommsContext.Provider value={value}>{children}</CommsContext.Provider>;
};
