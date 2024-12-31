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
    get_tile: (z: number, x: number, y: number, source: string, offline: boolean) => Promise<string>;
    get_tile_info: () => Promise<TileInfo>;
    clear_tile_cache: () => Promise<boolean>;
    get_pois: () => Promise<POI[]>;
    add_poi: (name: string, coords: [number, number]) => Promise<boolean>;
    remove_poi: (name: string) => Promise<boolean>;
    error_message: Signal<string>;
    tile_info_updated: Signal<TileInfo>;
    pois_updated: Signal<POI[]>;
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
        backend: Backend;
        backendLoaded: boolean;
        pyqtApi: Backend;
    }
}

export async function fetchBackend(): Promise<Backend> {
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