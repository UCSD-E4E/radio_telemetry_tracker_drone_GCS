import type { Map } from 'leaflet';
import type { RefObject, Dispatch, SetStateAction } from 'react';
import type { GpsData, LocEstData, PingData, POI, TileInfo } from '../types/global';
import type { MapSource } from '../utils/mapSources';

export enum GCSState {
    RADIO_CONFIG_INPUT = 'RADIO_CONFIG_INPUT',
    RADIO_CONFIG_WAITING = 'RADIO_CONFIG_WAITING',
    RADIO_CONFIG_TIMEOUT = 'RADIO_CONFIG_TIMEOUT',
    PING_FINDER_CONFIG_INPUT = 'PING_FINDER_CONFIG_INPUT',
    PING_FINDER_CONFIG_WAITING = 'PING_FINDER_CONFIG_WAITING',
    PING_FINDER_CONFIG_TIMEOUT = 'PING_FINDER_CONFIG_TIMEOUT',
    START_INPUT = 'START_INPUT',
    START_WAITING = 'START_WAITING',
    START_TIMEOUT = 'START_TIMEOUT',
    STOP_INPUT = 'STOP_INPUT',
    STOP_WAITING = 'STOP_WAITING',
    STOP_TIMEOUT = 'STOP_TIMEOUT'
}

export interface RadioConfigState {
    interface_type: 'serial' | 'simulated';
    serialPorts: string[];
    selectedPort: string;
    baudRate: number;
    host: string;
    tcpPort: number;
    ackTimeout: number;
    maxRetries: number;
}

export interface PingFinderConfigState {
    gain: number;
    samplingRate: number;
    centerFrequency: number;
    enableTestData: boolean;
    pingWidthMs: number;
    pingMinSnr: number;
    pingMaxLenMult: number;
    pingMinLenMult: number;
    targetFrequencies: number[];
}

export interface FrequencyLayer {
    frequency: number;
    pings: PingData[];
    location_estimate: LocEstData | null;
    visible_pings: boolean;
    visible_location_estimate: boolean;
}

export interface GlobalAppState {
    // State machine
    gcsState: GCSState;

    // Map Data
    isMapOffline: boolean;
    setIsMapOfflineUser: (val: boolean) => void;
    currentMapSource: MapSource;
    setCurrentMapSource: (src: MapSource) => void;
    mapSources: MapSource[];
    tileInfo: TileInfo | null;
    pois: POI[];
    frequencyLayers: FrequencyLayer[];
    setFrequencyLayers: Dispatch<SetStateAction<FrequencyLayer[]>>;
    mapRef: RefObject<Map | null>;
    loadPOIs: () => Promise<void>;
    addPOI: (name: string, coords: [number, number]) => Promise<boolean>;
    removePOI: (name: string) => Promise<boolean>;
    clearTileCache: () => Promise<boolean>;

    // Connection state
    connectionStatus: 1 | 0;
    connectionQuality: 5 | 4 | 3 | 2 | 1 | 0;
    pingTime: number;
    gpsFrequency: number;
    messageType: 'error' | 'success';
    message: string;
    messageVisible: boolean;
    setMessageVisible: (visible: boolean) => void;
    fatalError: string;

    // GPS data
    gpsData: GpsData | null;
    gpsDataUpdated: boolean;

    // Radio configuration
    radioConfig: RadioConfigState;

    setRadioConfig: (config: RadioConfigState) => void;
    loadSerialPorts: () => Promise<void>;
    sendRadioConfig: () => Promise<boolean>;
    cancelRadioConfig: () => void;

    // Ping finder configuration
    pingFinderConfig: PingFinderConfigState;
    setPingFinderConfig: (config: PingFinderConfigState) => void;
    sendPingFinderConfig: () => Promise<boolean>;
    cancelPingFinderConfig: () => void;

    // Start
    start: () => Promise<boolean>;
    cancelStart: () => void;

    // Stop
    stop: () => Promise<boolean>;
    cancelStop: () => void;

    // Disconnect
    disconnect: () => Promise<boolean>;
}
