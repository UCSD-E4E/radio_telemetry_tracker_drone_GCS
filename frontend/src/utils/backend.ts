import type { DroneData, PingData, LocEstData, POI, TileInfo } from '../types/global';

export interface Signal<T> {
    connect: (callback: (data: T) => void) => void;
    disconnect: (callback?: (data: T) => void) => void;
}

export interface CommsConfig {
    interface_type: 'serial' | 'simulated';
    port?: string;
    baudrate?: number;
    host?: string;
    tcp_port?: number;
    server_mode?: boolean;
    ack_timeout: number;
    max_retries: number;
}

export type CommsConfiguration = CommsConfig;

export interface TileOptions {
    offline: boolean;
}

export interface DroneBackend {
    // Connection
    get_serial_ports(): Promise<string[]>;
    initialize_comms(config: CommsConfig): Promise<boolean>;
    cancel_connection(): void;
    disconnect(): void;

    // Data signals
    drone_data_updated: Signal<DroneData | { disconnected: true }>;
    ping_data_updated: Signal<PingData>;
    loc_est_data_updated: Signal<LocEstData>;

    // Status signals
    error_message: Signal<string>;
    connection_status: Signal<string>;
    sync_timeout: Signal<void>;

    // Tiles
    get_tile(z: number, x: number, y: number, source: string, options: TileOptions): Promise<string>;
    get_tile_info(): Promise<TileInfo>;
    clear_tile_cache(): Promise<boolean>;
    tile_info_updated?: Signal<TileInfo>;

    // POIs
    get_pois(): Promise<POI[]>;
    add_poi(name: string, coords: [number, number]): Promise<boolean>;
    remove_poi(name: string): Promise<boolean>;
    rename_poi(oldName: string, newName: string): Promise<boolean>;
    pois_updated?: Signal<POI[]>;

    // Data
    update_drone_data(data: DroneData): Promise<boolean>;
    add_ping(data: PingData): Promise<boolean>;
    update_location_estimate(data: LocEstData): Promise<boolean>;
    clear_frequency_data(freq: number): Promise<boolean>;
    clear_all_data(): Promise<boolean>;

    // Logging
    log_message(msg: string): void;
}

declare global {
    interface Window {
        backend: DroneBackend;
        backendLoaded: boolean;
    }
}

export async function fetchBackend(): Promise<DroneBackend> {
    return new Promise((resolve) => {
        if (window.backend) {
            resolve(window.backend);
        } else {
            window.addEventListener('backendLoaded', () => {
                resolve(window.backend);
            });
        }
    });
}
