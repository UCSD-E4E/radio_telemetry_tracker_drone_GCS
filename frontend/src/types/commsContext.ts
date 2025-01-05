import { createContext } from 'react';
import type { CommsConfig } from '../utils/backend';

export interface CommsContextValue {
    interfaceType: 'serial' | 'simulated';
    setInterfaceType: (type: 'serial' | 'simulated') => void;
    serialPorts: string[];
    loadSerialPorts: () => Promise<void>;
    selectedPort: string;
    setSelectedPort: (port: string) => void;
    baudRate: number;
    setBaudRate: (rate: number) => void;
    host: string;
    setHost: (host: string) => void;
    tcpPort: number;
    setTcpPort: (port: number) => void;
    ackTimeout: number;
    setAckTimeout: (timeout: number) => void;
    maxRetries: number;
    setMaxRetries: (retries: number) => void;

    isConnecting: boolean;
    isConnected: boolean;
    connectionStatus: string;
    errorMessage: string;

    showCancelSync: boolean;
    setShowCancelSync: (show: boolean) => void;

    initializeComms: (config: CommsConfig) => Promise<boolean>;
    cancelConnection: () => void;
}

export const CommsContext = createContext<CommsContextValue>({
    interfaceType: 'serial',
    setInterfaceType: () => { },
    serialPorts: [],
    loadSerialPorts: async () => { },
    selectedPort: '',
    setSelectedPort: () => { },
    baudRate: 115200,
    setBaudRate: () => { },
    host: 'localhost',
    setHost: () => { },
    tcpPort: 50000,
    setTcpPort: () => { },
    ackTimeout: 1000,
    setAckTimeout: () => { },
    maxRetries: 3,
    setMaxRetries: () => { },

    isConnecting: false,
    isConnected: false,
    connectionStatus: '',
    errorMessage: '',

    showCancelSync: false,
    setShowCancelSync: () => { },

    initializeComms: async () => false,
    cancelConnection: () => { },
}); 