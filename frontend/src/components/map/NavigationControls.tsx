import React from 'react';
import { useMap } from 'react-leaflet';
import { 
    ChevronUpIcon, 
    ChevronDownIcon, 
    ChevronLeftIcon, 
    ChevronRightIcon, 
    PlusIcon, 
    MinusIcon,
    ArrowsPointingInIcon,
    HomeIcon
} from '@heroicons/react/24/outline';

interface ControlButtonProps {
    onClick: () => void;
    title: string;
    icon: React.ReactNode;
    className?: string;
}

const ControlButton: React.FC<ControlButtonProps> = ({ onClick, title, icon, className = '' }) => (
    <button
        onClick={onClick}
        title={title}
        className={`w-8 h-8 flex items-center justify-center transition-all duration-200
            hover:bg-gray-100 active:bg-gray-200 focus:outline-none focus:ring-2 
            focus:ring-blue-500 focus:ring-opacity-50 ${className}`}
    >
        {icon}
    </button>
);

const NavigationControls: React.FC = () => {
    const map = useMap();
    const panAmount = 100; // pixels to pan

    const handleResetView = () => {
        map.setView([32.8801, -117.2340], 13);
    };

    const handleFitBounds = () => {
        if (map.getBounds().isValid()) {
            map.fitBounds(map.getBounds());
        }
    };

    return (
        <div className="absolute bottom-4 left-4 z-[400] flex flex-col gap-2">
            {/* Zoom Controls */}
            <div className="flex flex-col gap-2">
                {/* Zoom In/Out */}
                <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-1.5 border border-gray-200 w-fit">
                    <div className="flex flex-col gap-1">
                        <ControlButton
                            onClick={() => map.zoomIn()}
                            title="Zoom in"
                            icon={<PlusIcon className="w-5 h-5" />}
                            className="rounded-lg text-gray-700 hover:text-gray-900"
                        />
                        <div className="h-px bg-gray-200" />
                        <ControlButton
                            onClick={() => map.zoomOut()}
                            title="Zoom out"
                            icon={<MinusIcon className="w-5 h-5" />}
                            className="rounded-lg text-gray-700 hover:text-gray-900"
                        />
                    </div>
                </div>

                {/* View Controls */}
                <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-1.5 border border-gray-200 w-fit">
                    <div className="flex flex-col gap-1">
                        <ControlButton
                            onClick={handleFitBounds}
                            title="Fit to view"
                            icon={<ArrowsPointingInIcon className="w-5 h-5" />}
                            className="rounded-lg text-gray-700 hover:text-gray-900"
                        />
                        <div className="h-px bg-gray-200" />
                        <ControlButton
                            onClick={handleResetView}
                            title="Reset view"
                            icon={<HomeIcon className="w-5 h-5" />}
                            className="rounded-lg text-gray-700 hover:text-gray-900"
                        />
                    </div>
                </div>
            </div>

            {/* Pan Controls */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-1.5 border border-gray-200">
                <div className="grid grid-cols-3 gap-1 w-[7.5rem]">
                    <div className="col-start-2">
                        <ControlButton
                            onClick={() => map.panBy([0, -panAmount])}
                            title="Pan up"
                            icon={<ChevronUpIcon className="w-5 h-5" />}
                            className="rounded-lg text-gray-700 hover:text-gray-900"
                        />
                    </div>
                    <div className="col-start-1 row-start-2">
                        <ControlButton
                            onClick={() => map.panBy([-panAmount, 0])}
                            title="Pan left"
                            icon={<ChevronLeftIcon className="w-5 h-5" />}
                            className="rounded-lg text-gray-700 hover:text-gray-900"
                        />
                    </div>
                    <div className="col-start-3 row-start-2">
                        <ControlButton
                            onClick={() => map.panBy([panAmount, 0])}
                            title="Pan right"
                            icon={<ChevronRightIcon className="w-5 h-5" />}
                            className="rounded-lg text-gray-700 hover:text-gray-900"
                        />
                    </div>
                    <div className="col-start-2 row-start-3">
                        <ControlButton
                            onClick={() => map.panBy([0, panAmount])}
                            title="Pan down"
                            icon={<ChevronDownIcon className="w-5 h-5" />}
                            className="rounded-lg text-gray-700 hover:text-gray-900"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NavigationControls;
