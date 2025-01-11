import React, { useContext, useState } from 'react';
import { GlobalAppContext } from '../../../context/globalAppContextDef';
import Card from '../../common/Card';
import { PowerIcon } from '@heroicons/react/24/outline';

const Disconnect: React.FC = () => {
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const context = useContext(GlobalAppContext);
    if (!context) return null;
    const { disconnect } = context;

    const handleDisconnect = async () => {
        setIsDisconnecting(true);
        await disconnect();
    };

    return (
        <Card>
            <div className="space-y-2">
                {isDisconnecting ? (
                    <div className="flex flex-col items-center justify-center py-3 px-4 bg-red-50 rounded-lg border border-red-100">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-600 border-t-transparent" />
                        <span className="mt-2 text-sm font-medium text-red-700">Disconnecting...</span>
                    </div>
                ) : showConfirm ? (
                    <div className="space-y-3">
                        <div className="text-sm text-gray-700 text-center">
                            Are you sure you want to disconnect?
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleDisconnect}
                                className="flex-1 px-3 py-2 text-sm text-white bg-red-600 
                                    rounded hover:bg-red-700 transition-colors focus:outline-none 
                                    focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            >
                                Yes, Disconnect
                            </button>
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 px-3 py-2 text-sm text-gray-700 bg-white border 
                                    border-gray-300 rounded hover:bg-gray-50 transition-colors
                                    focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 
                            text-red-600 bg-white border-2 border-red-200 rounded-lg 
                            hover:bg-red-50 hover:border-red-300 transition-all duration-200
                            focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                        <PowerIcon className="h-5 w-5" />
                        <span className="font-medium">Disconnect Device</span>
                    </button>
                )}
            </div>
        </Card>
    );
};

export default Disconnect; 