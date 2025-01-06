import React, { useContext } from 'react';
import { CommsContext } from '../../contexts/CommsContext';
import CommsConfig from './comms/CommsConfig';
import DroneStatus from './DroneStatus';

const FieldDeviceControls: React.FC = () => {
    const commsContext = useContext(CommsContext);
    
    if (!commsContext) {
        throw new Error('FieldDeviceControls must be used within a CommsProvider');
    }

    const { isConnected } = commsContext;

    const handleDisconnect = async () => {
        const backend = await window.backend;
        await backend.disconnect();
        commsContext.setIsConnected(false);
    };

    return (
        <div className="space-y-4">
            {!isConnected ? (
                <div className="card">
                    <div className="border-b border-gray-200 pb-4 mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Communications</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Configure connection to the field device
                        </p>
                    </div>
                    <CommsConfig />
                </div>
            ) : (
                <>
                    <DroneStatus />
                    <button
                        onClick={handleDisconnect}
                        className="w-full px-3 py-2 text-sm text-red-600 bg-white border 
                                 border-red-200 rounded hover:bg-red-50 transition-colors"
                    >
                        Disconnect
                    </button>
                </>
            )}
        </div>
    );
};

export default FieldDeviceControls; 