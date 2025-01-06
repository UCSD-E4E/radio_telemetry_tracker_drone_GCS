import React, { useContext } from 'react';
import { GlobalAppContext } from '../../context/globalAppContextDef';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const DroneStatus: React.FC = () => {
    const context = useContext(GlobalAppContext);
    if (!context) throw new Error('Must be inside GlobalAppProvider');

    const { isConnected, droneData, connectionMetrics, mapRef } = context;

    if (!isConnected) return null;

    const handleGoToDrone = () => {
        if (droneData && mapRef.current) {
            mapRef.current.setView([droneData.lat, droneData.long], mapRef.current.getZoom());
        }
    };

    // If connected but no data
    if (!droneData || !connectionMetrics) {
        return (
            <StatusMessage
                type="warning"
                title="Waiting for drone data..."
                message="Data may be delayed or initialization failed"
            />
        );
    }

    // Map quality indicators
    const qualityColors: Record<string, string> = {
        great: 'text-green-600',
        good: 'text-blue-600',
        ok: 'text-yellow-600',
        bad: 'text-red-600',
        critical: 'text-red-600'
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${qualityColors[connectionMetrics.connection_quality]}`} />
                    <span className={`text-sm font-medium ${
                        connectionMetrics.connection_quality === 'critical' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                        {connectionMetrics.connection_quality.charAt(0).toUpperCase() + 
                         connectionMetrics.connection_quality.slice(1)}
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
                        {connectionMetrics.ping_time}ms
                    </div>
                </div>
                <div className="p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">Packet Loss</div>
                    <div className="font-medium text-gray-700">
                        {connectionMetrics.packet_loss.toFixed(1)}%
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DroneStatus;
