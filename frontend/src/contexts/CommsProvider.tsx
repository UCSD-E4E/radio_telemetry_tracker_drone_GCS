import React, { useCallback, useEffect, useState } from 'react';
import { fetchBackend, type CommsConfiguration } from '../utils/backend';
import type { CommsContextValue } from '../types/commsContext';
import type { DroneData } from '../types/global';
import { CommsContext } from './CommsContext';

export const CommsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [interfaceType, setInterfaceType] = useState<'serial' | 'simulated'>('serial');
    const [serialPorts, setSerialPorts] = useState<string[]>([]);
    const [selectedPort, setSelectedPort] = useState<string>('');
    const [baudRate, setBaudRate] = useState<number | null>(null);
    const [host, setHost] = useState<string>('');
    const [tcpPort, setTcpPort] = useState<number | null>(null);
    const [ackTimeout, setAckTimeout] = useState<number>(2000);
    const [maxRetries, setMaxRetries] = useState<number>(5);

    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [showCancelSync, setShowCancelSync] = useState(false);
    const [waitingForSync, setWaitingForSync] = useState(false);
    const [droneData, setDroneData] = useState<DroneData | null>(null);

    const loadSerialPorts = useCallback(async () => {
        if (!window.backend) return;
        try {
            const ports = await window.backend.get_serial_ports();
            setSerialPorts(ports);
            // Auto-select the first port if available and none is selected
            if (ports.length > 0 && !selectedPort) {
                setSelectedPort(ports[0]);
            }
        } catch (err) {
            console.error('Error loading serial ports:', err);
        }
    }, [selectedPort]);

    const initializeComms = async () => {
        setIsConnecting(true);
        setConnectionStatus('Connecting...');
        setErrorMessage('');
        setWaitingForSync(true);
        setShowCancelSync(false);  // Reset cancel button state

        const backend = await fetchBackend();

        const commsConfig: CommsConfiguration = {
            interface_type: interfaceType,
            ack_timeout: ackTimeout / 1000, // Convert ms to seconds for backend
            max_retries: maxRetries,
        };

        if (interfaceType === 'serial') {
            if (!selectedPort) {
                setErrorMessage('Please select a port');
                setIsConnecting(false);
                setWaitingForSync(false);
                return false;
            }
            if (!baudRate) {
                setErrorMessage('Please select a baud rate');
                setIsConnecting(false);
                setWaitingForSync(false);
                return false;
            }
            commsConfig.port = selectedPort;
            commsConfig.baudrate = baudRate;
        } else {
            if (!host) {
                setErrorMessage('Please enter a host');
                setIsConnecting(false);
                setWaitingForSync(false);
                return false;
            }
            if (!tcpPort) {
                setErrorMessage('Please enter a TCP port');
                setIsConnecting(false);
                setWaitingForSync(false);
                return false;
            }
            commsConfig.host = host;
            commsConfig.tcp_port = tcpPort;
        }

        try {
            const success = await backend.initialize_comms(commsConfig);
            if (!success) {
                setIsConnecting(false);
                setWaitingForSync(false);
                return false;
            }

            // Start timeout for sync response
            const timeoutMs = ackTimeout * maxRetries; // Total timeout in ms
            console.log(`Setting frontend timeout for ${timeoutMs}ms (${ackTimeout}ms * ${maxRetries} retries)`);
            setTimeout(() => {
                console.log('Frontend timeout reached, waitingForSync:', waitingForSync);
                if (waitingForSync) {
                    console.log('Showing cancel button');
                    setShowCancelSync(true);
                }
            }, timeoutMs);

            return true;
        } catch (error) {
            console.error('Failed to initialize comms:', error);
            setErrorMessage('Failed to initialize communications');
            setIsConnecting(false);
            setWaitingForSync(false);
            return false;
        }
    };

    const cancelConnection = useCallback(async () => {
        const backend = await fetchBackend();
        await backend.cancel_connection();
        
        setIsConnected(false);
        setIsConnecting(false);
        setWaitingForSync(false);
        setErrorMessage('');
        setShowCancelSync(false);
    }, []);

    useEffect(() => {
        const setupBackend = async () => {
            const backend = await fetchBackend();

            backend.connection_status.connect((status: string) => {
                console.log('Connection status changed:', status);
                setConnectionStatus(status);
                if (status === 'Drone connected successfully') {
                    setIsConnected(true);
                    setWaitingForSync(false);
                    setShowCancelSync(false);
                    setIsConnecting(false);
                }
            });

            backend.sync_timeout.connect(() => {
                console.log('Backend sync_timeout signal received');
                setShowCancelSync(true);
            });

            backend.error_message.connect((message: string) => {
                console.log('Error message received:', message);
                setErrorMessage(message);
            });

            backend.drone_data_updated.connect((data: DroneData | { disconnected: true }) => {
                if ('disconnected' in data) {
                    setDroneData(null);
                } else {
                    setDroneData(data);
                }
            });
        };

        setupBackend();
    }, []);

    return (
        <CommsContext.Provider
            value={{
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
                setIsConnected,
                connectionStatus,
                errorMessage,
                setErrorMessage,
                waitingForSync,
                setWaitingForSync,

                showCancelSync,
                setShowCancelSync,

                droneData,

                initializeComms,
                cancelConnection,
            } satisfies CommsContextValue}
        >
            {children}
        </CommsContext.Provider>
    );
};
