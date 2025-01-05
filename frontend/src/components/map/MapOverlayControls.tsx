import React, { useContext, useState } from 'react';
import { MapContext } from '../../contexts/MapContext';
import POIForm from '../controlPanel/POIForm';
import POIList from '../controlPanel/POIList';
import Tooltip from '../common/Tooltip';

const MapOverlayControls: React.FC = () => {
    const {
        tileInfo,
        isOffline,
        setIsOffline,
        mapSources,
        currentSource,
        setCurrentSource,
        clearTileCache,
    } = useContext(MapContext);

    const [showPOIPanel, setShowPOIPanel] = useState(false);
    const [showMapSourcePanel, setShowMapSourcePanel] = useState(false);
    const [showClearConfirmation, setShowClearConfirmation] = useState(false);

    const handleClearTiles = async () => {
        await clearTileCache();
        setShowClearConfirmation(false);
    };

    return (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-[2001]">
            {/* Main Controls */}
            <div className="bg-white rounded-lg shadow-lg p-2 space-y-2">
                {/* Map Source Button */}
                <div className="relative">
                    <Tooltip content="Map Source">
                        <button
                            onClick={() => setShowMapSourcePanel(!showMapSourcePanel)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                        </button>
                    </Tooltip>
                    
                    {/* Map Source Panel */}
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

                {/* Offline Mode Toggle */}
                <Tooltip content={`Offline Mode (${tileInfo ? `${tileInfo.total_tiles} tiles, ${tileInfo.total_size_mb.toFixed(1)} MB` : ''})`}>
                    <button
                        onClick={() => setIsOffline(!isOffline)}
                        className={`p-2 rounded-lg transition-colors ${isOffline ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                        </svg>
                    </button>
                </Tooltip>

                {/* POI Controls */}
                <div className="relative">
                    <Tooltip content="Points of Interest">
                        <button
                            onClick={() => setShowPOIPanel(!showPOIPanel)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </Tooltip>

                    {/* POI Panel */}
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
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </Tooltip>
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