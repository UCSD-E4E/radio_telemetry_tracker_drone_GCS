import React from 'react';
import { useMap } from 'react-leaflet';

const ZoomControl: React.FC = () => {
    const map = useMap();

    return (
        <div className="absolute bottom-4 left-4 z-[400]">
            <div className="bg-white/95 rounded-lg shadow-lg p-1">
                <div className="leaflet-control-zoom leaflet-bar">
                    <button
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        onClick={() => map.zoomIn()}
                    >
                        +
                    </button>
                    <button
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors border-t"
                        onClick={() => map.zoomOut()}
                    >
                        −
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ZoomControl;
