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
        showMessage('Please enter valid latitude and longitude values', 'error');
        return;
      }
      map.setView([lat, lng], map.getZoom());
      showMessage('Map centered on coordinates', 'success');
    } catch {
      showMessage('Please enter valid coordinates', 'error');
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
        className={`fixed top-5 right-5 bg-white/95 p-5 rounded-2xl shadow-lg z-[2000] 
        flex flex-col gap-4 min-w-[300px] backdrop-blur-md border border-gray-200/50 
        transition-all duration-300 hover:shadow-xl`}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between cursor-pointer group"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span className="bg-blue-500 text-white p-1.5 rounded-lg">🗺️</span>
            Map Controls
            <span className={`text-sm text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </h3>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <Fragment>
            {/* Map Source Selector */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Map Source</label>
              <select
                value={currentSource.id}
                onChange={(e) => handleMapSourceChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg 
                focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                {mapSources.map(source => (
                  <option key={source.id} value={source.id}>{source.name}</option>
                ))}
              </select>
            </div>

            {/* Go to Coordinates */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Go to Location</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={coordinates.split(',')[0] || ''}
                  onChange={(e) => setCoordinates(`${e.target.value},${coordinates.split(',')[1] || ''}`)}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={coordinates.split(',')[1] || ''}
                  onChange={(e) => setCoordinates(`${coordinates.split(',')[0] || ''},${e.target.value}`)}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <button
                  onClick={handleGoToCoordinates}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                  transition-colors shadow-sm hover:shadow-md disabled:opacity-50 
                  disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <span>📍</span> Go
                </button>
              </div>
            </div>

            {/* Add POI */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Add Point of Interest</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Name this location"
                  value={poiName}
                  onChange={(e) => setPoiName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <button
                  onClick={handleAddPOI}
                  disabled={isAddingPOI || !poiName.trim()}
                  className={`px-4 py-2 rounded-lg text-white transition-all shadow-sm 
                  hover:shadow-md flex items-center gap-2 ${
                    isAddingPOI || !poiName.trim()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {isAddingPOI ? 'Adding...' : '📍 Add'}
                </button>
              </div>
            </div>

            {/* POI List */}
            {pois.length > 0 && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Saved Locations</label>
                <div className="bg-gray-50 rounded-lg p-2 max-h-48 overflow-y-auto">
                  {pois.map((poi) => (
                    <div
                      key={poi.name}
                      className="group flex justify-between items-center p-2.5 hover:bg-white 
                      rounded-lg transition-colors border border-transparent hover:border-gray-200"
                    >
                      <button
                        onClick={() => goToPOI(poi.coords)}
                        className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
                      >
                        <span className="text-blue-500">📍</span> {poi.name}
                      </button>
                      <button
                        onClick={() => handleRemovePOI(poi.name)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 
                        transition-all hover:scale-110"
                        title={`Remove ${poi.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settings Section */}
            <div className="space-y-3 pt-2 border-t border-gray-200">
              {/* Offline Mode Toggle */}
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">Offline Mode</span>
                  <span className="text-xs text-gray-500">Use cached map tiles only</span>
                </div>
                <button
                  onClick={() => setIsOffline(!isOffline)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${isOffline ? 'bg-blue-500' : 'bg-gray-300'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${isOffline ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>

              {/* Cache Info & Clear Cache */}
              {tileInfo && (
                <div className="flex flex-col gap-2">
                  <div className="p-2 bg-gray-50 rounded-lg text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-500">📦</span>
                      <span>{tileInfo.total_tiles} cached tiles</span>
                      <span className="text-gray-400">•</span>
                      <span>{tileInfo.total_size_mb.toFixed(1)} MB</span>
                    </div>
                  </div>
                  <button
                    onClick={handleClearCache}
                    disabled={isClearing}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 text-gray-600 
                    rounded-lg hover:bg-gray-50 hover:text-red-600 hover:border-red-200
                    transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed 
                    disabled:text-gray-400 flex items-center justify-center gap-2"
                  >
                    {isClearing ? 'Clearing...' : 'Clear cached tiles'}
                  </button>
                </div>
              )}
            </div>

            {/* Message Toast */}
            {message && (
              <div
                className={`p-3 rounded-lg flex items-center gap-2 text-sm animate-fade-in
                  ${message.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
              >
                {message.type === 'success' ? '✅' : '❌'} {message.text}
              </div>
            )}
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
