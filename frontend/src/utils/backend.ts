export interface POI {
    name: string;
    coords: [number, number];
}

export interface TileInfo {
    total_tiles: number;
    total_size_mb: number;
}

export interface Backend {
    get_tile(_z: number, _x: number, _y: number): Promise<string>;
    get_tile_info(): Promise<TileInfo>;
    clear_tile_cache(): Promise<void>;
    get_pois(): Promise<POI[]>;
    add_poi(_name: string, _coords: [number, number]): Promise<void>;
    remove_poi(_name: string): Promise<void>;
    error_message: {
        connect(_callback: (_message: string) => void): void;
        disconnect(_callback: (_message: string) => void): void;
    };
    tile_info_updated: {
        connect(_callback: (_info: TileInfo) => void): void;
        disconnect(_callback: (_info: TileInfo) => void): void;
    };
    pois_updated: {
        connect(_callback: (_pois: POI[]) => void): void;
        disconnect(_callback: (_pois: POI[]) => void): void;
    };
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