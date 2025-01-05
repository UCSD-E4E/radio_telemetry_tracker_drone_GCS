import React, { useState } from 'react';
import FieldDeviceControls from './components/fieldDevice/FieldDeviceControls';
import ControlPanel from './components/controlPanel/ControlPanel';
import MapContainer from './components/map/MapContainer';
import { DeviceIcon, MapIcon } from './components/icons';

/**
 * Main two-pane layout:
 * Left side: Leaflet map
 * Right side: Tabs for Field Device Controls or Map Controls.
 */
const MainLayout: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'device' | 'map'>('device');

    return (
        <div className="h-screen w-screen flex bg-gray-50">
            {/* Sidebar */}
            <div className="w-96 bg-white shadow-lg flex flex-col relative z-[2000]">
                {/* Header */}
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-2xl font-bold text-gray-800">
                        Radio Telemetry Tracker
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Drone Ground Control Station
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex px-4 pt-4">
                    <TabButton 
                        active={activeTab === 'device'}
                        onClick={() => setActiveTab('device')}
                        icon={<DeviceIcon />}
                        label="Field Device"
                    />
                    <TabButton 
                        active={activeTab === 'map'}
                        onClick={() => setActiveTab('map')}
                        icon={<MapIcon />}
                        label="Map Controls"
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-white p-4">
                    {activeTab === 'device' ? (
                        <FieldDeviceControls />
                    ) : (
                        <ControlPanel />
                    )}
                </div>
            </div>

            {/* Map */}
            <div className="flex-1 relative">
                <MapContainer />
            </div>
        </div>
    );
};

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`
            flex items-center gap-2 px-4 py-3 rounded-t-lg transition-all duration-200 flex-1
            ${active 
                ? 'bg-white text-blue-500 shadow-sm' 
                : 'text-gray-600 hover:text-blue-500 bg-gray-50'
            }
        `}
    >
        {icon}
        <span className="text-sm font-medium">{label}</span>
    </button>
);

export default MainLayout;
