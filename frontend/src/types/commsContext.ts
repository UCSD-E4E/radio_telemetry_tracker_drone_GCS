import type { DroneData } from './global';

export interface CommsContextValue {
    interfaceType: 'serial' | 'simulated';
    setInterfaceType: (type: 'serial' | 'simulated') => void;
    serialPorts: string[];
    loadSerialPorts: () => void;
    selectedPort: string;
    setSelectedPort: (port: string) => void;
    baudRate: number | null;
    setBaudRate: (rate: number) => void;
    host: string;
    setHost: (host: string) => void;
    tcpPort: number | null;
    setTcpPort: (port: number | null) => void;
    ackTimeout: number;
    setAckTimeout: (timeout: number) => void;
    maxRetries: number;
    setMaxRetries: (retries: number) => void;

    isConnecting: boolean;
    isConnected: boolean;
    setIsConnected: (connected: boolean) => void;
    connectionStatus: string;
    errorMessage: string;
    setErrorMessage: (message: string) => void;
    waitingForSync: boolean;
    setWaitingForSync: (waiting: boolean) => void;

    showCancelSync: boolean;
    setShowCancelSync: (show: boolean) => void;

    droneData: DroneData | null;

    initializeComms: () => Promise<boolean>;
    cancelConnection: () => void;
}