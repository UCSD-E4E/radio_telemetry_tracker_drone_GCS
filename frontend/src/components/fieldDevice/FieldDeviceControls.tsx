import React from 'react';
import CommsConfig from './comms/CommsConfig';

const FieldDeviceControls: React.FC = () => {
    return (
        <div className="space-y-6 p-4">
            {/* Communications Panel */}
            <div className="bg-white rounded-lg shadow">
                <div className="border-b border-gray-200 p-4">
                    <h2 className="text-lg font-semibold text-gray-900">Communications</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Configure and monitor connection to the field device
                    </p>
                </div>
                <CommsConfig />
            </div>

            {/* Future panels will be added here */}
            {/* Example:
            <div className="bg-white rounded-lg shadow">
                <div className="border-b border-gray-200 p-4">
                    <h2 className="text-lg font-semibold text-gray-900">Device Status</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Monitor device health and status
                    </p>
                </div>
                <DeviceStatus />
            </div>
            */}
        </div>
    );
};

export default FieldDeviceControls; 