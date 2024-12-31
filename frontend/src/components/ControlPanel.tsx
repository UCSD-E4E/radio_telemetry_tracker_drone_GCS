import { useState, Fragment } from 'react';
import ReactDOM from 'react-dom';
import { TileInfo, POI } from '../utils/backend';
import * as L from 'leaflet';
import { MapSource } from '../utils/mapSources';

interface ControlPanelProps {
  tileInfo: TileInfo | null;
  tileLayer: L.TileLayer | null;
  map: L.Map | null;
  pois: POI[];
  setPois: (pois: POI[]) => void;
  currentSource: MapSource;
  setCurrentSource: (source: MapSource) => void;
  mapSources: MapSource[];
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
}

const ControlPanel = ({
  tileInfo,
  tileLayer,
  map,
  pois,
  setPois,
  currentSource,
  setCurrentSource,
  mapSources,
  isOffline,
  setIsOffline,
}: ControlPanelProps) => {
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [coordinates, setCoordinates] = useState('');
  const [poiName, setPoiName] = useState('');
  const [isAddingPOI, setIsAddingPOI] = useState(false);
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleClearCache = async () => {
    if (!window.backend) return;
    setShowClearCacheModal(true);
  };

  const confirmClearCache = async () => {
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
      setShowClearCacheModal(false);
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

  const handleMapSourceChange = (sourceId: string) => {
    const newSource = mapSources.find(s => s.id === sourceId);
    if (newSource) {
      setCurrentSource(newSource);
    }
  };

  const controlPanelContent = (
    <>
      <div
        className={`fixed top-5 right-5 bg-white bg-opacity-95 p-4 rounded-xl shadow-lg z-[2000] flex flex-col gap-3 min-w-[280px] backdrop-blur-md border border-gray-200 transition-all duration-300`}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            🗺️ Map Controls
            <span className="text-sm text-gray-500">
              {isExpanded ? '▼' : '▶'}
            </span>
          </h3>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <Fragment>
            {/* Map Source Selector */}
            <div className="flex gap-2 items-center">
              <select
                value={currentSource.id}
                onChange={(e) => handleMapSourceChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                {mapSources.map(source => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Go to Coordinates */}
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="lat, lng (e.g. 32.88, -117.23)"
                value={coordinates}
                onChange={(e) => setCoordinates(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <button
                onClick={handleGoToCoordinates}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Go
              </button>
            </div>

            {/* Add POI */}
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Add current location as POI"
                value={poiName}
                onChange={(e) => setPoiName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 transition"
              />
              <button
                onClick={handleAddPOI}
                disabled={isAddingPOI || !poiName.trim()}
                className={`px-4 py-2 rounded-md text-white transition ${
                  isAddingPOI || !poiName.trim()
                    ? 'bg-green-300 cursor-wait'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {isAddingPOI ? 'Adding...' : '📍 Add'}
              </button>
            </div>

            {/* POI List */}
            {pois.length > 0 && (
              <div className="bg-gray-100 rounded-md p-2 max-h-48 overflow-y-auto">
                {pois.map((poi) => (
                  <div
                    key={poi.name}
                    className="flex justify-between items-center p-2 hover:bg-gray-200 rounded-md transition"
                  >
                    <span
                      onClick={() => goToPOI(poi.coords)}
                      className="cursor-pointer text-gray-700 flex items-center gap-2"
                    >
                      📍 {poi.name}
                    </span>
                    <button
                      onClick={() => handleRemovePOI(poi.name)}
                      className="text-red-500 hover:text-red-700 transition"
                      aria-label={`Remove ${poi.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Clear Cache */}
            <button
              onClick={handleClearCache}
              disabled={isClearing}
              title="Clear all cached map tiles"
              className={`mt-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed`}
            >
              {isClearing ? 'Clearing...' : '🗑️ Clear Cache'}
            </button>

            {/* Message */}
            {message && (
              <div
                className={`mt-2 p-3 rounded-md flex items-center gap-2 text-sm ${
                  message.type === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {message.type === 'success' ? '✅' : '❌'} {message.text}
              </div>
            )}

            {/* Tile Info */}
            {tileInfo && (
              <div className="mt-2 p-2 bg-gray-100 rounded-md text-sm text-gray-600 flex items-center gap-2">
                📦 <span>
                  {tileInfo.total_tiles} tiles ({tileInfo.total_size_mb.toFixed(1)} MB)
                </span>
              </div>
            )}

            {/* Offline Mode */}
            <div className="flex items-center justify-between mt-2 p-2 bg-gray-100 rounded-md">
              <span className="text-gray-700">Offline Mode</span>
              <button
                onClick={() => setIsOffline(!isOffline)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  isOffline
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 text-gray-700'
                }`}
              >
                {isOffline ? 'On' : 'Off'}
              </button>
            </div>
          </Fragment>
        )}
      </div>

      {/* Clear Cache Confirmation Modal */}
      {showClearCacheModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Clear Map Cache?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to clear the map cache?
              <br /><br />
              <strong className="text-amber-600">Warning:</strong> If you have no internet connection, you will not be able to load new map data.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearCacheModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearCache}
                disabled={isClearing}
                className={`px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition disabled:bg-red-300 disabled:cursor-not-allowed`}
              >
                {isClearing ? 'Clearing...' : 'Clear Cache'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return ReactDOM.createPortal(controlPanelContent, document.getElementById('portal-root')!);
};

export default ControlPanel;
