import React, { useContext } from 'react';
import { GlobalAppContext } from '../../../context/globalAppContextDef';
import { MapPinIcon, SignalIcon, ClockIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import Card from '../../common/Card';
import { useConnectionQuality } from '../../../hooks/useConnectionQuality';

enum ConnectionQuality {
    DISCONNECTED = 0,
    POOR = 1,
    FAIR = 2,
    GOOD = 3,
    EXCELLENT = 4,
    OPTIMAL = 5
}

const getConnectionQualityFromState = (quality: number): ConnectionQuality => {
    switch (quality) {
        case 5:
            return ConnectionQuality.OPTIMAL;
        case 4:
            return ConnectionQuality.EXCELLENT;
        case 3:
            return ConnectionQuality.GOOD;
        case 2:
            return ConnectionQuality.FAIR;
        case 1:
            return ConnectionQuality.POOR;
        case 0:
            return ConnectionQuality.DISCONNECTED;
        default:
            return ConnectionQuality.DISCONNECTED;
    }
};

const getConnectionQualityColor = (quality: ConnectionQuality) => {
    switch (quality) {
        case ConnectionQuality.OPTIMAL:
        case ConnectionQuality.EXCELLENT:
            return 'bg-green-500';
        case ConnectionQuality.GOOD:
            return 'bg-blue-500';
        case ConnectionQuality.FAIR:
            return 'bg-yellow-500';
        case ConnectionQuality.POOR:
            return 'bg-red-500';
        default:
            return 'bg-gray-300';
    }
};

const ConnectionQualityIndicator: React.FC<{ quality: ConnectionQuality }> = ({ quality }) => {
    const color = getConnectionQualityColor(quality);
    return (
        <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
                <div
                    key={i}
                    className={`h-1.5 w-4 rounded-full transition-colors ${
                        i < quality ? color : 'bg-gray-200'
                    }`}
                />
            ))}
        </div>
    );
};

const DroneStatus: React.FC = () => {
    const context = useContext(GlobalAppContext);
    if (!context) throw new Error('Must be inside GlobalAppProvider');

    const { connectionStatus, gpsData, mapRef } = context;
    const isConnected = connectionStatus === 1;
    const { connectionQuality, pingTime, gpsFrequency } = useConnectionQuality(gpsData, isConnected);
    const quality = getConnectionQualityFromState(connectionQuality);

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
        4: 'Excellent Range',
        3: 'Good Range',
        2: 'Fair Range',
        1: 'Poor Range',
        0: 'Disconnected'
    };

    return (
        <Card title="Drone Status">
            <div className="space-y-4">
                {/* Connection Status */}
                <div className={`p-4 rounded-lg border ${qualityColors[quality].border} ${qualityColors[quality].bg}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <SignalIcon className={`h-5 w-5 ${qualityColors[quality].text}`} />
                            <div>
                                <div className={`text-sm font-medium ${qualityColors[quality].text}`}>
                                    {qualityText[quality]}
                                </div>
                                <div className="flex gap-1 mt-1">
                                    <ConnectionQualityIndicator quality={quality} />
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
