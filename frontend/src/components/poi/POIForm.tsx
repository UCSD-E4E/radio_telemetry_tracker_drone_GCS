import React, { useContext, useState } from 'react';
import { GlobalAppContext } from '../../context/globalAppContextDef';
import { MapPinIcon, PlusIcon } from '@heroicons/react/24/outline';

const POIForm: React.FC = () => {
    const context = useContext(GlobalAppContext);
    if (!context) throw new Error('POIForm must be used inside GlobalAppProvider');

    const { addPOI, loadPOIs, mapRef } = context;
    const [poiName, setPoiName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAdd = async () => {
        if (!poiName.trim()) return;
        
        setIsSubmitting(true);
        const center = mapRef.current?.getCenter();
        const coords: [number, number] = center ? [center.lat, center.lng] : [0, 0];
        
        try {
            const success = await addPOI(poiName.trim(), coords);
            if (success) {
                loadPOIs();
                setPoiName('');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAdd();
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MapPinIcon className="w-4 h-4" />
                <span>Add New Location</span>
            </div>
            
            <div className="relative">
                <input
                    type="text"
                    value={poiName}
                    onChange={(e) => setPoiName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter location name..."
                    className="w-full pl-3 pr-24 py-2 text-sm border border-gray-300 
                        rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 
                        focus:border-blue-500 placeholder-gray-400
                        transition-shadow duration-200"
                    disabled={isSubmitting}
                />
                <button
                    onClick={handleAdd}
                    disabled={!poiName.trim() || isSubmitting}
                    className={`absolute right-1 top-1 bottom-1 px-3 rounded-md 
                        flex items-center gap-1.5 text-sm font-medium transition-all
                        ${!poiName.trim() || isSubmitting
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
                        }`}
                >
                    <PlusIcon className="w-4 h-4" />
                    <span>Add</span>
                </button>
            </div>
            
            <p className="text-xs text-gray-500">
                The marker will be placed at the current map center
            </p>
        </div>
    );
};

export default POIForm;
