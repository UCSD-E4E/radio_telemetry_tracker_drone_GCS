import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { GlobalAppState } from './globalAppTypes';
import { GlobalAppContext } from './globalAppContextDef';
import { fetchBackend, type CommsConfiguration } from '../utils/backend';
import { useInternetStatus } from '../hooks/useInternetStatus';
import { MAP_SOURCES, OFFLINE_MODE_KEY } from '../utils/mapSources';
import type {
    DroneData,
    POI,
    TileInfo,
    FrequencyLayer,
    PingData,
    PingDataUpdate,
    LocEstData,
    LocEstDataUpdate
} from '../types/global';

const GlobalAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // COMMS state
    const [interfaceType, setInterfaceType] = useState<'serial' | 'simulated'>('serial');
    const [serialPorts, setSerialPorts] = useState<string[]>([]);
    const [selectedPort, setSelectedPort] = useState<string>('');
    const [baudRate, setBaudRate] = useState<number | null>(57600);
    const [host, setHost] = useState<string>('localhost');
    const [tcpPort, setTcpPort] = useState<number | null>(50000);
    const [ackTimeout, setAckTimeout] = useState<number>(2000);
    const [maxRetries, setMaxRetries] = useState<number>(5);

    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [showCancelSync, setShowCancelSync] = useState(false);
    const [waitingForSync, setWaitingForSync] = useState(false);
    const [droneData, setDroneData] = useState<DroneData | null>(null);

    // MAP state
    const [currentSource, setCurrentSource] = useState(MAP_SOURCES[0]);
    const [tileInfo, setTileInfo] = useState<TileInfo | null>(null);
    const [pois, setPois] = useState<POI[]>([]);
    const [frequencyLayers, setFrequencyLayers] = useState<FrequencyLayer[]>([]);
    const [activeFetches] = useState<number>(0);
    const isFetchingTiles = activeFetches > 0;

    // offline vs real
    const isOnline = useInternetStatus();
    const [isOffline, setOfflineState] = useState(() => {
        const saved = window.localStorage.getItem(OFFLINE_MODE_KEY);
        return saved === 'true';
    });
    const mapRef = useRef<import('leaflet').Map | null>(null);

    // ----- Comms: loadSerialPorts, initializeComms, cancelConnection, signals
    const loadSerialPorts = useCallback(async () => {
        if (!window.backend) return;
        try {
            const ports = await window.backend.get_serial_ports();
            setSerialPorts(ports);
            if (ports.length > 0 && !selectedPort) {
                setSelectedPort(ports[0]);
            }
        } catch (err) {
            console.error('Error loading serial ports:', err);
        }
    }, [selectedPort]);

    const initializeComms = async (): Promise<boolean> => {
        setIsConnecting(true);
        setConnectionStatus('Connecting...');
        setErrorMessage('');
        setWaitingForSync(true);
        setShowCancelSync(false);

        const backend = await fetchBackend();
        const commsConfig: CommsConfiguration = {
            interface_type: interfaceType,
            ack_timeout: ackTimeout / 1000,
            max_retries: maxRetries,
        };

        if (interfaceType === 'serial') {
            if (!selectedPort) {
                setErrorMessage('Please select a port');
                setIsConnecting(false);
                setWaitingForSync(false);
                return false;
            }
            if (!baudRate) {
                setErrorMessage('Please select a baud rate');
                setIsConnecting(false);
                setWaitingForSync(false);
                return false;
            }
            commsConfig.port = selectedPort;
            commsConfig.baudrate = baudRate;
        } else {
            if (!host) {
                setErrorMessage('Please enter a host');
                setIsConnecting(false);
                setWaitingForSync(false);
                return false;
            }
            if (!tcpPort) {
                setErrorMessage('Please enter a TCP port');
                setIsConnecting(false);
                setWaitingForSync(false);
                return false;
            }
            commsConfig.host = host;
            commsConfig.tcp_port = tcpPort;
        }

        try {
            const success = await backend.initialize_comms(commsConfig);
            if (!success) {
                setIsConnecting(false);
                setWaitingForSync(false);
                return false;
            }

            const totalTimeout = ackTimeout * maxRetries;
            setTimeout(() => {
                if (waitingForSync) setShowCancelSync(true);
            }, totalTimeout);

            return true;
        } catch (ex) {
            console.error('Failed to initialize comms:', ex);
            setErrorMessage('Failed to initialize communications');
            setIsConnecting(false);
            setWaitingForSync(false);
            return false;
        }
    };

    const cancelConnection = useCallback(async () => {
        const backend = await fetchBackend();
        await backend.cancel_connection();
        setIsConnected(false);
        setIsConnecting(false);
        setWaitingForSync(false);
        setErrorMessage('');
        setShowCancelSync(false);
    }, []);

    useEffect(() => {
        const setupSignals = async () => {
            const backend = await fetchBackend();
            backend.connection_status.connect((status: string) => {
                setConnectionStatus(status);
                if (status === 'Drone connected successfully') {
                    setIsConnected(true);
                    setIsConnecting(false);
                    setWaitingForSync(false);
                    setShowCancelSync(false);
                }
            });
            backend.sync_timeout.connect(() => setShowCancelSync(true));
            backend.error_message.connect((msg: string) => setErrorMessage(msg));
            backend.drone_data_updated.connect((data: DroneData | { disconnected: true }) => {
                if ('disconnected' in data) {
                    setDroneData(null);
                } else {
                    setDroneData(data);
                }
            });
        };
        setupSignals();
    }, []);

    // ----- Map: offline mode, tile/POIs, freq layers
    const setIsOffline = (val: boolean) => {
        setOfflineState(val);
        window.localStorage.setItem(OFFLINE_MODE_KEY, val.toString());
    };

    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        let subscribed = true;

        const initData = async () => {
            if (!window.backend) {
                if (subscribed) setTimeout(initData, 1000);
                return;
            }
            try {
                const info = await window.backend.get_tile_info();
                if (subscribed) {
                    setTileInfo(info || { total_tiles: 0, total_size_mb: 0 });
                }
                const loadedPois = await window.backend.get_pois();
                if (subscribed && loadedPois) {
                    setPois(loadedPois);
                }

                if (window.backend.tile_info_updated) {
                    window.backend.tile_info_updated.connect((ti: TileInfo) => {
                        if (subscribed) setTileInfo(ti);
                    });
                }
                if (window.backend.pois_updated) {
                    window.backend.pois_updated.connect((updatedPois: POI[]) => {
                        if (subscribed) setPois(updatedPois);
                    });
                }
            } catch (err) {
                console.error('Error init tile or POI:', err);
            } finally {
                if (subscribed) setIsLoading(false);
            }
        };

        initData();

        return () => {
            subscribed = false;
            if (window.backend) {
                if (window.backend.tile_info_updated) {
                    window.backend.tile_info_updated.disconnect();
                }
                if (window.backend.pois_updated) {
                    window.backend.pois_updated.disconnect();
                }
            }
        };
    }, []);

    const loadPOIs = useCallback(async () => {
        if (!window.backend) return;
        try {
            const data = await window.backend.get_pois();
            if (data) setPois(data);
        } catch (err) {
            console.error('Error loading POIs:', err);
        }
    }, []);

    const addPOI = useCallback(async (name: string, coords?: [number, number]) => {
        if (!window.backend) return false;
        try {
            const c = coords || [0, 0];
            const ok = await window.backend.add_poi(name, c);
            return ok;
        } catch (err) {
            console.error('Error adding POI:', err);
            return false;
        }
    }, []);

    const removePOI = useCallback(async (name: string) => {
        if (!window.backend) return false;
        try {
            return await window.backend.remove_poi(name);
        } catch (err) {
            console.error('Error removing POI:', err);
            return false;
        }
    }, []);

    const clearTileCache = useCallback(async () => {
        if (!window.backend) return false;
        try {
            return await window.backend.clear_tile_cache();
        } catch (err) {
            console.error('Error clearing tile cache:', err);
            return false;
        }
    }, []);

    const clearAllData = useCallback(async () => {
        if (!window.backend) return false;
        try {
            const ok = await window.backend.clear_all_data();
            if (ok) {
                setFrequencyLayers([]);
            }
            return ok;
        } catch (err) {
            console.error('Error clearing all data:', err);
            return false;
        }
    }, []);

    // freq layer signals
    useEffect(() => {
        if (!window.backend) return;

        const handlePingDataUpdated = (data: PingDataUpdate) => {
            if (data.cleared) {
                setFrequencyLayers((prev) => prev.filter((l) => l.frequency !== data.frequency));
            } else {
                const freq = data.frequency;
                setFrequencyLayers((prev) => {
                    const existing = prev.find((f) => f.frequency === freq);
                    if (!existing) {
                        return [...prev, {
                            frequency: freq,
                            pings: [data as PingData],
                            locationEstimate: null,
                            visible: true,
                        }];
                    } else {
                        return prev.map((layer) => {
                            if (layer.frequency === freq) {
                                return { ...layer, pings: [...layer.pings, data as PingData] };
                            }
                            return layer;
                        });
                    }
                });
            }
        };

        const handleLocEstDataUpdated = (data: LocEstDataUpdate) => {
            if (data.cleared) {
                setFrequencyLayers((prev) => prev.filter((l) => l.frequency !== data.frequency));
            } else {
                const freq = data.frequency;
                setFrequencyLayers((prev) => {
                    const existing = prev.find((f) => f.frequency === freq);
                    if (!existing) {
                        return [...prev, {
                            frequency: freq,
                            pings: [],
                            locationEstimate: data as LocEstData,
                            visible: true,
                        }];
                    } else {
                        return prev.map((layer) => {
                            if (layer.frequency === freq) {
                                return { ...layer, locationEstimate: data as LocEstData };
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

    // check real offline vs forced offline
    useEffect(() => {
        if (!isOnline && !isOffline) {
            console.warn('User is truly offline, but forced offline mode is off');
        }
    }, [isOnline, isOffline]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                Loading initial data...
            </div>
        );
    }

    const value: GlobalAppState = {
        // Comms
        interfaceType,
        setInterfaceType,
        serialPorts,
        loadSerialPorts,
        selectedPort,
        setSelectedPort,
        baudRate,
        setBaudRate,
        host,
        setHost,
        tcpPort,
        setTcpPort,
        ackTimeout,
        setAckTimeout,
        maxRetries,
        setMaxRetries,
        isConnecting,
        isConnected,
        setIsConnected,
        connectionStatus,
        errorMessage,
        setErrorMessage,
        waitingForSync,
        setWaitingForSync,
        showCancelSync,
        setShowCancelSync,
        droneData,
        initializeComms,
        cancelConnection,

        // Map
        currentSource,
        setCurrentSource,
        mapSources: MAP_SOURCES,
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
        mapRef,
    };

    return (
        <GlobalAppContext.Provider value={value}>
            {children}
        </GlobalAppContext.Provider>
    );
};

export default GlobalAppProvider;
