import React, { useState } from 'react';
import DeviceControls from './components/device/DeviceControls';
import FrequencyManager from './components/manager/FrequencyManager';
import MapContainer from './components/map/MapContainer';
import MapOverlayControls from './components/map/MapOverlayControls';
import { ComputerDesktopIcon, MapIcon } from '@heroicons/react/24/outline';

const MainLayout: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'device' | 'map'>('device');

    return (
        <div className="h-screen w-screen flex bg-gray-50">
            {/* Sidebar */}
            <div className="w-96 card flex flex-col relative z-[2000]">
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-2xl font-bold text-gray-800">
                        Radio Telemetry Tracker
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Drone Ground Control Station
                    </p>
                </div>

                <div className="flex px-4 pt-4">
                    <TabButton
                        active={activeTab === 'device'}
                        onClick={() => setActiveTab('device')}
                        icon={<ComputerDesktopIcon className="w-5 h-5" />}
                        label="Field Device"
                    />
                    <TabButton
                        active={activeTab === 'map'}
                        onClick={() => setActiveTab('map')}
                        icon={<MapIcon className="w-5 h-5" />}
                        label="Frequencies"
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === 'device' ? <DeviceControls /> : <FrequencyManager />}
                </div>
            </div>

            <div className="flex-1 relative">
                <MapContainer />
                <MapOverlayControls />
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
      flex items-center gap-2 px-4 py-3 rounded-t-lg
      transition-all duration-200 flex-1
      ${active ? 'bg-white text-blue-500 shadow-sm' : 'text-gray-600 hover:text-blue-500 bg-gray-50'}
    `}
    >
        {icon}
        <span className="text-sm font-medium">{label}</span>
    </button>
);

export default MainLayout;
