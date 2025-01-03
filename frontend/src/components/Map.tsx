import { useEffect, useState, createContext, useContext } from 'react';
import { MapContainer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ControlPanel from './ControlPanel';
import CommsConfig from './CommsConfig';
import LoadingSpinner from './LoadingSpinner';
import { TileInfo, POI } from '../utils/backend';
import type { ReactNode } from 'react';
import { MapSource, MAP_SOURCES, OFFLINE_MODE_KEY } from '../utils/mapSources';
import DataLayers from './DataLayers';

const MapContext = createContext<L.Map | null>(null);

// Helper component to provide map context
const MapProvider = ({ children }: { children: ReactNode }) => {
  const map = useMap();

  return (
    <MapContext.Provider value={map}>
      {children}
    </MapContext.Provider>
  );
};

interface MapProps {
  center: [number, number];
  zoom: number;
}

// Helper component to initialize map and handle backend interactions
const MapInitializer = ({ onStateChange }: { 
  onStateChange: (state: {
    backendReady: boolean,
    initializing: boolean,
    currentSource: MapSource,
    tileInfo: TileInfo | null,
    tileLayer: L.TileLayer | null,
    pois: POI[],
    isOffline: boolean,
    isFetching: boolean
  }) => void
}) => {
  const map = useContext(MapContext);
  const [backendReady, setBackendReadyState] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [currentSource, setCurrentSource] = useState<MapSource>(MAP_SOURCES[0]);
  const [tileInfo, setTileInfo] = useState<TileInfo | null>(null);
  const [tileLayer, setTileLayer] = useState<L.TileLayer | null>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [isOffline, setIsOffline] = useState(() => {
    const isConnectedToInternet = window.navigator.onLine;
    return !isConnectedToInternet || window.localStorage.getItem(OFFLINE_MODE_KEY) === 'true';
  });
  const [activeFetches, setActiveFetches] = useState(0);
  const isFetching = activeFetches > 0;

  // Update currentSource when parent changes it
  useEffect(() => {
    const handleSourceChange = (source: MapSource) => {
      setCurrentSource(source);
    };
    window.addEventListener('mapSourceChanged', ((e: CustomEvent<MapSource>) => handleSourceChange(e.detail)) as EventListener);
    return () => {
      window.removeEventListener('mapSourceChanged', ((e: CustomEvent<MapSource>) => handleSourceChange(e.detail)) as EventListener);
    };
  }, []);

  // Update offline mode when parent changes it
  useEffect(() => {
    const handleOfflineChange = (offline: boolean) => {
      setIsOffline(offline);
    };
    window.addEventListener('offlineModeChanged', ((e: CustomEvent<boolean>) => handleOfflineChange(e.detail)) as EventListener);
    return () => {
      window.removeEventListener('offlineModeChanged', ((e: CustomEvent<boolean>) => handleOfflineChange(e.detail)) as EventListener);
    };
  }, []);

  // Notify parent of state changes
  useEffect(() => {
    onStateChange({
      backendReady,
      initializing,
      currentSource,
      tileInfo,
      tileLayer,
      pois,
      isOffline,
      isFetching
    });
  }, [backendReady, initializing, currentSource, tileInfo, tileLayer, pois, isOffline, isFetching, onStateChange]);

  // Save offline mode preference
  useEffect(() => {
    console.log('Setting offline mode:', isOffline);
    window.localStorage.setItem(OFFLINE_MODE_KEY, isOffline.toString());
  }, [isOffline]);

  // Initialize offline mode from localStorage
  useEffect(() => {
    const savedOfflineMode = window.localStorage.getItem(OFFLINE_MODE_KEY) === 'true';
    console.log('Initializing offline mode from storage:', savedOfflineMode);
    setIsOffline(savedOfflineMode);
  }, []);

  useEffect(() => {
    const initializeBackend = async () => {
      if (!window.backend) {
        console.debug('Backend not ready, retrying in 1s...');
        const timer = setTimeout(initializeBackend, 1000);
        return () => clearTimeout(timer);
      }

      try {
        const info = await window.backend.get_tile_info();
        const initialPois = await window.backend.get_pois();
        setPois(initialPois);
        setTileInfo(info || { total_tiles: 0, total_size_mb: 0 });

        window.backend.pois_updated.connect(setPois);
        window.backend.tile_info_updated.connect(setTileInfo);

        setBackendReadyState(true);
      } catch (error) {
        console.error('Error initializing backend:', error);
        setTileInfo({ total_tiles: 0, total_size_mb: 0 });
      } finally {
        setInitializing(false);
      }
    };

    initializeBackend();

    return () => {
      if (window.backend) {
        window.backend.pois_updated.disconnect(setPois);
        window.backend.tile_info_updated.disconnect(setTileInfo);
      }
    };
  }, [setPois, setTileInfo]);

  useEffect(() => {
    if (!map || !backendReady || !window.backend) return;

    // Create new tile layer
    class CustomTileLayer extends L.TileLayer {
      createTile(coords: L.Coords, done: L.DoneCallback): HTMLImageElement {
        const img = document.createElement('img');
        img.setAttribute('role', 'presentation');
        img.setAttribute('loading', 'high');
        img.setAttribute('decoding', 'async');
        
        const priority = this._getZoomForUrl() === coords.z ? 1 : 0;
        
        const loadTile = async () => {
          try {
            setActiveFetches(prev => prev + 1);
            const data = await window.backend.get_tile(
              coords.z, 
              coords.x, 
              coords.y, 
              currentSource.id,
              { offline: isOffline }
            );
            
            if (data) {
              if (!isOffline) {
                const blob = await window.fetch(`data:image/png;base64,${data}`).then(r => r.blob());
                const url = window.URL.createObjectURL(blob);
                img.src = url;
                img.onload = () => {
                  window.URL.revokeObjectURL(url);
                  done(undefined, img);
                };
              } else {
                img.src = `data:image/png;base64,${data}`;
                img.onload = () => done(undefined, img);
              }
            } else {
              done(new Error('Tile not available'), img);
            }
          } catch (error) {
            console.error('Error loading tile:', error);
            done(error instanceof Error ? error : new Error(String(error)), img);
          } finally {
            setActiveFetches(prev => prev - 1);
          }
        };

        if (priority === 1) {
          loadTile();
        } else {
          setTimeout(loadTile, 100);
        }

        return img;
      }
    }

    // Create new tile layer
    const newTileLayer = new CustomTileLayer('', {
      maxZoom: currentSource.maxZoom,
      minZoom: currentSource.minZoom,
      tileSize: 256,
      keepBuffer: 2,
      updateWhenIdle: true,
      updateWhenZooming: false,
      className: 'map-tiles',
      attribution: currentSource.attribution,
    });

    // Add new layer before removing old one to prevent flickering
    newTileLayer.addTo(map);
    
    // Remove old layer after new one is added
    if (tileLayer) {
      tileLayer.remove();
    }

    setTileLayer(newTileLayer);
    map.invalidateSize();

    // Cleanup function
    return () => {
      newTileLayer.remove();
    };
  }, [map, backendReady, currentSource, isOffline]);

  return (
    <>
      {initializing ? (
        <LoadingSpinner message="Initializing Map..." overlay={true} />
      ) : (
        <>
          {/* Loading indicator */}
          {isFetching && !isOffline && (
            <div className="absolute bottom-4 left-4 bg-white/95 px-3 py-2 rounded-lg shadow-md flex items-center gap-2 z-[1000]">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-700">Loading map tiles...</span>
            </div>
          )}
        </>
      )}
    </>
  );
};

const ZoomControl = () => {
  const map = useMap();
  return (
    <div className="absolute bottom-4 left-4 z-[400]">
      <div className="bg-white/95 rounded-lg shadow-lg p-1">
        <div className="leaflet-control-zoom leaflet-bar">
          <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors" onClick={() => map.zoomIn()}>+</button>
          <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors border-t" onClick={() => map.zoomOut()}>−</button>
        </div>
      </div>
    </div>
  );
};

const Map = ({ center, zoom }: MapProps) => {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [state, setState] = useState(() => {
    const isConnectedToInternet = window.navigator.onLine;
    return {
      backendReady: false,
      initializing: true,
      currentSource: MAP_SOURCES[0],
      tileInfo: null as TileInfo | null,
      tileLayer: null as L.TileLayer | null,
      pois: [] as POI[],
      isOffline: !isConnectedToInternet || window.localStorage.getItem(OFFLINE_MODE_KEY) === 'true',
      isFetching: false
    };
  });
  const [commsConnected, setCommsConnected] = useState(false);
  const [activePanel, setActivePanel] = useState<'comms' | 'map'>('comms');

  const handleMapMount = (map: L.Map) => {
    setMapInstance(map);
  };

  return (
    <div className="h-screen w-screen flex">
      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer
          center={center}
          zoom={zoom}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={false}
          ref={handleMapMount}
        >
          <MapProvider>
            <MapInitializer onStateChange={setState} />
          </MapProvider>
          <ZoomControl />
          <div className="absolute bottom-4 left-16 z-[400] bg-white/95 px-2 py-1 rounded text-xs text-gray-600">
            © OpenStreetMap contributors
          </div>
        </MapContainer>
      </div>

      {/* Control Panel */}
      <div className="w-80 bg-white shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">RTT Drone GCS</h1>
        </div>

        {/* Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activePanel === 'comms'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActivePanel('comms')}
          >
            Communications
          </button>
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activePanel === 'map'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActivePanel('map')}
          >
            Map Controls
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {activePanel === 'comms' ? (
            /* Communications Panel */
            <div className="p-4">
              {!commsConnected ? (
                <CommsConfig onConnect={() => setCommsConnected(true)} />
              ) : (
                <div className="text-sm text-green-600 p-2 bg-green-50 rounded-md">
                  Connected to drone
                </div>
              )}
            </div>
          ) : (
            /* Map Controls Panel */
            <>
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Map Controls</h2>
                <ControlPanel
                  tileInfo={state.tileInfo}
                  tileLayer={state.tileLayer}
                  map={mapInstance}
                  pois={state.pois}
                  currentSource={state.currentSource}
                  setCurrentSource={(source) => {
                    setState(prev => ({ ...prev, currentSource: source }));
                    // Dispatch custom event for map source change
                    window.dispatchEvent(new CustomEvent('mapSourceChanged', { detail: source }));
                  }}
                  mapSources={MAP_SOURCES}
                  isOffline={state.isOffline}
                  setIsOffline={(offline) => {
                    setState(prev => ({ ...prev, isOffline: offline }));
                    // Dispatch custom event for offline mode change
                    window.dispatchEvent(new CustomEvent('offlineModeChanged', { detail: offline }));
                  }}
                />
              </div>

              <div className="p-4">
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Data Layers</h2>
                <DataLayers map={mapInstance} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Map;
