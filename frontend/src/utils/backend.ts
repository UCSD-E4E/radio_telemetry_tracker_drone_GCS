export interface POI {
    name: string;
    coords: [number, number];
}

export interface TileInfo {
    total_tiles: number;
    total_size_mb: number;
}

export interface Signal<T> {
    connect(callback: (value: T) => void): void;
    disconnect(callback: (value: T) => void): void;
}

export interface Backend {
    get_tile: (z: number, x: number, y: number, source: string, options: { offline: boolean }) => Promise<string>;
    get_tile_info: () => Promise<TileInfo>;
    clear_tile_cache: () => Promise<boolean>;
    get_pois: () => Promise<POI[]>;
    add_poi: (name: string, coords: [number, number]) => Promise<boolean>;
    remove_poi: (name: string) => Promise<boolean>;
    error_message: Signal<string>;
    tile_info_updated: Signal<TileInfo>;
    pois_updated: Signal<POI[]>;
}

// Add new interfaces for the drone and signal data
export interface DroneData {
    lat: number;
    long: number;
    altitude: number;
    heading: number;
    lastUpdate: number;  // timestamp
}

export interface PingData {
    frequency: number;
    amplitude: number;
    lat: number;
    long: number;
    timestamp: number;
}

export interface LocEstData {
    frequency: number;
    lat: number;
    long: number;
    timestamp: number;
}

export interface FrequencyLayer {
    frequency: number;
    pings: PingData[];
    locationEstimate: LocEstData | null;
    visible: boolean;
}

// Extend the Backend interface with the new signal methods
export interface DroneBackend extends Backend {
    drone_data_updated: Signal<DroneData>;
    ping_data_updated: Signal<PingData>;
    loc_est_data_updated: Signal<LocEstData>;
    update_drone_data: (data: DroneData) => Promise<boolean>;
    add_ping: (data: PingData) => Promise<boolean>;
    update_location_estimate: (data: LocEstData) => Promise<boolean>;
    clear_frequency_data: (frequency: number) => Promise<boolean>;
    clear_all_data: () => Promise<boolean>;
}

declare global {
    interface Window {
        QWebChannel: new (
            _transport: unknown,
            _callback: (_channel: unknown) => void
        ) => void;
        qt: {
            webChannelTransport: unknown;
        };
        backend: DroneBackend;
        backendLoaded: boolean;
        pyqtApi: DroneBackend;
    }
}

export async function fetchBackend(): Promise<DroneBackend> {
    return new Promise((resolve) => {
        if (window.backend) {
            window.pyqtApi = window.backend;
            resolve(window.backend);
        } else {
            window.addEventListener('backendLoaded', () => {
                window.pyqtApi = window.backend;
                resolve(window.backend);
            });
        }
    });
} 