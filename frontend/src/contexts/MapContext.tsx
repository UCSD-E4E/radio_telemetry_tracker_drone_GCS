import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContext, MapContextValue } from '../types/mapContext';
import { MAP_SOURCES, OFFLINE_MODE_KEY } from '../utils/mapSources';
import { useInternetStatus } from '../hooks/useInternetStatus';
import type { POI, TileInfo, FrequencyLayer, PingDataUpdate, PingData, LocEstData, LocEstDataUpdate } from '../types/global';
import LoadingSpinner from '../components/common/LoadingSpinner';

export { MapContext } from '../types/mapContext';
export const MapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [currentSource, setCurrentSource] = useState(MAP_SOURCES[0]);
    const [tileInfo, setTileInfo] = useState<TileInfo | null>(null);
    const [pois, setPois] = useState<POI[]>([]);
    const [frequencyLayers, setFrequencyLayers] = useState<FrequencyLayer[]>([]);

    // offline mode
    const [isOffline, setIsOfflineState] = useState<boolean>(() => {
        const saved = window.localStorage.getItem(OFFLINE_MODE_KEY);
        return saved === 'true';
    });

    const mapSources = MAP_SOURCES;
    // In original code, you had an `activeFetches` for tile fetches. If you want it:
    const [activeFetches] = useState<number>(0);
    const isFetchingTiles = activeFetches > 0;

    // Real network status, separate from user-chosen offline mode
    const isOnline = useInternetStatus();

    // Save user-chosen offline mode
    const setIsOffline = (val: boolean) => {
        setIsOfflineState(val);
        window.localStorage.setItem(OFFLINE_MODE_KEY, val.toString());
    };

    // Create a ref to store handlers
    const handlersRef = useRef<{
        tileInfo: ((info: TileInfo) => void) | null;
        pois: ((pois: POI[]) => void) | null;
    }>({
        tileInfo: null,
        pois: null
    });

    // Load tile info + POIs on mount
    useEffect(() => {
        let isSubscribed = true;

        const initData = async () => {
            if (!window.backend) {
                if (isSubscribed) {
                    setTimeout(initData, 1000);
                }
                return;
            }

            try {
                const info = await window.backend.get_tile_info();
                if (isSubscribed) {
                    setTileInfo(info || { total_tiles: 0, total_size_mb: 0 });
                }

                const loadedPois = await window.backend.get_pois();
                if (isSubscribed && loadedPois) {
                    setPois(loadedPois);
                }

                // Only set up listeners after we confirm backend exists
                const handleTileInfoUpdated = (info: TileInfo) => {
                    if (isSubscribed) {
                        setTileInfo(info);
                    }
                };

                const handlePoisUpdated = (updatedPois: POI[]) => {
                    if (isSubscribed) {
                        setPois(updatedPois);
                    }
                };

                if (window.backend.tile_info_updated) {
                    window.backend.tile_info_updated.connect(handleTileInfoUpdated);
                    handlersRef.current.tileInfo = handleTileInfoUpdated;
                }

                if (window.backend.pois_updated) {
                    window.backend.pois_updated.connect(handlePoisUpdated);
                    handlersRef.current.pois = handlePoisUpdated;
                }

                if (isSubscribed) {
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('Error initializing map data:', err);
                if (isSubscribed) {
                    setIsLoading(false);
                }
            }
        };

        initData();

        return () => {
            isSubscribed = false;
            // Only try to disconnect if backend exists
            if (window.backend) {
                if (window.backend.tile_info_updated && handlersRef.current.tileInfo) {
                    window.backend.tile_info_updated.disconnect(handlersRef.current.tileInfo);
                }
                if (window.backend.pois_updated && handlersRef.current.pois) {
                    window.backend.pois_updated.disconnect(handlersRef.current.pois);
                }
                handlersRef.current = {
                    tileInfo: null,
                    pois: null
                };
            }
        };
    }, []);

    // Load POIs on demand
    const loadPOIs = useCallback(async () => {
        if (!window.backend) return;
        try {
            const list = await window.backend.get_pois();
            if (list) setPois(list);
        } catch (err) {
            console.error('Error loading POIs:', err);
        }
    }, []);

    // Add POI
    const addPOI = useCallback(async (name: string, coords?: [number, number]) => {
        if (!window.backend) return false;
        try {
            const usedCoords = coords || [0, 0];
            const success = await window.backend.add_poi(name, usedCoords);
            return success;
        } catch (err) {
            console.error('Error adding POI:', err);
            return false;
        }
    }, []);

    // Remove POI
    const removePOI = useCallback(async (name: string) => {
        if (!window.backend) return false;
        try {
            const success = await window.backend.remove_poi(name);
            return success;
        } catch (err) {
            console.error('Error removing POI:', err);
            return false;
        }
    }, []);

    // Clear tile cache
    const clearTileCache = useCallback(async () => {
        if (!window.backend) return false;
        try {
            const success = await window.backend.clear_tile_cache();
            return success;
        } catch (err) {
            console.error('Error clearing tile cache:', err);
            return false;
        }
    }, []);

    // Clear all data (pings, locEst, etc.)
    const clearAllData = useCallback(async () => {
        if (!window.backend) return false;
        try {
            const success = await window.backend.clear_all_data();
            if (success) {
                // Reset local freq layers
                setFrequencyLayers([]);
            }
            return success;
        } catch (err) {
            console.error('Error clearing all data:', err);
            return false;
        }
    }, []);

    /**
     * Listen for ping_data_updated and loc_est_data_updated
     * and incorporate them into frequencyLayers
     */
    useEffect(() => {
        if (!window.backend) return;

        /**
         * Handle pings: can be PingData or { frequency, cleared: true }
         */
        const handlePingDataUpdated = (data: PingDataUpdate) => {
            if (data.cleared) {
                // remove the layer
                setFrequencyLayers((prev) => prev.filter((l) => l.frequency !== data.frequency));
            } else {
                // data is a single ping
                const pingFreq = data.frequency;
                setFrequencyLayers((prev) => {
                    const existing = prev.find((l) => l.frequency === pingFreq);
                    if (!existing) {
                        return [
                            ...prev,
                            {
                                frequency: pingFreq,
                                pings: [data as PingData],
                                locationEstimate: null,
                                visible: true,
                            },
                        ];
                    } else {
                        return prev.map((layer) => {
                            if (layer.frequency === pingFreq) {
                                return {
                                    ...layer,
                                    pings: [...layer.pings, data as PingData],
                                };
                            }
                            return layer;
                        });
                    }
                });
            }
        };

        /**
         * Handle location estimates: can be LocEstData or { frequency, cleared: true }
         */
        const handleLocEstDataUpdated = (data: LocEstDataUpdate) => {
            if (data.cleared) {
                // remove layer
                setFrequencyLayers((prev) => prev.filter((l) => l.frequency !== data.frequency));
            } else {
                const freq = data.frequency;
                setFrequencyLayers((prev) => {
                    const existing = prev.find((l) => l.frequency === freq);
                    if (!existing) {
                        return [
                            ...prev,
                            {
                                frequency: freq,
                                pings: [],
                                locationEstimate: data as LocEstData,
                                visible: true,
                            },
                        ];
                    } else {
                        return prev.map((layer) => {
                            if (layer.frequency === freq) {
                                return {
                                    ...layer,
                                    locationEstimate: data as LocEstData,
                                };
                            }
                            return layer;
                        });
                    }
                });
            }
        };

        window.backend.ping_data_updated?.connect(handlePingDataUpdated);
        window.backend.loc_est_data_updated?.connect(handleLocEstDataUpdated);

        return () => {
            window.backend.ping_data_updated?.disconnect(handlePingDataUpdated);
            window.backend.loc_est_data_updated?.disconnect(handleLocEstDataUpdated);
        };
    }, []);

    // Example check: real offline vs user-chosen offline
    useEffect(() => {
        if (!isOnline && !isOffline) {
            console.warn(
                'User is offline in reality, but not in offline mode. Possibly no actual internet connection.'
            );
        }
    }, [isOnline, isOffline]);

    const value: MapContextValue = {
        currentSource,
        setCurrentSource,
        mapSources,
        isOffline,
        setIsOffline,
        tileInfo,
        pois,
        loadPOIs,
        addPOI,
        removePOI,
        frequencyLayers,
        setFrequencyLayers,
        clearTileCache,
        clearAllData,
        isFetchingTiles,
        mapCenter: [0, 0],
        setMapCenter: () => {},
        mapRef: useRef(null),
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <LoadingSpinner text="Initializing map..." />
            </div>
        );
    }

    return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};
