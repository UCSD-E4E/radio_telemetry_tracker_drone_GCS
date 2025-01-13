import React, { useContext, useState } from 'react';
import { GlobalAppContext } from '../../context/globalAppContextDef';
import POIForm from '../poi/POIForm';
import POIList from '../poi/POIList';
import { 
    TrashIcon, 
    MapPinIcon,
    Squares2X2Icon,
    CloudArrowDownIcon,
    ExclamationTriangleIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

const ControlButton: React.FC<{
    label: string;
    onClick: () => void;
    icon: React.ReactNode;
    active?: boolean;
    className?: string;
    description?: string;
}> = ({ label, onClick, icon, active, className = '', description }) => (
    <button
        onClick={onClick}
        className={`group relative p-2.5 rounded-lg transition-all duration-200 ${
            active 
                ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500 ring-opacity-50' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
        } ${className}`}
        title={label}
    >
        {icon}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 min-w-[150px] 
            opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
            <div className="bg-gray-900 text-white p-2 rounded-lg shadow-lg">
                <div className="font-medium">{label}</div>
                {description && (
                    <div className="text-xs text-gray-300 mt-1">{description}</div>
                )}
            </div>
        </div>
    </button>
);

const MapOverlayControls: React.FC = () => {
    const context = useContext(GlobalAppContext);
    if (!context) throw new Error('MapOverlayControls must be in GlobalAppProvider');

    const {
        tileInfo,
        isMapOffline,
        setIsMapOfflineUser,
        mapSources,
        currentMapSource,
        setCurrentMapSource,
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
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-2.5 space-y-2.5 border border-gray-200">
                {/* Map Source */}
                <div className="relative">
                    <ControlButton
                        label="Map Style"
                        description="Change the map appearance"
                        onClick={() => setShowMapSourcePanel(!showMapSourcePanel)}
                        icon={<Squares2X2Icon className="w-6 h-6" />}
                        active={showMapSourcePanel}
                    />
                    {showMapSourcePanel && (
                        <div className="absolute right-full mr-3 top-0 bg-white rounded-lg shadow-lg p-3 w-56 border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">Select Map Style</label>
                                <button 
                                    onClick={() => setShowMapSourcePanel(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <select
                                value={currentMapSource.id}
                                onChange={(e) => {
                                    const src = mapSources.find((s) => s.id === e.target.value);
                                    if (src) setCurrentMapSource(src);
                                }}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg 
                                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                    bg-white shadow-sm"
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
                <ControlButton
                    label="Online Mode"
                    description={tileInfo 
                        ? `${tileInfo.total_tiles} tiles cached (${tileInfo.total_size_mb.toFixed(1)} MB)`
                        : "Switch to offline mode to use cached map tiles"
                    }
                    onClick={() => setIsMapOfflineUser(!isMapOffline)}
                    icon={<CloudArrowDownIcon className="w-6 h-6" />}
                    active={!isMapOffline}
                />

                {/* POI */}
                <div className="relative">
                    <ControlButton
                        label="Map Markers"
                        description="Add and manage points of interest"
                        onClick={() => setShowPOIPanel(!showPOIPanel)}
                        icon={<MapPinIcon className="w-6 h-6" />}
                        active={showPOIPanel}
                    />
                    {showPOIPanel && (
                        <div className="absolute right-full mr-3 top-0 bg-white rounded-lg shadow-lg p-4 w-72 border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-gray-900">Points of Interest</h3>
                                <button 
                                    onClick={() => setShowPOIPanel(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <POIForm />
                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <POIList />
                            </div>
                        </div>
                    )}
                </div>

                {/* Clear Cache */}
                <ControlButton
                    label="Clear Cache"
                    description="Remove all downloaded map tiles"
                    onClick={() => setShowClearConfirmation(true)}
                    icon={<TrashIcon className="w-6 h-6" />}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                />
            </div>

            {/* Clear Cache Confirmation Modal */}
            {showClearConfirmation && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[99999]">
                    <div className="bg-white rounded-xl p-6 w-96 max-w-[90%] space-y-4 shadow-xl">
                        <div className="flex items-start gap-3">
                            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Clear Map Cache?</h3>
                                <p className="mt-1 text-sm text-gray-600">
                                    This will remove all downloaded map tiles from your device.
                                </p>
                            </div>
                        </div>
                        
                        {isMapOffline && (
                            <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                                <p className="text-sm text-yellow-700">
                                    Warning: You are in offline mode. Clearing the cache will prevent map tiles from loading until you disable offline mode.
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowClearConfirmation(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 
                                    border border-gray-300 rounded-lg focus:outline-none focus:ring-2 
                                    focus:ring-gray-500 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClearTiles}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 
                                    rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 
                                    focus:ring-offset-2 transition-colors"
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
