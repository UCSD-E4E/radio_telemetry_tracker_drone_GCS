import React, { useContext } from 'react';
import { CommsContext } from '../../contexts/CommsContext';
import { MapContext } from '../../contexts/MapContext';

const DroneStatus: React.FC = () => {
    const commsContext = useContext(CommsContext);
    const mapContext = useContext(MapContext);

    if (!commsContext) {
        throw new Error('DroneStatus must be used within a CommsProvider');
    }

    const { isConnected, droneData } = commsContext;

    const handleGoToDrone = () => {
        if (droneData && mapContext.mapRef.current) {
            mapContext.mapRef.current.setView([droneData.lat, droneData.long], mapContext.mapRef.current.getZoom());
        }
    };

    if (!isConnected) return null;

    // Show warning if connected but no drone data yet
    if (!droneData) {
        return (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-700">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <span className="font-medium">Waiting for drone data...</span>
                </div>
                <p className="mt-1 text-sm text-yellow-600 pl-7">
                    GPS data may be delayed or initialization failed
                </p>
            </div>
        );
    }

    // Map quality to color
    const qualityColors = {
        great: 'bg-green-600',
        good: 'bg-green-500',
        ok: 'bg-yellow-500',
        bad: 'bg-orange-500',
        critical: 'bg-red-500'
    } as const;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${qualityColors[droneData.connection_quality]}`} />
                    <span className={`text-sm font-medium ${droneData.connection_quality === 'critical' ? 'text-red-600' : 'text-gray-600'}`}>
                        {droneData.connection_quality.charAt(0).toUpperCase() + droneData.connection_quality.slice(1)}
                    </span>
                </div>
                <button
                    onClick={handleGoToDrone}
                    className="text-sm px-3 py-1.5 rounded focus:outline-none 
                             transition-all duration-200 bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                    Go To Drone
                </button>
            </div>

            <div className="grid grid-cols-2 divide-x divide-gray-100">
                <div className="p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">Avg. Ping</div>
                    <div className="font-medium text-gray-700">
                        {droneData.ping_time}ms
                    </div>
                </div>

                <div className="p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">Packet Loss</div>
                    <div className="font-medium text-gray-700">
                        {droneData.packet_loss.toFixed(1)}%
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DroneStatus; 