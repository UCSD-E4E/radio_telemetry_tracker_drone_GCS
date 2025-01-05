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
            {/* Compact Settings Group */}
            <div className="space-y-3">
                {/* Map Source */}
                <div className="bg-white/50 rounded-lg p-3 border border-gray-200">
                    <select
                        value={currentSource.id}
                        onChange={(e) => {
                            const src = mapSources.find((s) => s.id === e.target.value);
                            if (src) setCurrentSource(src);
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 
                         rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        {mapSources.map((source) => (
                            <option key={source.id} value={source.id}>
                                {source.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Cache Settings */}
                <div className="bg-white/50 rounded-lg p-3 border border-gray-200">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={isOffline}
                            onChange={(e) => setIsOffline(e.target.checked)}
                            className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                            <span className="font-medium">Offline Mode</span>
                            {tileInfo && (
                                <span className="text-xs text-gray-500 ml-2">
                                    {tileInfo.total_tiles} tiles ({tileInfo.total_size_mb.toFixed(1)} MB)
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setShowClearConfirmation(true)}
                            className="text-xs text-red-600 hover:text-red-800"
                        >
                            Clear Cache
                        </button>
                    </label>
                </div>

                {/* POIs */}
                <div className="bg-white/50 rounded-lg p-3 border border-gray-200">
                    <POIForm />
                    <div className="mt-2">
                        <POIList />
                    </div>
                </div>
            </div>

            {/* Frequency Layers (More Prominent) */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Frequency Layers</h3>
                <FrequencyLayersControl />
            </div>

            {/* Clear All Data */}
            <button
                onClick={() => clearAllData()}
                className="w-full px-4 py-2 text-sm text-red-600 
                 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
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
