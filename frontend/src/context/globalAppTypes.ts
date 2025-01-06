import type { Map } from 'leaflet';
import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import type { DroneData, FrequencyLayer, POI, TileInfo } from '../types/global';
import type { MapSource } from '../utils/mapSources';

export interface GlobalAppState {
    // COMMS
    interfaceType: 'serial' | 'simulated';
    setInterfaceType: (val: 'serial' | 'simulated') => void;

    serialPorts: string[];
    loadSerialPorts: () => void;
    selectedPort: string;
    setSelectedPort: (val: string) => void;

    baudRate: number | null;
    setBaudRate: (val: number) => void;
    host: string;
    setHost: (val: string) => void;
    tcpPort: number | null;
    setTcpPort: (val: number | null) => void;
    ackTimeout: number;
    setAckTimeout: (val: number) => void;
    maxRetries: number;
    setMaxRetries: (val: number) => void;

    isConnecting: boolean;
    isConnected: boolean;
    setIsConnected: (val: boolean) => void;
    connectionStatus: string;
    errorMessage: string;
    setErrorMessage: (val: string) => void;
    waitingForSync: boolean;
    setWaitingForSync: (val: boolean) => void;
    showCancelSync: boolean;
    setShowCancelSync: (val: boolean) => void;
    droneData: DroneData | null;

    initializeComms: () => Promise<boolean>;
    cancelConnection: () => void;

    // MAP
    currentSource: MapSource;
    setCurrentSource: (src: MapSource) => void;
    mapSources: MapSource[];

    isOffline: boolean;
    setIsOffline: (val: boolean) => void;

    tileInfo: TileInfo | null;
    pois: POI[];
    loadPOIs: () => void;
    addPOI: (name: string, coords?: [number, number]) => Promise<boolean>;
    removePOI: (name: string) => Promise<boolean>;

    frequencyLayers: FrequencyLayer[];
    setFrequencyLayers: Dispatch<SetStateAction<FrequencyLayer[]>>;

    clearTileCache: () => Promise<boolean>;
    clearAllData: () => Promise<boolean>;

    isFetchingTiles: boolean;

    mapRef: MutableRefObject<Map | null>;
}
