import React, { useContext } from 'react';
import { GlobalAppContext } from '../../context/globalAppContextDef';
import CommsConfig from './comms/CommsConfig';
import DroneStatus from './DroneStatus';

const DeviceControls: React.FC = () => {
    const context = useContext(GlobalAppContext);
    if (!context) throw new Error('DeviceControls must be used within GlobalAppProvider');

    const { isConnected, setIsConnected } = context;

    const handleDisconnect = async () => {
        if (!window.backend) return;
        await window.backend.disconnect();
        setIsConnected(false);
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

export default DeviceControls;
