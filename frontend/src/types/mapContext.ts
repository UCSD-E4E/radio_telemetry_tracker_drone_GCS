import { createContext } from 'react';
import type { Dispatch, SetStateAction, MutableRefObject } from 'react';
import type { Map } from 'leaflet';
import type { POI, TileInfo, FrequencyLayer } from './global';
import type { MapSource } from '../utils/mapSources';

export interface MapContextValue {
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

    // Map control
    mapCenter: [number, number];
    setMapCenter: (center: [number, number]) => void;
    mapRef: MutableRefObject<Map | null>;
}

export const MapContext = createContext<MapContextValue>({} as MapContextValue); 