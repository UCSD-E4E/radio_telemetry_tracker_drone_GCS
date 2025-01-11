import React, { useContext } from 'react';
import { GlobalAppContext } from '../../../context/globalAppContextDef';
import { MapPinIcon, SignalIcon, ClockIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import Card from '../../common/Card';

const DroneStatus: React.FC = () => {
    const context = useContext(GlobalAppContext);
    if (!context) throw new Error('Must be inside GlobalAppProvider');

    const { connectionStatus, gpsData, mapRef, connectionQuality, pingTime, gpsFrequency } = context;

    const isConnected = connectionStatus === 1;

    const handleGoToDrone = () => {
        if (gpsData && mapRef.current) {
            mapRef.current.setView([gpsData.lat, gpsData.long], mapRef.current.getZoom());
        }
    };

    // Map quality indicators
    const qualityColors: Record<number, { bg: string, text: string, border: string }> = {
        5: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
        4: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
        3: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
        2: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
        1: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
        0: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
    };

    const qualityText: Record<number, string> = {
        5: 'Optimal Range',
        4: 'Good Range',
        3: 'Moderate Range',
        2: 'Weak Range',
        1: 'Out of Range',
        0: 'Disconnected'
    };

    const qualityBars: Record<number, number> = {
        5: 4,
        4: 3,
        3: 2,
        2: 1,
        1: 1,
        0: 0
    };

    return (
        <Card title="Drone Status">
            <div className="space-y-4">
                {/* Connection Status */}
                <div className={`p-4 rounded-lg border ${qualityColors[connectionQuality].border} ${qualityColors[connectionQuality].bg}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <SignalIcon className={`h-5 w-5 ${qualityColors[connectionQuality].text}`} />
                            <div>
                                <div className={`text-sm font-medium ${qualityColors[connectionQuality].text}`}>
                                    {qualityText[connectionQuality]}
                                </div>
                                <div className="flex gap-1 mt-1">
                                    {[...Array(4)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-1.5 w-4 rounded-full transition-colors ${
                                                i < qualityBars[connectionQuality]
                                                    ? qualityColors[connectionQuality].text.replace('text', 'bg')
                                                    : 'bg-gray-200'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleGoToDrone}
                            disabled={!gpsData}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
                                transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
                                ${gpsData 
                                    ? 'bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500'
                                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            <MapPinIcon className="h-4 w-4" />
                            Locate
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <ClockIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-xs font-medium text-gray-500">Average Ping</span>
                        </div>
                        <div className={`text-lg font-semibold ${isConnected ? 'text-gray-900' : 'text-gray-400'}`}>
                            {isConnected && gpsData ? `${Math.round(pingTime)}ms` : '--'}
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <GlobeAltIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-xs font-medium text-gray-500">GPS Frequency</span>
                        </div>
                        <div className={`text-lg font-semibold ${isConnected ? 'text-gray-900' : 'text-gray-400'}`}>
                            {isConnected && gpsData ? `${gpsFrequency.toFixed(1)}Hz` : '--'}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default DroneStatus;
