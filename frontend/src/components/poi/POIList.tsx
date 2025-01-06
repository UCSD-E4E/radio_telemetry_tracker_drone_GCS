import React, { useContext, useState } from 'react';
import { GlobalAppContext } from '../../context/globalAppContextDef';
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
                    className="input"
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
                        className="btn-outline text-xs opacity-0 group-hover:opacity-100"
                    >
                        Edit
                    </button>
                </div>
            )}
            <button
                onClick={() => onRemove(poi.name)}
                className="btn-danger text-xs opacity-0 group-hover:opacity-100 ml-2"
            >
                Remove
            </button>
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
                {pois.length === 0 && (
                    <div className="text-sm text-gray-400">No POIs found.</div>
                )}
            </div>
        </div>
    );
};

export default POIList;
