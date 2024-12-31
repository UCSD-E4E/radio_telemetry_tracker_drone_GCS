/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { useEffect, useState } from 'react';
import { MapContainer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TileInfo, POI, Backend } from '../utils/backend';

declare global {
    interface Window {
        backend: Backend;
    }
}

interface MapProps {
    center: [number, number];
    zoom: number;
}

// Control Panel Component
const ControlPanel = ({
    tileInfo,
    tileLayer,
    map,
    pois,
    setPois }: {
        tileInfo: TileInfo | null;
        tileLayer: L.TileLayer | null;
        map: L.Map | null;
        pois: POI[];
        setPois: (pois: POI[]) => void;
    }) => {
    const [isClearing, setIsClearing] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [isExpanded, setIsExpanded] = useState(true);
    const [coordinates, setCoordinates] = useState('');
    const [poiName, setPoiName] = useState('');
    const [isAddingPOI, setIsAddingPOI] = useState(false);

    const showMessage = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleClearCache = async () => {
        if (!window.backend) return;
        try {
            setIsClearing(true);
            await window.backend.clear_tile_cache();
            tileLayer?.redraw();
            showMessage('Map cache cleared successfully', 'success');
        } catch (error) {
            console.error('Failed to clear map cache:', error);
            showMessage('Failed to clear map cache', 'error');
        } finally {
            setIsClearing(false);
        }
    };

    const handleGoToCoordinates = () => {
        if (!map) return;
        try {
            const [lat, lng] = coordinates.split(',').map(coord => parseFloat(coord.trim()));
            if (isNaN(lat) || isNaN(lng)) {
                showMessage('Invalid coordinates format. Use "latitude, longitude"', 'error');
                return;
            }
            map.setView([lat, lng], map.getZoom());
            showMessage('Map centered on coordinates', 'success');
        } catch {
            showMessage('Invalid coordinates format', 'error');
        }
    };

    const handleAddPOI = async () => {
        if (!map || !window.backend || !poiName.trim()) return;
        try {
            setIsAddingPOI(true);
            const center = map.getCenter();
            await window.backend.add_poi(poiName.trim(), [center.lat, center.lng]);
            const updatedPois = await window.backend.get_pois();
            setPois(updatedPois);
            setPoiName('');
            showMessage(`Added POI: ${poiName}`, 'success');
        } catch (error) {
            console.error('Failed to add POI:', error);
            showMessage('Failed to add POI', 'error');
        } finally {
            setIsAddingPOI(false);
        }
    };

    const handleRemovePOI = async (name: string) => {
        if (!window.backend) return;
        try {
            await window.backend.remove_poi(name);
            const updatedPois = await window.backend.get_pois();
            setPois(updatedPois);
            showMessage(`Removed POI: ${name}`, 'success');
        } catch (error) {
            console.error('Failed to remove POI:', error);
            showMessage('Failed to remove POI', 'error');
        }
    };

    const goToPOI = (coords: [number, number]) => {
        if (!map) return;
        map.setView(coords, map.getZoom());
    };

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minWidth: '280px',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                padding: '4px'
            }} onClick={() => setIsExpanded(!isExpanded)}>
                <h3 style={{
                    margin: 0,
                    fontSize: '16px',
                    color: '#2c3e50',
                    userSelect: 'none',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    🗺️ <span>Map Controls</span> <span style={{ fontSize: '12px', color: '#7f8c8d' }}>{isExpanded ? '▼' : '▶'}</span>
                </h3>
            </div>

            {isExpanded && (
                <>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        fontSize: '14px'
                    }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="text"
                                placeholder="lat, lng (e.g. 32.88, -117.23)"
                                value={coordinates}
                                onChange={(e) => setCoordinates(e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            />
                            <button
                                onClick={handleGoToCoordinates}
                                style={{
                                    padding: '8px 16px',
                                    background: '#3498db',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Go
                            </button>
                        </div>

                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center'
                        }}>
                            <input
                                type="text"
                                placeholder="Add current location as POI"
                                value={poiName}
                                onChange={(e) => setPoiName(e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            />
                            <button
                                onClick={handleAddPOI}
                                disabled={isAddingPOI || !poiName.trim()}
                                style={{
                                    padding: '8px 16px',
                                    background: isAddingPOI ? '#bdc3c7' : '#2ecc71',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: isAddingPOI ? 'wait' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    transition: 'all 0.2s ease',
                                    opacity: (!poiName.trim() || isAddingPOI) ? 0.7 : 1
                                }}
                            >
                                {isAddingPOI ? 'Adding...' : '📍 Add'}
                            </button>
                        </div>

                        {pois.length > 0 && (
                            <div style={{
                                background: '#f8f9fa',
                                borderRadius: '8px',
                                padding: '8px',
                                maxHeight: '200px',
                                overflowY: 'auto'
                            }}>
                                {pois.map((poi) => (
                                    <div 
                                        key={poi.name} 
                                        style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            padding: '8px',
                                            borderRadius: '6px',
                                            transition: 'all 0.2s ease',
                                            background: '#f8f9fa'
                                        }}
                                    >
                                        <span 
                                            onClick={() => goToPOI(poi.coords)} 
                                            style={{ 
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                color: '#2c3e50'
                                            }}
                                        >
                                            📍 {poi.name}
                                        </span>
                                        <button 
                                            onClick={() => handleRemovePOI(poi.name)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#e74c3c',
                                                cursor: 'pointer',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={handleClearCache}
                            disabled={isClearing}
                            title="Clear all cached map tiles"
                            style={{
                                padding: '8px 16px',
                                background: isClearing ? '#bdc3c7' : '#e74c3c',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: isClearing ? 'wait' : 'pointer',
                                fontSize: '14px',
                                fontWeight: 500,
                                transition: 'all 0.2s ease',
                                opacity: isClearing ? 0.7 : 0.9
                            }}
                        >
                            {isClearing ? 'Clearing...' : '🗑️ Clear Cache'}
                        </button>
                    </div>

                    {message && (
                        <div style={{
                            padding: '10px',
                            borderRadius: '8px',
                            background: message.type === 'success' ? '#e8f5e9' : '#ffebee',
                            color: message.type === 'success' ? '#2e7d32' : '#c62828',
                            fontSize: '14px',
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}>
                            {message.type === 'success' ? '✅' : '❌'} {message.text}
                        </div>
                    )}

                    {tileInfo && (
                        <div style={{
                            fontSize: '13px',
                            color: '#7f8c8d',
                            padding: '8px',
                            background: '#f8f9fa',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            📦 <span>{tileInfo.total_tiles} tiles ({tileInfo.total_size_mb.toFixed(1)} MB)</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// Helper component to initialize map
const MapInitializer = () => {
    const map = useMap();
    const [tileInfo, setTileInfo] = useState<TileInfo | null>(null);
    const [tileLayer, setTileLayer] = useState<L.TileLayer | null>(null);
    const [backendReady, setBackendReady] = useState(false);
    const [pois, setPois] = useState<POI[]>([]);

    useEffect(() => {
        const checkBackend = async () => {
            try {
                if (!window.backend) {
                    console.debug('Backend not ready, retrying...');
                    setTimeout(checkBackend, 1000);
                    return;
                }

                try {
                    const info = await window.backend.get_tile_info();
                    // Load initial POIs
                    const initialPois = await window.backend.get_pois();
                    console.log('Initial POIs loaded:', initialPois);
                    setPois(initialPois);

                    // Listen for POI updates
                    window.backend.pois_updated.connect((updatedPois) => {
                        console.log('POIs updated:', updatedPois);
                        setPois(updatedPois);
                    });

                    setBackendReady(true);
                    setTileInfo(info || { total_tiles: 0, total_size_mb: 0 });
                } catch (error) {
                    console.error('Error initializing:', error);
                    setTileInfo({ total_tiles: 0, total_size_mb: 0 });
                }
            } catch (error) {
                console.error('Backend not ready:', error);
                setTimeout(checkBackend, 1000);
            }
        };

        checkBackend();

        return () => {
            if (window.backend) {
                window.backend.pois_updated.disconnect(setPois);
            }
        };
    }, []);

    useEffect(() => {
        if (map && backendReady && window.backend) {
            console.log('Backend ready, initializing map...');

            // Custom tile provider that uses the PyQt bridge
            class CustomTileLayer extends L.TileLayer {
                constructor(options: L.TileLayerOptions) {
                    super('', options);
                }

                createTile(coords: L.Coords, done: L.DoneCallback): HTMLImageElement {
                    const img = document.createElement('img');
                    img.setAttribute('role', 'presentation');

                    // Request tile through PyQt bridge
                    if (window.backend) {
                        console.debug(`Requesting tile through bridge: z=${coords.z}, x=${coords.x}, y=${coords.y}`);
                        window.backend.get_tile(coords.z, coords.x, coords.y)
                            .then((data: string) => {
                                if (data) {
                                    img.src = `data:image/png;base64,${data}`;
                                    done(undefined, img);
                                } else {
                                    console.error('Empty tile data received');
                                    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                                    done(new Error('Empty tile data'), img);
                                }
                            })
                            .catch((error: Error) => {
                                console.error('Error loading tile:', error);
                                img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                                done(error, img);
                            });
                    } else {
                        console.error('Backend not available');
                        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                        done(new Error('Backend not available'), img);
                    }

                    return img;
                }
            };

            console.debug('Creating custom tile layer...');

            const newTileLayer = new CustomTileLayer({
                maxZoom: 19,
                minZoom: 1,
                tileSize: 256,
                keepBuffer: 2,
                updateWhenIdle: true,
                updateWhenZooming: false,
                className: 'map-tiles',
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            });

            setTileLayer(newTileLayer);

            // Add tile info listener
            if (window.backend) {
                window.backend.tile_info_updated.connect((info: TileInfo) => {
                    setTileInfo(info);
                });

                // Get initial tile info
                window.backend.get_tile_info().then(setTileInfo);
            }

            newTileLayer.on('loading', () => {
                console.debug('Tile layer loading...');
            });

            newTileLayer.on('load', () => {
                console.debug('Tile layer loaded');
            });

            newTileLayer.on('tileloadstart', (event: { coords: L.Coords }) => {
                const { x, y, z } = event.coords;
                console.debug(`Loading tile: z=${z}, x=${x}, y=${y}`);
            });

            newTileLayer.on('tileload', (event: { coords: L.Coords }) => {
                const { x, y, z } = event.coords;
                console.debug(`Loaded tile: z=${z}, x=${x}, y=${y}`);
            });

            newTileLayer.on('tileerror', (event: { coords: L.Coords }) => {
                const { x, y, z } = event.coords;
                console.error(`Tile error at z=${z}, x=${x}, y=${y}`);
            });

            newTileLayer.addTo(map);

            map.invalidateSize();
        }
    }, [map, backendReady]);

    return (
        <ControlPanel
            tileInfo={tileInfo}
            tileLayer={tileLayer}
            map={map}
            pois={pois}
            setPois={setPois}
        />
    );
};

const Map = ({ center, zoom }: MapProps) => {
    return (
        <div style={{
            height: '100%',
            width: '100%',
            position: 'relative'
        }}>
            <MapContainer
                center={center}
                zoom={zoom}
                style={{
                    height: '100%',
                    width: '100%',
                    borderRadius: '12px',
                    overflow: 'hidden'
                }}
                scrollWheelZoom={true}
                preferCanvas={true}
            >
                <MapInitializer />
            </MapContainer>
        </div>
    );
};

export default Map; 