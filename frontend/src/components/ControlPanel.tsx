import React, { useState } from 'react';
import L from 'leaflet';
import { TileInfo, POI } from '../utils/backend';
import { MapSource } from '../utils/mapSources';

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
}) => {
  const [newPoiName, setNewPoiName] = useState('');
  const [showPoiForm, setShowPoiForm] = useState(false);
  const [editingPoi, setEditingPoi] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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
    await window.backend.clear_tile_cache();
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
            onChange={(e) => setIsOffline(e.target.checked)}
            className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          Offline Mode
        </label>
        <div className="mt-1 text-xs text-gray-500">
          {tileInfo && `${tileInfo.total_tiles} tiles (${tileInfo.total_size_mb.toFixed(1)} MB)`}
        </div>
        <button
          onClick={handleClearTiles}
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
    </div>
  );
};

export default ControlPanel;
