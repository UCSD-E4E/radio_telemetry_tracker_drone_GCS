import React, { useContext } from 'react';
import { GlobalAppContext } from '../../../context/globalAppContextDef';
import { GCSState } from '../../../context/globalAppTypes';
import { ArrowPathIcon, SignalIcon } from '@heroicons/react/24/outline';
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
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                            <div className="animate-spin h-5 w-5 text-blue-600">
                                <ArrowPathIcon />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-medium text-blue-700">
                                    Starting ping finder...
                                </div>
                                <div className="text-xs text-blue-600 mt-0.5">
                                    This may take a few seconds
                                </div>
                            </div>
                        </div>

                        {isTimeout && (
                            <>
                                <button
                                    onClick={cancelStart}
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