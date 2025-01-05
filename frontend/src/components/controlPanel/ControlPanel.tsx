import React, { useContext, useState } from 'react';
import { MapContext } from '../../contexts/MapContext';
import POIForm from './POIForm';
import POIList from './POIList';
import FrequencyLayersControl from './FrequencyLayersControl';

const ControlPanel: React.FC = () => {
    const {
        tileInfo,
        isOffline,
        setIsOffline,
        mapSources,
        currentSource,
        setCurrentSource,
        clearTileCache,
        clearAllData,
    } = useContext(MapContext);

    const [showClearConfirmation, setShowClearConfirmation] = useState(false);

    const handleClearTiles = async () => {
        await clearTileCache();
        setShowClearConfirmation(false);
    };

    return (
        <div className="space-y-6">
            {/* Map Source Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Map Source</label>
                <select
                    value={currentSource.id}
                    onChange={(e) => {
                        const src = mapSources.find((s) => s.id === e.target.value);
                        if (src) setCurrentSource(src);
                    }}
                    className="w-full px-3 py-2 bg-white border border-gray-300 
                     rounded-md shadow-sm focus:outline-none 
                     focus:ring-2 focus:ring-blue-500"
                >
                    {mapSources.map((source) => (
                        <option key={source.id} value={source.id}>
                            {source.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Offline mode */}
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
                    {tileInfo &&
                        `${tileInfo.total_tiles} tiles (${tileInfo.total_size_mb.toFixed(1)} MB)`}
                </div>
                <button
                    onClick={() => setShowClearConfirmation(true)}
                    className="mt-2 w-full px-3 py-1.5 text-sm text-red-600 
                     border border-red-200 rounded hover:bg-red-50"
                >
                    Clear Tile Cache
                </button>
            </div>

            {/* POIs */}
            <POIForm />
            <POIList />

            {/* Frequency Layers Control */}
            <FrequencyLayersControl />

            {/* Clear all data */}
            <button
                onClick={() => clearAllData()}
                className="w-full px-3 py-1.5 text-sm text-red-600 
                   border border-red-200 rounded hover:bg-red-50"
            >
                Clear All Data
            </button>

            {/* Confirm Clear Modal */}
            {showClearConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
                    <div className="bg-white rounded-lg p-6 w-96 max-w-[90%] space-y-4 shadow-xl">
                        <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 
                     4h13.856c1.54 0 2.502-1.667 
                     1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 
                     0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900">Clear Tile Cache?</h3>
                        </div>
                        <div className="text-sm text-gray-600">
                            Are you sure you want to clear the tile cache?
                            {isOffline && (
                                <div className="mt-2 text-yellow-600 bg-yellow-50 p-2 rounded">
                                    Warning: You are in offline mode. You’ll lose all cached tiles.
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowClearConfirmation(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 
                           hover:bg-gray-50 border border-gray-300 
                           rounded-md focus:outline-none"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClearTiles}
                                className="px-4 py-2 text-sm font-medium text-white 
                           bg-red-600 hover:bg-red-700 rounded-md 
                           focus:outline-none"
                            >
                                Clear Cache
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ControlPanel;
