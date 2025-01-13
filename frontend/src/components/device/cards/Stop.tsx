import React, { useContext } from 'react';
import { GlobalAppContext } from '../../../context/globalAppContextDef';
import { GCSState } from '../../../context/globalAppTypes';
import { ArrowPathIcon, NoSymbolIcon } from '@heroicons/react/24/outline';
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
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                            <div className="animate-spin h-5 w-5 text-blue-600">
                                <ArrowPathIcon />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-medium text-blue-700">
                                    Stopping ping finder...
                                </div>
                                <div className="text-xs text-blue-600 mt-0.5">
                                    This may take a few seconds
                                </div>
                            </div>
                        </div>

                        {isTimeout && (
                            <>
                                <button
                                    onClick={cancelStop}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 
                                        text-red-600 bg-white border-2 border-red-200 rounded-lg 
                                        hover:bg-red-50 transition-colors"
                                >
                                    <span className="font-medium">Cancel Request</span>
                                </button>
                                <p className="text-sm text-gray-600 text-center">
                                    Request is taking longer than expected. You may cancel and try again.
                                </p>
                            </>
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