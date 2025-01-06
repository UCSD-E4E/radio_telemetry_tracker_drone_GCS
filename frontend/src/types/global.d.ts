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
    last_update: number;
    ping_time: number;
    packet_loss: number;
    connection_quality: 'great' | 'good' | 'ok' | 'bad' | 'critical';
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

export interface DroneBackend {
    // Connection methods
    get_serial_ports: () => Promise<string[]>;
    initialize_comms: (config: CommsConfig) => Promise<boolean>;
    cancel_connection: () => void;
    disconnect: () => void;

    // Data update signals
    drone_data_updated: Signal<DroneData | { disconnected: true }>;
    ping_data_updated: Signal<PingData>;
    loc_est_data_updated: Signal<LocEstData>;

    // Status signals
    error_message: Signal<string>;
    connection_status: Signal<string>;
    sync_timeout: Signal<void>;

    // Tile methods
    get_tile: (z: number, x: number, y: number, source: string, options: TileOptions) => Promise<string>;
    get_tile_info: () => Promise<TileInfo>;
    clear_tile_cache: () => Promise<boolean>;

    // POI methods
    get_pois: () => Promise<POI[]>;
    add_poi: (name: string, coords: [number, number]) => Promise<boolean>;
    remove_poi: (name: string) => Promise<boolean>;
    rename_poi: (oldName: string, newName: string) => Promise<boolean>;

    // Data management methods
    update_drone_data: (data: DroneData) => Promise<boolean>;
    add_ping: (data: PingData) => Promise<boolean>;
    update_location_estimate: (data: LocEstData) => Promise<boolean>;
    clear_frequency_data: (frequency: number) => Promise<boolean>;
    clear_all_data: () => Promise<boolean>;

    // Logging
    log_message: (message: string) => void;
}

export {};
