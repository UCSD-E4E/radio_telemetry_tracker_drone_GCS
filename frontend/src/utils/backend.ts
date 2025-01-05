import type { TileInfo, POI, DroneData, PingData, PingDataUpdate, LocEstData, LocEstDataUpdate } from '../types/global';

export interface Signal<T> {
    connect(callback: (value: T) => void): void;
    disconnect(callback: (value: T) => void): void;
}

export interface CommsConfiguration {
    interface_type: 'serial' | 'simulated';
    port?: string;
    baudrate?: number;
    host?: string;
    tcp_port?: number;
    server_mode?: boolean;
    ack_timeout: number;
    max_retries: number;
}

export interface DroneBackend {
    // Comms
    get_serial_ports(): Promise<string[]>;
    initialize_comms(config: CommsConfiguration): Promise<boolean>;
    cancel_connection(): Promise<void>;
    disconnect(): Promise<void>;
    connection_status: Signal<string>;
    sync_timeout: Signal<void>;
    error_message: Signal<string>;

    // Tiles
    get_tile(z: number, x: number, y: number, source: string, options: { offline: boolean }): Promise<string>;
    get_tile_info(): Promise<TileInfo>;
    tile_info_updated?: Signal<TileInfo>;
    clear_tile_cache(): Promise<boolean>;

    // POIs
    get_pois(): Promise<POI[]>;
    pois_updated?: Signal<POI[]>;
    add_poi(name: string, coords: [number, number]): Promise<boolean>;
    remove_poi(name: string): Promise<boolean>;
    rename_poi(oldName: string, newName: string): Promise<boolean>;

    // Drone data
    drone_data_updated?: Signal<DroneData>;
    ping_data_updated?: Signal<PingDataUpdate>;
    loc_est_data_updated?: Signal<LocEstDataUpdate>;

    update_drone_data(data: DroneData): Promise<boolean>;
    add_ping(data: PingData): Promise<boolean>;
    update_location_estimate(data: LocEstData): Promise<boolean>;
    clear_frequency_data(freq: number): Promise<boolean>;
    clear_all_data(): Promise<boolean>;
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
