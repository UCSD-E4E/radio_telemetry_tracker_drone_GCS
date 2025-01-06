import React, { useContext, useEffect, useState } from 'react';
import { MapContainer as LeafletMap, useMap, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Map } from 'leaflet';
import type { TileEvent } from 'leaflet';
import ZoomControl from './ZoomControl';
import DataLayers from './DataLayers';
import { GlobalAppContext } from '../../context/globalAppContextDef';

const DEFAULT_CENTER: [number, number] = [32.8801, -117.2340];
const DEFAULT_ZOOM = 13;

// A custom tile layer hooking into the backend
const CustomTileLayer: React.FC<{
    source: string;
    isOffline: boolean;
    attribution: string;
    maxZoom: number;
    minZoom: number;
    onOfflineMiss: () => void;
}> = ({ source, isOffline, attribution, maxZoom, minZoom, onOfflineMiss }) => {
    const [isBackendReady, setIsBackendReady] = useState(false);

    useEffect(() => {
        const initBackend = async () => {
            await new Promise<void>((resolve) => {
                if (window.backendLoaded) resolve();
                else window.addEventListener('backendLoaded', () => resolve(), { once: true });
            });
            setIsBackendReady(true);
        };
        initBackend();
    }, []);

    const eventHandlers = {
        tileloadstart: async (evt: TileEvent) => {
            if (!isBackendReady) return;
            const tile = evt.tile as HTMLImageElement;
            const coords = evt.coords;
            try {
                const tileData = await window.backend.get_tile(coords.z, coords.x, coords.y, source, {
                    offline: isOffline,
                });
                if (tileData) {
                    tile.src = `data:image/png;base64,${tileData}`;
                } else if (isOffline) {
                    onOfflineMiss();
                }
            } catch (err) {
                console.error('Error loading tile:', err);
            }
        },
    };

    return (
        <TileLayer
            url="about:blank"
            tileSize={256}
            attribution={attribution}
            maxZoom={maxZoom}
            minZoom={minZoom}
            eventHandlers={eventHandlers}
        />
    );
};

const FixMapSize: React.FC = () => {
    const map = useMap();
    useEffect(() => {
        map.invalidateSize();
    }, [map]);
    return null;
};

const MapContainer: React.FC = () => {
    const context = useContext(GlobalAppContext);
    if (!context) throw new Error('MapContainer must be in GlobalAppProvider');

    const { currentSource, isOffline, mapRef } = context;
    const [tileError, setTileError] = useState<string | null>(null);

    useEffect(() => {
        setTileError(null);
    }, [currentSource.id, isOffline]);

    const onMapCreated = (map: Map) => {
        mapRef.current = map;
    };

    return (
        <div className="h-full w-full relative">
            <LeafletMap
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                className="h-full w-full relative z-[1000]"
                zoomControl={false}
                attributionControl={false}
                ref={onMapCreated}
            >
                <CustomTileLayer
                    source={currentSource.id}
                    isOffline={isOffline}
                    attribution={currentSource.attribution}
                    maxZoom={currentSource.maxZoom}
                    minZoom={currentSource.minZoom}
                    onOfflineMiss={() =>
                        setTileError('Some tiles are not available offline. Please cache them in online mode first.')
                    }
                />
                <FixMapSize />
                <ZoomControl />
                <DataLayers />
            </LeafletMap>
            {tileError && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-[1001]">
                    {tileError}
                </div>
            )}
        </div>
    );
};

export default MapContainer;
