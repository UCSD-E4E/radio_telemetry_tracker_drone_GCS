import React, { useContext, useState } from 'react';
import { GlobalAppContext } from '../../context/globalAppContextDef';
import type { POI } from '../../types/global';
import { logToPython } from '../../utils/logging';
import { 
    MapPinIcon, 
    PencilIcon, 
    TrashIcon, 
    CheckIcon, 
    XMarkIcon,
    ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

interface POIItemProps {
    poi: POI;
    onRemove: (name: string) => void;
    onGoto: (coords: [number, number]) => void;
    onRename: (oldName: string, newName: string) => void;
}

const POIItem: React.FC<POIItemProps> = ({ poi, onRemove, onGoto, onRename }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(poi.name);
    const [isHovered, setIsHovered] = useState(false);

    const handleRename = () => {
        if (newName.trim() && newName !== poi.name) {
            onRename(poi.name, newName.trim());
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setNewName(poi.name);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRename();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    return (
        <div 
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <MapPinIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            
            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <div className="flex items-center gap-1">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 
                                rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                        <button
                            onClick={handleRename}
                            className="p-1 text-green-600 hover:text-green-700 
                                rounded hover:bg-green-50"
                            title="Save"
                        >
                            <CheckIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleCancel}
                            className="p-1 text-gray-400 hover:text-gray-500 
                                rounded hover:bg-gray-100"
                            title="Cancel"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900 truncate">{poi.name}</span>
                        <div className={`flex items-center gap-1 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                            <button
                                onClick={() => onGoto(poi.coords)}
                                className="p-1 text-blue-600 hover:text-blue-700 
                                    rounded hover:bg-blue-50"
                                title="Go to location"
                            >
                                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-1 text-gray-400 hover:text-gray-500 
                                    rounded hover:bg-gray-100"
                                title="Rename"
                            >
                                <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onRemove(poi.name)}
                                className="p-1 text-red-500 hover:text-red-600 
                                    rounded hover:bg-red-50"
                                title="Remove"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const POIList: React.FC = () => {
    const context = useContext(GlobalAppContext);
    if (!context) throw new Error('POIList must be used inside GlobalAppProvider');

    const { pois, loadPOIs, removePOI, mapRef } = context;

    const handleRemovePOI = async (name: string) => {
        const success = await removePOI(name);
        if (success) {
            loadPOIs();
        }
    };

    const handleGotoPOI = (coords: [number, number]) => {
        if (mapRef.current) {
            mapRef.current.setView(coords, mapRef.current.getZoom());
        }
    };

    const handleRenamePOI = async (oldName: string, newName: string) => {
        if (window.backend) {
            try {
                const success = await window.backend.rename_poi(oldName, newName);
                if (success) {
                    loadPOIs();
                }
            } catch (err) {
                const errorMsg = `Error renaming POI from ${oldName} to ${newName}: ${err}`;
                console.error(errorMsg);
                logToPython(errorMsg);
            }
        }
    };

    return (
        <div className="mt-4">
            <div className="space-y-1">
                {pois.map((poi) => (
                    <POIItem
                        key={poi.name}
                        poi={poi}
                        onRemove={handleRemovePOI}
                        onGoto={handleGotoPOI}
                        onRename={handleRenamePOI}
                    />
                ))}
                {pois.length === 0 && (
                    <div className="flex items-center gap-2 p-3 text-sm text-gray-500 
                        bg-gray-50 rounded-lg border border-gray-100">
                        <MapPinIcon className="w-5 h-5" />
                        <span>No locations added yet</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default POIList;
