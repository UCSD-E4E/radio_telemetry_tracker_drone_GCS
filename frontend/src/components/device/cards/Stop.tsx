import React, { useContext } from 'react';
import { GlobalAppContext } from '../../../context/globalAppContextDef';
import { GCSState } from '../../../context/globalAppTypes';
import { NoSymbolIcon } from '@heroicons/react/24/outline';
import Card from '../../common/Card';

const Stop: React.FC = () => {
    const context = useContext(GlobalAppContext);
    if (!context) return null;
    const { stop, cancelStop, gcsState } = context;

    const isWaiting = gcsState === GCSState.STOP_WAITING;
    const isTimeout = gcsState === GCSState.STOP_TIMEOUT;
    const isInput = gcsState === GCSState.STOP_INPUT;

    return (
        <Card title="Stop Ping Finder">
            <div className="space-y-3">
                {(isWaiting || isTimeout) ? (
                    <div className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
                        <span className="mt-2 text-sm font-medium text-blue-700">Stopping ping finder...</span>
                        {isTimeout && (
                            <button
                                onClick={cancelStop}
                                className="mt-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white 
                                    rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors
                                    focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                            >
                                Cancel Request
                            </button>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={stop}
                        disabled={!isInput}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 
                            text-white bg-gray-600 rounded-lg hover:bg-gray-700 
                            transition-colors duration-200 disabled:bg-gray-300
                            focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                        <NoSymbolIcon className="h-5 w-5" />
                        <span className="font-medium">Stop Ping Finder</span>
                    </button>
                )}
                {isInput && (
                    <p className="text-xs text-gray-500 text-center">
                        Stop scanning for radio pings
                    </p>
                )}
            </div>
        </Card>
    );
};

export default Stop; 