import React, { useContext, useEffect, useState } from 'react';
import { MapContainer as LeafletMap, useMap, TileLayer } from 'react-leaflet';
import type { TileEvent, Map } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ZoomControl from './ZoomControl';
import DataLayers from './DataLayers';
import { MapContext } from '../../contexts/MapContext';

const DEFAULT_CENTER: [number, number] = [32.8801, -117.2340];
const DEFAULT_ZOOM = 13;

// Custom TileLayer that uses WebChannel
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
            await new Promise(resolve => {
                if (window.backendLoaded) {
                    resolve(true);
                } else {
                    window.addEventListener('backendLoaded', () => resolve(true), { once: true });
                }
            });
            setIsBackendReady(true);
        };

        initBackend();
    }, []);

    const eventHandlers = {
        tileloadstart: async (event: TileEvent) => {
            if (!isBackendReady) {
                console.log('Waiting for backend to be ready...');
                return;
            }

            const tile = event.tile as HTMLImageElement;
            const coords = event.coords;
            
            try {
                const tileData = await window.backend.get_tile(
                    coords.z,
                    coords.x,
                    coords.y,
                    source,
                    { offline: isOffline }
                );
                
                if (tileData) {
                    tile.src = `data:image/png;base64,${tileData}`;
                } else if (isOffline) {
                    onOfflineMiss();
                }
            } catch (err) {
                console.error('Error loading tile:', err);
            }
        }
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
    React.useEffect(() => {
        map.invalidateSize();
    }, [map]);
    return null;
};

const MapContainer: React.FC = () => {
    const { currentSource, isOffline, mapRef } = useContext(MapContext);
    const [tileError, setTileError] = useState<string | null>(null);

    // Clear error when source or mode changes
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
                    onOfflineMiss={() => setTileError('Some tiles are not available offline. Please cache them in online mode first.')}
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
