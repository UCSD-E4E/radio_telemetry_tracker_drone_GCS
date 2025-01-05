import React, { useState, useContext } from 'react';
import { MapContext } from '../../contexts/MapContext';

const POIForm: React.FC = () => {
    const { addPOI, loadPOIs, mapRef } = useContext(MapContext);
    const [poiName, setPoiName] = useState('');

    const handleAdd = async () => {
        if (!poiName.trim()) return;
        
        // Get current map center
        const center = mapRef.current?.getCenter();
        const coords: [number, number] = center 
            ? [center.lat, center.lng]
            : [0, 0];

        const success = await addPOI(poiName.trim(), coords);
        if (success) {
            loadPOIs();
            setPoiName('');
        }
    };

    return (
        <div className="mb-3">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={poiName}
                    onChange={(e) => setPoiName(e.target.value)}
                    placeholder="POI Name"
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 
                     rounded focus:outline-none focus:ring-2 
                     focus:ring-blue-500"
                />
                <button
                    onClick={handleAdd}
                    className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded 
                     hover:bg-blue-600 transition-colors"
                >
                    Add POI
                </button>
            </div>
        </div>
    );
};

export default POIForm;
