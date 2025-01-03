import React, { useState } from 'react';
import L from 'leaflet';
import { TileInfo, POI } from '../utils/backend';
import { MapSource } from '../utils/mapSources';
import { useInternetStatus } from '../hooks/useInternetStatus';

interface ControlPanelProps {
  tileInfo: TileInfo | null;
  tileLayer: L.TileLayer | null;
  map: L.Map | null;
  pois: POI[];
  currentSource: MapSource;
  setCurrentSource: (source: MapSource) => void;
  mapSources: MapSource[];
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
  onOfflineModeChange?: (offline: boolean) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  tileInfo,
  map,
  pois,
  currentSource,
  setCurrentSource,
  mapSources,
  isOffline,
  setIsOffline,
  onOfflineModeChange,
}) => {
  const [newPoiName, setNewPoiName] = useState('');
  const [showPoiForm, setShowPoiForm] = useState(false);
  const [editingPoi, setEditingPoi] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [showOfflineWarning, setShowOfflineWarning] = useState(false);

  const isConnectedToInternet = useInternetStatus();

  const handleAddPOI = async () => {
    if (!map || !window.backend || !newPoiName.trim()) return;
    const center = map.getCenter();
    await window.backend.add_poi(newPoiName.trim(), [center.lat, center.lng]);
    setNewPoiName('');
    setShowPoiForm(false);
  };

  const handleRemovePOI = async (name: string) => {
    if (!window.backend) return;
    await window.backend.remove_poi(name);
  };

  const handleRenamePOI = async (oldName: string) => {
    if (!window.backend || !editName.trim() || editName === oldName) {
      setEditingPoi(null);
      return;
    }
    const poi = pois.find(p => p.name === oldName);
    if (poi) {
      await window.backend.remove_poi(oldName);
      await window.backend.add_poi(editName.trim(), poi.coords);
    }
    setEditingPoi(null);
  };

  const startEditing = (name: string) => {
    setEditingPoi(name);
    setEditName(name);
  };

  const handleClearTiles = async () => {
    if (!window.backend) return;
    setShowClearConfirmation(false);
    await window.backend.clear_tile_cache();
  };

  const handleOfflineModeChange = (checked: boolean) => {
    if (checked && !isConnectedToInternet) {
      setIsOffline(true);
      onOfflineModeChange?.(true);
    } else if (!checked && !isConnectedToInternet) {
      setShowOfflineWarning(true);
    } else {
      setIsOffline(checked);
      onOfflineModeChange?.(checked);
    }
  };

  return (
    <div className="space-y-6">
      {/* Map Source Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Map Source</label>
        <select
          value={currentSource.id}
          onChange={(e) => setCurrentSource(mapSources.find(s => s.id === e.target.value) || mapSources[0])}
          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {mapSources.map(source => (
            <option key={source.id} value={source.id}>{source.name}</option>
          ))}
        </select>
      </div>

      {/* Offline Mode Toggle */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={isOffline}
            onChange={(e) => handleOfflineModeChange(e.target.checked)}
            className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          Offline Mode
          {!isConnectedToInternet && (
            <span className="text-yellow-600 text-xs">
              (No Internet Connection)
            </span>
          )}
        </label>
        <div className="mt-1 text-xs text-gray-500">
          {tileInfo && `${tileInfo.total_tiles} tiles (${tileInfo.total_size_mb.toFixed(1)} MB)`}
        </div>
        <button
          onClick={() => setShowClearConfirmation(true)}
          className="mt-2 w-full px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
        >
          Clear Tile Cache
        </button>
      </div>

      {/* POIs Management */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Points of Interest</label>
          <button
            onClick={() => setShowPoiForm(!showPoiForm)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showPoiForm ? 'Cancel' : 'Add POI'}
          </button>
        </div>

        {showPoiForm && (
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={newPoiName}
              onChange={(e) => setNewPoiName(e.target.value)}
              placeholder="POI Name"
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleAddPOI}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Add
            </button>
          </div>
        )}

        <div className="space-y-1">
          {pois.map(poi => (
            <div key={poi.name} className="flex items-center justify-between group bg-white/50 p-2 rounded hover:bg-white/80 transition-colors">
              <div className="flex items-center gap-2">
                {editingPoi === poi.name ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenamePOI(poi.name);
                      if (e.key === 'Escape') setEditingPoi(null);
                    }}
                    onBlur={() => handleRenamePOI(poi.name)}
                    autoFocus
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <button
                    onClick={() => map?.setView(poi.coords, map.getZoom())}
                    className="text-sm text-gray-700 hover:text-blue-600"
                  >
                    {poi.name}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!editingPoi && (
                  <>
                    <button
                      onClick={() => startEditing(poi.name)}
                      className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleRemovePOI(poi.name)}
                      className="text-xs text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clear Cache Confirmation Modal */}
      {showClearConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90%] space-y-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">Clear Tile Cache?</h3>
            </div>
            <div className="text-sm text-gray-600">
              Are you sure you want to clear the tile cache?
              {isOffline && (
                <div className="mt-2 text-yellow-600 bg-yellow-50 p-2 rounded">
                  Warning: You are in offline mode. Clearing the cache will remove all map data until you go back online to redownload it.
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleClearTiles}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Warning Modal */}
      {showOfflineWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90%] space-y-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">No Internet Connection</h3>
            </div>
            <div className="text-sm text-gray-600">
              You cannot switch to online mode because there is no internet connection available. Please check your connection and try again.
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowOfflineWarning(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
