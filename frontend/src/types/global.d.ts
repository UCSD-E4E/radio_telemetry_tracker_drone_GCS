import type { DroneBackend } from '../utils/backend';

declare global {
    interface Window {
        backend: DroneBackend;
        backendLoaded: boolean;
        _mapHandlers?: {
            tileInfo: (info: TileInfo) => void;
            pois: (pois: POI[]) => void;
        };
    }
}

export interface POI {
    name: string;
    coords: [number, number];
}

export interface TileInfo {
    total_tiles: number;
    total_size_mb: number;
}

export interface DroneData {
    lat: number;
    long: number;
    altitude: number;
    heading: number;
    lastUpdate: number; // ms
}

export interface PingData {
    frequency: number;
    amplitude: number;
    lat: number;
    long: number;
    timestamp: number;
}

export interface PingDataUpdate {
    frequency: number;
    cleared?: true;
    amplitude?: number;
    lat?: number;
    long?: number;
    timestamp?: number;
}

export interface LocEstData {
    frequency: number;
    lat: number;
    long: number;
    timestamp: number;
}

export interface LocEstDataUpdate {
    frequency: number;
    cleared?: true;
    lat?: number;
    long?: number;
    timestamp?: number;
}

export interface FrequencyLayer {
    frequency: number;
    pings: PingData[];
    locationEstimate: LocEstData | null;
    visible: boolean;
}

export {};
