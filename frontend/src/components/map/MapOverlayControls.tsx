import React, { useContext, useState } from 'react';
import { GlobalAppContext } from '../../context/globalAppContextDef';
import POIForm from '../poi/POIForm';
import POIList from '../poi/POIList';
import Tooltip from '../common/Tooltip';
import { MapIcon, TrashIcon, GlobeAltIcon, MapPinIcon as PinIcon } from '@heroicons/react/24/outline';

const MapOverlayControls: React.FC = () => {
    const context = useContext(GlobalAppContext);
    if (!context) throw new Error('MapOverlayControls must be in GlobalAppProvider');

    const {
        tileInfo,
        isOffline,
        setIsOffline,
        mapSources,
        currentSource,
        setCurrentSource,
        clearTileCache,
    } = context;

    const [showPOIPanel, setShowPOIPanel] = useState(false);
    const [showMapSourcePanel, setShowMapSourcePanel] = useState(false);
    const [showClearConfirmation, setShowClearConfirmation] = useState(false);

    const handleClearTiles = async () => {
        await clearTileCache();
        setShowClearConfirmation(false);
    };

    return (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-[2001]">
            <div className="bg-white rounded-lg shadow-lg p-2 space-y-2">
                {/* Map Source */}
                <div className="relative">
                    <Tooltip content="Map Source">
                        <button
                            onClick={() => setShowMapSourcePanel(!showMapSourcePanel)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <GlobeAltIcon className="w-6 h-6" />
                        </button>
                    </Tooltip>
                    {showMapSourcePanel && (
                        <div className="absolute right-full mr-2 top-0 bg-white rounded-lg shadow-lg p-3 w-48">
                            <select
                                value={currentSource.id}
                                onChange={(e) => {
                                    const src = mapSources.find((s) => s.id === e.target.value);
                                    if (src) setCurrentSource(src);
                                }}
                                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {mapSources.map((source) => (
                                    <option key={source.id} value={source.id}>
                                        {source.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Offline Toggle */}
                <Tooltip
                    content={`Offline Mode (${tileInfo ? `${tileInfo.total_tiles} tiles, ${tileInfo.total_size_mb.toFixed(1)} MB` : ''})`}
                >
                    <button
                        onClick={() => setIsOffline(!isOffline)}
                        className={`p-2 rounded-lg transition-colors ${isOffline ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
                            }`}
                    >
                        <MapIcon className="w-6 h-6" />
                    </button>
                </Tooltip>

                {/* POI */}
                <div className="relative">
                    <Tooltip content="Points of Interest">
                        <button
                            onClick={() => setShowPOIPanel(!showPOIPanel)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <PinIcon className="w-6 h-6" />
                        </button>
                    </Tooltip>
                    {showPOIPanel && (
                        <div className="absolute right-full mr-2 top-0 bg-white rounded-lg shadow-lg p-3 w-64">
                            <POIForm />
                            <div className="mt-2">
                                <POIList />
                            </div>
                        </div>
                    )}
                </div>

                {/* Clear Cache */}
                <Tooltip content="Clear Cache">
                    <button
                        onClick={() => setShowClearConfirmation(true)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-red-600"
                    >
                        <TrashIcon className="w-6 h-6" />
                    </button>
                </Tooltip>
            </div>

            {showClearConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
                    <div className="bg-white rounded-lg p-6 w-96 max-w-[90%] space-y-4">
                        <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h..." />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900">Clear Tile Cache?</h3>
                        </div>
                        <div className="text-sm text-gray-600">
                            Are you sure you want to clear the tile cache?
                            {isOffline && (
                                <div className="mt-2 text-yellow-600 bg-yellow-50 p-2 rounded">
                                    Warning: You are in offline mode. You'll lose all cached tiles.
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowClearConfirmation(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md focus:outline-none"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClearTiles}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none"
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

export default MapOverlayControls;
