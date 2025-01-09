import type {
    GpsData,
    PingData,
    LocEstData,
    POI,
    TileInfo,
    RadioConfig,
    PingFinderConfig,
    TileOptions} from '../types/global';

export interface Signal<T> {
    connect: (callback: (data: T) => void) => void;
    disconnect: (callback?: (data: T) => void) => void;
}

export interface DroneBackend {
    // Connection
    get_serial_ports(): Promise<string[]>;
    initialize_comms(config: RadioConfig): Promise<boolean>;
    cancel_connection(): void;
    disconnect(): void;

    // Data signals
    gps_data_updated: Signal<GpsData | { disconnected: true }>;
    ping_data_updated: Signal<PingData | { frequency: number; cleared: true }>;
    loc_est_data_updated: Signal<LocEstData | { frequency: number; cleared: true }>;

    // Sync
    sync_success: Signal<string>;
    sync_failure: Signal<string>;
    sync_timeout: Signal<void>;

    // Config   
    config_success: Signal<string>;
    config_failure: Signal<string>;
    config_timeout: Signal<void>;

    // Start

    start_success: Signal<string>;
    start_failure: Signal<string>;
    start_timeout: Signal<void>;

    // Stop
    stop_success: Signal<string>;
    stop_failure: Signal<string>;
    stop_timeout: Signal<void>;

    // Disconnect
    disconnect_success: Signal<string>;
    disconnect_failure: Signal<string>;

    // Fatal error
    fatal_error: Signal<string>;

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

    // Config and Control
    send_config_request(config: PingFinderConfig): Promise<boolean>;
    cancel_config_request(): Promise<boolean>;
    send_start_request(): Promise<boolean>;
    cancel_start_request(): Promise<boolean>;
    send_stop_request(): Promise<boolean>;
    cancel_stop_request(): Promise<boolean>;

    // Data Management
    clear_frequency_data(freq: number): Promise<boolean>;
    clear_all_frequency_data(): Promise<boolean>;
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
