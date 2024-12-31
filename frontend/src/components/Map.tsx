import { useEffect, useState, createContext, useContext } from 'react';
import { MapContainer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ControlPanel from './ControlPanel';
import LoadingSpinner from './LoadingSpinner';
import { TileInfo, POI } from '../utils/backend';
import type { ReactNode } from 'react';
import { MapSource, MAP_SOURCES, OFFLINE_MODE_KEY } from '../utils/mapSources';

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
const MapInitializer = () => {
  const map = useContext(MapContext);
  const [backendReady, setBackendReadyState] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [currentSource, setCurrentSource] = useState<MapSource>(MAP_SOURCES[0]);
  const [tileInfo, setTileInfo] = useState<TileInfo | null>(null);
  const [tileLayer, setTileLayer] = useState<L.TileLayer | null>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [isOffline, setIsOffline] = useState(() => localStorage.getItem(OFFLINE_MODE_KEY) === 'true');
  const [activeFetches, setActiveFetches] = useState(0);
  const isFetching = activeFetches > 0;

  // Save offline mode preference
  useEffect(() => {
    localStorage.setItem(OFFLINE_MODE_KEY, isOffline.toString());
  }, [isOffline]);

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
    if (map && backendReady && window.backend) {
      // Clear existing tile layer
      if (tileLayer) {
        tileLayer.remove();
        setTileLayer(null);
      }

      class CustomTileLayer extends L.TileLayer {
        createTile(coords: L.Coords, done: L.DoneCallback): HTMLImageElement {
          const img = document.createElement('img');
          img.setAttribute('role', 'presentation');

          setActiveFetches(prev => prev + 1);
          window.backend
            .get_tile(coords.z, coords.x, coords.y, currentSource.id, isOffline)
            .then((data: string) => {
              if (data) {
                img.src = `data:image/png;base64,${data}`;
                done(undefined, img);
              } else {
                done(new Error('Tile not available'), img);
              }
            })
            .catch((error: Error) => {
              console.error('Error loading tile:', error);
              done(error, img);
            })
            .finally(() => {
              setActiveFetches(prev => prev - 1);
            });

          return img;
        }
      }

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

      setTileLayer(newTileLayer);
      newTileLayer.addTo(map);
      map.invalidateSize();
    }
  }, [map, backendReady, currentSource, isOffline]);

  return (
    <>
      {initializing ? (
        <LoadingSpinner message="Initializing Map..." overlay={true} />
      ) : (
        <>
          <ControlPanel
            tileInfo={tileInfo}
            tileLayer={tileLayer}
            map={map}
            pois={pois}
            setPois={setPois}
            currentSource={currentSource}
            setCurrentSource={setCurrentSource}
            mapSources={MAP_SOURCES}
            isOffline={isOffline}
            setIsOffline={setIsOffline}
          />
          {isFetching && !isOffline && (
            <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 px-3 py-2 rounded-lg shadow-md flex items-center gap-2 z-[1000]">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-700">Loading map tiles...</span>
            </div>
          )}
        </>
      )}
    </>
  );
};

const Map = ({ center, zoom }: MapProps) => (
  <div className="h-full w-full relative">
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full rounded-lg overflow-hidden"
      scrollWheelZoom={true}
      preferCanvas={true}
    >
      <MapProvider>
        <MapInitializer />
      </MapProvider>
    </MapContainer>
  </div>
);

export default Map;
