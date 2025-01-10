import { useCallback, useEffect, useRef, useState } from 'react';
import { FrequencyLayer, GCSState, GlobalAppState, PingFinderConfigState, RadioConfigState } from './globalAppTypes';
import { GpsData, PingFinderConfig, POI, RadioConfig } from '../types/global';
import { MAP_SOURCES, MapSource } from '../utils/mapSources';
import { useInternetStatus } from '../hooks/useInternetStatus';
import { OFFLINE_MODE_KEY } from '../utils/mapSources';
import { TileInfo } from '../types/global';
import { GlobalAppContext } from './globalAppContextDef';
import { Map } from 'leaflet';
import { fetchBackend } from '../utils/backend';

const GlobalAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // State declarations
    const [gcsState, setGcsState] = useState<GCSState>(GCSState.RADIO_CONFIG_INPUT);

    const isOnline = useInternetStatus();
    const [isMapOfflinePreference, setIsMapOfflinePreference] = useState<boolean>(() => {
        const saved = window.localStorage.getItem(OFFLINE_MODE_KEY);
        return saved === 'true';
    });

    const isMapOffline = !isOnline || isMapOfflinePreference;

    const setIsMapOfflineUser = (val: boolean) => {
        setIsMapOfflinePreference(val);
        window.localStorage.setItem(OFFLINE_MODE_KEY, val.toString());
    };

    const [currentMapSource, setCurrentMapSource] = useState<MapSource>(MAP_SOURCES[0]);
    const [tileInfo, setTileInfo] = useState<TileInfo | null>(null);
    const [pois, setPois] = useState<POI[]>([]);
    const [frequencyLayers, setFrequencyLayers] = useState<FrequencyLayer[]>([]);
    const mapRef = useRef<Map | null>(null);

    const loadPOIs = useCallback(async () => {
        if (!window.backend) return;
        try {
            const data = await window.backend.get_pois();
            setPois(data);
        } catch (err) {
            console.error('Error loading POIs:', err);
        }
    }, []);

    const addPOI = useCallback(async (name: string, coords: [number, number]) => {
        if (!window.backend) return false;
        try {
            return await window.backend.add_poi(name, coords);
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

    const [connectionStatus, setConnectionStatus] = useState<1 | 0>(0);
    const [connectionQuality, setConnectionQuality] = useState<5 | 4 | 3 | 2 | 1 | 0>(0);
    const [pingTime, setPingTime] = useState<number>(0);
    const [gpsFrequency, setGpsFrequency] = useState<number>(0);
    const [messageType, setMessageType] = useState<'error' | 'success'>('error');
    const [message, setMessage] = useState<string>('');
    const [messageVisible, setMessageVisible] = useState<boolean>(false);
    const [fatalError, setFatalError] = useState<string>('');

    const [gpsData, setGpsData] = useState<GpsData | null>(null);
    const [gpsDataUpdated, setGpsDataUpdated] = useState<boolean>(false);

    const [radioConfig, setRadioConfig] = useState<RadioConfigState>({
        interface_type: 'serial',
        serialPorts: [],
        selectedPort: '',
        baudRate: 57600,
        host: 'localhost',
        tcpPort: 50000,
        ackTimeout: 2000,
        maxRetries: 5,
    });

    const loadSerialPorts = useCallback(async () => {
        if (!window.backend) return;
        try {
            const ports = await window.backend.get_serial_ports();
            setRadioConfig(prev => ({ ...prev, serialPorts: ports }));
        } catch (err) {
            console.error('Error loading serial ports:', err);
        }
    }, []);

    const sendRadioConfig = useCallback(async () => {
        setGcsState(GCSState.RADIO_CONFIG_WAITING);
        setMessage('');
        setMessageVisible(false);

        const backend = await fetchBackend();

        const radioConfigSend = {
            interface_type: radioConfig.interface_type,
            port: radioConfig.selectedPort,
            baudrate: radioConfig.baudRate,
            host: radioConfig.host,
            tcp_port: radioConfig.tcpPort,
            ack_timeout: radioConfig.ackTimeout / 1000,
            max_retries: radioConfig.maxRetries,
        } as RadioConfig;

        if (radioConfig.interface_type === 'serial') {
            if (!radioConfig.selectedPort) {
                setMessage('Please select a port');
                setMessageVisible(true);
                setMessageType('error');
                setGcsState(GCSState.RADIO_CONFIG_INPUT);
                return false;
            }
        } else {
            if (!radioConfig.host || !radioConfig.tcpPort) {
                setMessage('Please enter a host & TCP port');
                setMessageVisible(true);
                setMessageType('error');
                setGcsState(GCSState.RADIO_CONFIG_INPUT);
                return false;
            }
        }

        try {
            const success = await backend.initialize_comms(radioConfigSend);
            if (!success) {
                setGcsState(GCSState.RADIO_CONFIG_INPUT);
                return false;
            }
            return true;
        } catch (e) {
            console.error('Failed to sendRadioConfig', e);
            setMessage(String(e));
            setMessageVisible(true);
            setMessageType('error');
            setGcsState(GCSState.RADIO_CONFIG_INPUT);
            return false;
        }
    }, [radioConfig]);

    const cancelRadioConfig = useCallback(async () => {
        if (!window.backend) return false;
        try {
            await window.backend.cancel_connection();
            setGcsState(GCSState.RADIO_CONFIG_INPUT);
            return true;
        } catch (e) {
            console.error('Failed to cancelRadioConfig', e);
            setMessage(String(e));
            setMessageVisible(true);
            setMessageType('error');
            setGcsState(GCSState.RADIO_CONFIG_INPUT);
            return false;
        }
    }, []);

    const [pingFinderConfig, setPingFinderConfig] = useState<PingFinderConfigState>({
        gain: 56.0,
        samplingRate: 2500000,
        centerFrequency: 173500000,
        enableTestData: false,
        pingWidthMs: 25,
        pingMinSnr: 25,
        pingMaxLenMult: 1.5,
        pingMinLenMult: 0.5,
        targetFrequencies: []
    });

    const sendPingFinderConfig = useCallback(async () => {
        setGcsState(GCSState.PING_FINDER_CONFIG_WAITING);
        setMessage('');
        setMessageVisible(false);

        const backend = await fetchBackend();


        const pingFinderConfigSend = {
            gain: pingFinderConfig.gain,
            sampling_rate: pingFinderConfig.samplingRate,
            center_frequency: pingFinderConfig.centerFrequency,
            enable_test_data: pingFinderConfig.enableTestData,
            ping_width_ms: pingFinderConfig.pingWidthMs,
            ping_min_snr: pingFinderConfig.pingMinSnr,
            ping_max_len_mult: pingFinderConfig.pingMaxLenMult,
            ping_min_len_mult: pingFinderConfig.pingMinLenMult,
            target_frequencies: pingFinderConfig.targetFrequencies,
        } as PingFinderConfig;

        if (pingFinderConfig.targetFrequencies.length === 0) {
            setMessage('Please input at least one target frequency');
            setMessageVisible(true);
            setMessageType('error');
            setGcsState(GCSState.PING_FINDER_CONFIG_INPUT);
            return false;
        }

        try {
            const success = await backend.send_config_request(pingFinderConfigSend);
            if (!success) {
                setMessage('Failed to send ping finder config');
                setMessageVisible(true);
                setMessageType('error');
                setGcsState(GCSState.PING_FINDER_CONFIG_INPUT);
                return false;
            }
            return true;
        } catch (e) {
            console.error('Failed to sendPingFinderConfig', e);
            setMessage(String(e));
            setMessageVisible(true);
            setMessageType('error');
            setGcsState(GCSState.PING_FINDER_CONFIG_INPUT);
            return false;
        }
    }, [pingFinderConfig]);

    const cancelPingFinderConfig = useCallback(async () => {
        if (!window.backend) return false;
        try {
            await window.backend.cancel_config_request();
            setGcsState(GCSState.PING_FINDER_CONFIG_INPUT);
            return true;
        } catch (e) {
            console.error('Failed to cancelPingFinderConfig', e);
            return false;
        }
    }, []);

    const start = useCallback(async () => {
        setGcsState(GCSState.START_WAITING);
        setMessage('');
        setMessageVisible(false);

        const backend = await fetchBackend();
        try {
            const success = await backend.send_start_request();
            if (!success) {
                setMessage('Failed to start');
                setMessageVisible(true);
                setMessageType('error');
                setGcsState(GCSState.START_INPUT);
                return false;
            }
            return true;
        } catch (e) {
            console.error('Failed to start', e);
            setMessage(String(e));
            setMessageVisible(true);
            setMessageType('error');
            setGcsState(GCSState.START_INPUT);
            return false;
        }
    }, []);

    const cancelStart = useCallback(async () => {
        setGcsState(GCSState.START_INPUT);
        setMessage('');
        setMessageVisible(false);

        const backend = await fetchBackend();
        try {
            const success = await backend.cancel_start_request();
            if (!success) {
                setGcsState(GCSState.START_TIMEOUT);
                return false;
            }
            return true;
        } catch (e) {
            console.error('Failed to cancelStart', e);
            setMessage(String(e));
            setMessageVisible(true);
            setMessageType('error');
            setGcsState(GCSState.START_TIMEOUT);
            return false;
        }
    }, []);

    const stop = useCallback(async () => {
        setGcsState(GCSState.STOP_WAITING);
        setMessage('');
        setMessageVisible(false);

        const backend = await fetchBackend();
        try {
            const success = await backend.send_stop_request();
            if (!success) {
                setMessage('Failed to stop');
                setMessageVisible(true);
                setMessageType('error');
                setGcsState(GCSState.STOP_INPUT);
                return false;
            }
            return true;
        } catch (e) {
            console.error('Failed to stop', e);
            setMessage(String(e));
            setMessageVisible(true);
            setMessageType('error');
            setGcsState(GCSState.STOP_INPUT);
            return false;
        }
    }, []);

    const cancelStop = useCallback(async () => {
        setGcsState(GCSState.STOP_INPUT);
        setMessage('');
        setMessageVisible(false);

        const backend = await fetchBackend();
        try {
            const success = await backend.cancel_stop_request();
            if (!success) {
                setGcsState(GCSState.STOP_TIMEOUT);
                return false;
            }
            return true;
        } catch (e) {
            console.error('Failed to cancelStop', e);
            setMessage(String(e));
            setMessageVisible(true);
            setMessageType('error');
            setGcsState(GCSState.STOP_TIMEOUT);
            return false;
        }
    }, []);

    const disconnect = useCallback(async () => {
        setGcsState(GCSState.RADIO_CONFIG_INPUT);
        setMessage('');
        setMessageVisible(false);

        const backend = await fetchBackend();
        try {
            await backend.disconnect();
            return true;
        } catch (e) {
            console.error('Failed to disconnect', e);
            setMessage(String(e));
            setMessageVisible(true);
            setMessageType('error');
            return false;
        }
    }, []);

    useEffect(() => {
        (async () => {
            const backend = await fetchBackend();
            backend.sync_success.connect(() => {
                if (gcsState === GCSState.START_WAITING) {
                    setGcsState(GCSState.START_INPUT);
                }
            });
        })();
    }, []);

    const value: GlobalAppState = {
        gcsState,
        isMapOffline,
        setIsMapOfflineUser,
        currentMapSource,
        setCurrentMapSource,
        mapSources: MAP_SOURCES,
        tileInfo,
        pois,
        frequencyLayers,
        setFrequencyLayers,
        mapRef,
        loadPOIs,
        addPOI,
        removePOI,
        clearTileCache,
        connectionStatus,
        connectionQuality,
        pingTime,
        gpsFrequency,
        errorMessage,
        errorMessageVisible,
        setErrorMessageVisible,
        fatalError,
        gpsData,
        gpsDataUpdated,
        successMessage,
        successMessageVisible,
        setSuccessMessageVisible,
        radioConfig,
        setRadioConfig,
        loadSerialPorts,
        sendRadioConfig,
        cancelRadioConfig,
        pingFinderConfig,
        setPingFinderConfig,
        sendPingFinderConfig,
        cancelPingFinderConfig,
        start,
        cancelStart,
        stop,
        cancelStop,
        disconnect,
    };

    return (
        <GlobalAppContext.Provider value={value}>
            {children}
        </GlobalAppContext.Provider>
    );
}

export default GlobalAppProvider;
// COMMS state
//     const [interfaceType, setInterfaceType] = useState<'serial' | 'simulated'>('serial');
//     const [serialPorts, setSerialPorts] = useState<string[]>([]);
//     const [selectedPort, setSelectedPort] = useState<string>('');
//     const [baudRate, setBaudRate] = useState<number | null>(57600);
//     const [host, setHost] = useState<string>('localhost');
//     const [tcpPort, setTcpPort] = useState<number | null>(50000);
//     const [ackTimeout, setAckTimeout] = useState<number>(2000);
//     const [maxRetries, setMaxRetries] = useState<number>(5);

//     const [isConnecting, setIsConnecting] = useState(false);
//     const [isConnected, setIsConnected] = useState(false);
//     const [errorMessage, setErrorMessage] = useState('');
//     const [showCancelSync, setShowCancelSync] = useState(false);
//     const [waitingForSync, setWaitingForSync] = useState(false);
//     const [droneData, setDroneData] = useState<DroneData | null>(null);

//     // MAP state
//     const [currentSource, setCurrentSource] = useState(MAP_SOURCES[0]);
//     const [tileInfo, setTileInfo] = useState<TileInfo | null>(null);
//     const [pois, setPois] = useState<POI[]>([]);
//     const [frequencyLayers, setFrequencyLayers] = useState<FrequencyLayer[]>([]);
//     const [activeFetches] = useState<number>(0);
//     const isFetchingTiles = activeFetches > 0;

//     // offline vs real
//     const isOnline = useInternetStatus();
//     const [isOffline, setOfflineState] = useState(() => {
//         const saved = window.localStorage.getItem(OFFLINE_MODE_KEY);
//         return saved === 'true';
//     });
//     const mapRef = useRef<import('leaflet').Map | null>(null);

//     // ----- Comms: loadSerialPorts, initializeComms, cancelConnection, signals
//     const loadSerialPorts = useCallback(async () => {
//         if (!window.backend) return;
//         try {
//             const ports = await window.backend.get_serial_ports();
//             setSerialPorts(ports);
//             if (ports.length > 0 && !selectedPort) {
//                 setSelectedPort(ports[0]);
//             }
//         } catch (err) {
//             console.error('Error loading serial ports:', err);
//         }
//     }, [selectedPort]);

//     const initializeComms = async (): Promise<boolean> => {
//         setIsConnecting(true);
//         setConnectionStatus('Connecting...');
//         setErrorMessage('');
//         setWaitingForSync(true);
//         setShowCancelSync(false);

//         const backend = await fetchBackend();
//         const commsConfig: CommsConfiguration = {
//             interface_type: interfaceType,
//             ack_timeout: ackTimeout / 1000,
//             max_retries: maxRetries,
//         };

//         if (interfaceType === 'serial') {
//             if (!selectedPort) {
//                 setErrorMessage('Please select a port');
//                 setIsConnecting(false);
//                 setWaitingForSync(false);
//                 return false;
//             }
//             if (!baudRate) {
//                 setErrorMessage('Please select a baud rate');
//                 setIsConnecting(false);
//                 setWaitingForSync(false);
//                 return false;
//             }
//             commsConfig.port = selectedPort;
//             commsConfig.baudrate = baudRate;
//         } else {
//             if (!host) {
//                 setErrorMessage('Please enter a host');
//                 setIsConnecting(false);
//                 setWaitingForSync(false);
//                 return false;
//             }
//             if (!tcpPort) {
//                 setErrorMessage('Please enter a TCP port');
//                 setIsConnecting(false);
//                 setWaitingForSync(false);
//                 return false;
//             }
//             commsConfig.host = host;
//             commsConfig.tcp_port = tcpPort;
//         }

//         try {
//             const success = await backend.initialize_comms(commsConfig);
//             if (!success) {
//                 setIsConnecting(false);
//                 setWaitingForSync(false);
//                 return false;
//             }

//             const totalTimeout = ackTimeout * maxRetries;
//             setTimeout(() => {
//                 if (waitingForSync) setShowCancelSync(true);
//             }, totalTimeout);

//             return true;
//         } catch (ex) {
//             console.error('Failed to initialize comms:', ex);
//             setErrorMessage('Failed to initialize communications');
//             setIsConnecting(false);
//             setWaitingForSync(false);
//             return false;
//         }
//     };

//     const cancelConnection = useCallback(async () => {
//         const backend = await fetchBackend();
//         await backend.cancel_connection();
//         setIsConnected(false);
//         setIsConnecting(false);
//         setWaitingForSync(false);
//         setErrorMessage('');
//         setShowCancelSync(false);
//     }, []);

//     useEffect(() => {
//         const setupSignals = async () => {
//             const backend = await fetchBackend();
//             backend.connection_status.connect((status: string) => {
//                 setConnectionStatus(status);
//                 if (status === 'Drone connected successfully') {
//                     setIsConnected(true);
//                     setIsConnecting(false);
//                     setWaitingForSync(false);
//                     setShowCancelSync(false);
//                 }
//             });
//             backend.sync_timeout.connect(() => setShowCancelSync(true));
//             backend.error_message.connect((msg: string) => setErrorMessage(msg));
//             backend.drone_data_updated.connect((data: DroneData | { disconnected: true }) => {
//                 if ('disconnected' in data) {
//                     setDroneData(null);
//                 } else {
//                     setDroneData(data);
//                 }
//             });
//         };
//         setupSignals();
//     }, []);

//     // ----- Map: offline mode, tile/POIs, freq layers
//     const setIsOffline = (val: boolean) => {
//         setOfflineState(val);
//         window.localStorage.setItem(OFFLINE_MODE_KEY, val.toString());
//     };

//     const [isLoading, setIsLoading] = useState(true);
//     useEffect(() => {
//         let subscribed = true;

//         const initData = async () => {
//             if (!window.backend) {
//                 if (subscribed) setTimeout(initData, 1000);
//                 return;
//             }
//             try {
//                 const info = await window.backend.get_tile_info();
//                 if (subscribed) {
//                     setTileInfo(info || { total_tiles: 0, total_size_mb: 0 });
//                 }
//                 const loadedPois = await window.backend.get_pois();
//                 if (subscribed && loadedPois) {
//                     setPois(loadedPois);
//                 }

//                 if (window.backend.tile_info_updated) {
//                     window.backend.tile_info_updated.connect((ti: TileInfo) => {
//                         if (subscribed) setTileInfo(ti);
//                     });
//                 }
//                 if (window.backend.pois_updated) {
//                     window.backend.pois_updated.connect((updatedPois: POI[]) => {
//                         if (subscribed) setPois(updatedPois);
//                     });
//                 }
//             } catch (err) {
//                 console.error('Error init tile or POI:', err);
//             } finally {
//                 if (subscribed) setIsLoading(false);
//             }
//         };

//         initData();

//         return () => {
//             subscribed = false;
//             if (window.backend) {
//                 if (window.backend.tile_info_updated) {
//                     window.backend.tile_info_updated.disconnect();
//                 }
//                 if (window.backend.pois_updated) {
//                     window.backend.pois_updated.disconnect();
//                 }
//             }
//         };
//     }, []);

//     const loadPOIs = useCallback(async () => {
//         if (!window.backend) return;
//         try {
//             const data = await window.backend.get_pois();
//             if (data) setPois(data);
//         } catch (err) {
//             console.error('Error loading POIs:', err);
//         }
//     }, []);

//     const addPOI = useCallback(async (name: string, coords?: [number, number]) => {
//         if (!window.backend) return false;
//         try {
//             const c = coords || [0, 0];
//             const ok = await window.backend.add_poi(name, c);
//             return ok;
//         } catch (err) {
//             console.error('Error adding POI:', err);
//             return false;
//         }
//     }, []);

//     const removePOI = useCallback(async (name: string) => {
//         if (!window.backend) return false;
//         try {
//             return await window.backend.remove_poi(name);
//         } catch (err) {
//             console.error('Error removing POI:', err);
//             return false;
//         }
//     }, []);

//     const clearTileCache = useCallback(async () => {
//         if (!window.backend) return false;
//         try {
//             return await window.backend.clear_tile_cache();
//         } catch (err) {
//             console.error('Error clearing tile cache:', err);
//             return false;
//         }
//     }, []);

//     const clearAllData = useCallback(async () => {
//         if (!window.backend) return false;
//         try {
//             const ok = await window.backend.clear_all_data();
//             if (ok) {
//                 setFrequencyLayers([]);
//             }
//             return ok;
//         } catch (err) {
//             console.error('Error clearing all data:', err);
//             return false;
//         }
//     }, []);

//     // freq layer signals
//     useEffect(() => {
//         if (!window.backend) return;

//         const handlePingDataUpdated = (data: PingDataUpdate) => {
//             if (data.cleared) {
//                 setFrequencyLayers((prev) => prev.filter((l) => l.frequency !== data.frequency));
//             } else {
//                 const freq = data.frequency;
//                 setFrequencyLayers((prev) => {
//                     const existing = prev.find((f) => f.frequency === freq);
//                     if (!existing) {
//                         return [...prev, {
//                             frequency: freq,
//                             pings: [data as PingData],
//                             locationEstimate: null,
//                             visible: true,
//                         }];
//                     } else {
//                         return prev.map((layer) => {
//                             if (layer.frequency === freq) {
//                                 return { ...layer, pings: [...layer.pings, data as PingData] };
//                             }
//                             return layer;
//                         });
//                     }
//                 });
//             }
//         };

//         const handleLocEstDataUpdated = (data: LocEstDataUpdate) => {
//             if (data.cleared) {
//                 setFrequencyLayers((prev) => prev.filter((l) => l.frequency !== data.frequency));
//             } else {
//                 const freq = data.frequency;
//                 setFrequencyLayers((prev) => {
//                     const existing = prev.find((f) => f.frequency === freq);
//                     if (!existing) {
//                         return [...prev, {
//                             frequency: freq,
//                             pings: [],
//                             locationEstimate: data as LocEstData,
//                             visible: true,
//                         }];
//                     } else {
//                         return prev.map((layer) => {
//                             if (layer.frequency === freq) {
//                                 return { ...layer, locationEstimate: data as LocEstData };
//                             }
//                             return layer;
//                         });
//                     }
//                 });
//             }
//         };

//         window.backend.ping_data_updated?.connect(handlePingDataUpdated);
//         window.backend.loc_est_data_updated?.connect(handleLocEstDataUpdated);

//         return () => {
//             window.backend.ping_data_updated?.disconnect(handlePingDataUpdated);
//             window.backend.loc_est_data_updated?.disconnect(handleLocEstDataUpdated);
//         };
//     }, []);

//     // check real offline vs forced offline
//     useEffect(() => {
//         if (!isOnline && !isOffline) {
//             console.warn('User is truly offline, but forced offline mode is off');
//         }
//     }, [isOnline, isOffline]);

//     if (isLoading) {
//         return (
//             <div className="flex items-center justify-center h-full">
//                 Loading initial data...
//             </div>
//         );
//     }

//     const value: GlobalAppState = {
//         // Comms
//         interfaceType,
//         setInterfaceType,
//         serialPorts,
//         loadSerialPorts,
//         selectedPort,
//         setSelectedPort,
//         baudRate,
//         setBaudRate,
//         host,
//         setHost,
//         tcpPort,
//         setTcpPort,
//         ackTimeout,
//         setAckTimeout,
//         maxRetries,
//         setMaxRetries,
//         isConnecting,
//         isConnected,
//         setIsConnected,
//         connectionStatus,
//         errorMessage,
//         setErrorMessage,
//         waitingForSync,
//         setWaitingForSync,
//         showCancelSync,
//         setShowCancelSync,
//         droneData,
//         initializeComms,
//         cancelConnection,

//         // Map
//         currentSource,
//         setCurrentSource,
//         mapSources: MAP_SOURCES,
//         isOffline,
//         setIsOffline,
//         tileInfo,
//         pois,
//         loadPOIs,
//         addPOI,
//         removePOI,
//         frequencyLayers,
//         setFrequencyLayers,
//         clearTileCache,
//         clearAllData,
//         isFetchingTiles,
//         mapRef,
//     };

//     return (
//         <GlobalAppContext.Provider value={value}>
//             {children}
//         </GlobalAppContext.Provider>
//     );
// };

// export default GlobalAppProvider;

