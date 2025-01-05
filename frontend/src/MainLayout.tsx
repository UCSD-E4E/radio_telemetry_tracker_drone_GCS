import React, { useState } from 'react';
import CommsConfig from './components/comms/CommsConfig';
import ControlPanel from './components/controlPanel/ControlPanel.tsx';
import MapContainer from './components/map/MapContainer';

/**
 * Main two-pane layout:
 * Left side: Leaflet map
 * Right side: Tabs for Communications or Map Controls (like old design).
 */
const MainLayout: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'comms' | 'map'>('comms');

    return (
        <div className="h-screen w-screen flex">
            {/* Left side: the map */}
            <div className="flex-1 relative">
                <MapContainer />
            </div>

            {/* Right side panel - using a higher z-index to create a new stacking context */}
            <div className="w-80 bg-white shadow-lg flex flex-col relative z-[2000]">
                {/* Header */}
                <div className="p-4 border-b border-gray-200">
                    <h1 className="text-xl font-semibold text-gray-800">RTT Drone GCS</h1>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'comms'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                        onClick={() => setActiveTab('comms')}
                    >
                        Communications
                    </button>
                    <button
                        className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'map'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                        onClick={() => setActiveTab('map')}
                    >
                        Map Controls
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'comms' ? (
                        <div className="p-4">
                            <CommsConfig />
                        </div>
                    ) : (
                        <div className="p-4">
                            <ControlPanel />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MainLayout;
