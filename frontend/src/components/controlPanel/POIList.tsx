import React, { useContext, useState } from 'react';
import { MapContext } from '../../contexts/MapContext';
import type { POI } from '../../types/global';

interface POIItemProps {
    poi: POI;
    onRemove: (name: string) => void;
    onGoto: (coords: [number, number]) => void;
    onRename: (oldName: string, newName: string) => void;
}

const POIItem: React.FC<POIItemProps> = ({ poi, onRemove, onGoto, onRename }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(poi.name);

    const handleRename = () => {
        if (newName.trim() && newName !== poi.name) {
            onRename(poi.name, newName.trim());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRename();
        } else if (e.key === 'Escape') {
            setNewName(poi.name);
            setIsEditing(false);
        }
    };

    return (
        <div className="flex items-center justify-between p-2 rounded hover:bg-white/80 transition-colors group">
            {isEditing ? (
                <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={handleKeyDown}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                />
            ) : (
                <div className="flex gap-2 items-center flex-1">
                    <button
                        onClick={() => onGoto(poi.coords)}
                        className="text-sm text-gray-700 hover:text-blue-600"
                    >
                        {poi.name}
                    </button>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        Edit
                    </button>
                </div>
            )}
            <button
                onClick={() => onRemove(poi.name)}
                className="text-xs text-red-600 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
            >
                Remove
            </button>
        </div>
    );
};

const POIList: React.FC = () => {
    const { pois, loadPOIs, removePOI, mapRef } = useContext(MapContext);

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
            const success = await window.backend.rename_poi(oldName, newName);
            if (success) {
                loadPOIs();
            }
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                    Points of Interest
                </label>
            </div>
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
                {pois.length === 0 && <div className="text-sm text-gray-400">No POIs found.</div>}
            </div>
        </div>
    );
};

export default POIList;
