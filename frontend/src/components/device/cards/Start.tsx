import React, { useContext } from 'react';
import { GlobalAppContext } from '../../../context/globalAppContextDef';
import { GCSState } from '../../../context/globalAppTypes';
import { SignalIcon } from '@heroicons/react/24/outline';
import Card from '../../common/Card';

const Start: React.FC = () => {
    const context = useContext(GlobalAppContext);
    if (!context) return null;
    const { start, cancelStart, gcsState } = context;

    const isWaiting = gcsState === GCSState.START_WAITING;
    const isTimeout = gcsState === GCSState.START_TIMEOUT;
    const isInput = gcsState === GCSState.START_INPUT;

    return (
        <Card title="Ping Finder Control">
            <div className="space-y-3">
                {(isWaiting || isTimeout) ? (
                    <div className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
                        <span className="mt-2 text-sm font-medium text-blue-700">Starting ping finder...</span>
                        {isTimeout && (
                            <button
                                onClick={cancelStart}
                                className="mt-3 px-4 py-2 text-sm font-medium text-red-600 bg-white 
                                    rounded-lg border border-red-200 hover:bg-red-50 transition-colors
                                    focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            >
                                Cancel Request
                            </button>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={start}
                        disabled={!isInput}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 
                            text-white bg-blue-600 rounded-lg hover:bg-blue-700 
                            transition-colors duration-200 disabled:bg-gray-300
                            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        <SignalIcon className="h-5 w-5" />
                        <span className="font-medium">Start Ping Finder</span>
                    </button>
                )}
                {isInput && (
                    <p className="text-xs text-gray-500 text-center">
                        Begin scanning for radio pings on configured frequencies
                    </p>
                )}
            </div>
        </Card>
    );
};

export default Start; 