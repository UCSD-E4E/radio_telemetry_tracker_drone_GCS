import React, { useState, useContext, useEffect } from 'react';
import { GlobalAppContext } from '../../../context/globalAppContextDef';
import { PlayIcon, StopIcon, WifiIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { RadioConfig } from '../../../types/global';

interface SimulatorPopupProps {
    isOpen: boolean;
    onClose: () => void;
}

const SimulatorPopup: React.FC<SimulatorPopupProps> = ({ isOpen, onClose }) => {
    const context = useContext(GlobalAppContext);
    if (!context) throw new Error('SimulatorPopup must be used within GlobalAppProvider');

    const {
        radioConfig,
        setRadioConfig,
        isSimulatorRunning,
        initSimulator,
        cleanupSimulator
    } = context;

    const [showAdvanced, setShowAdvanced] = useState(false);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: globalThis.KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    if (!isOpen) return null;

    const handleHostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRadioConfig({
            ...radioConfig,
            host: e.target.value
        });
    };

    const handleTcpPortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        if (!isNaN(value)) {
            setRadioConfig({
                ...radioConfig,
                tcpPort: value
            });
        }
    };

    const handleAckTimeoutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        if (!isNaN(value)) {
            setRadioConfig({
                ...radioConfig,
                ackTimeout: value
            });
        }
    };

    const handleMaxRetriesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        if (!isNaN(value)) {
            setRadioConfig({
                ...radioConfig,
                maxRetries: value
            });
        }
    };

    const handleStartSimulator = async () => {
        const config: RadioConfig = {
            interface_type: 'simulated',
            port: '',
            baudrate: radioConfig.baudRate,
            host: radioConfig.host,
            tcp_port: radioConfig.tcpPort,
            ack_timeout: radioConfig.ackTimeout / 1000, // Convert to seconds
            max_retries: radioConfig.maxRetries
        };
        await initSimulator(config);
    };

    const handleStopSimulator = async () => {
        await cleanupSimulator();
    };

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 z-50"
                onClick={onClose}
            />
            
            {/* Popup */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md 
                bg-white rounded-xl shadow-xl z-50 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Simulator Control Panel</h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Status Indicator */}
                    <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                        isSimulatorRunning 
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}>
                        <div className={`h-2.5 w-2.5 rounded-full ${
                            isSimulatorRunning ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <span className="font-medium">
                            {isSimulatorRunning ? 'Simulator Running' : 'Simulator Stopped'}
                        </span>
                    </div>

                    {/* Connection Settings */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Host
                            </label>
                            <input
                                type="text"
                                value={radioConfig.host}
                                onChange={handleHostChange}
                                placeholder="localhost"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                                    shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                TCP Port
                            </label>
                            <input
                                type="number"
                                value={radioConfig.tcpPort}
                                onChange={handleTcpPortChange}
                                min={1024}
                                max={65535}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                                    shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Advanced Settings Toggle */}
                    <div className="pt-2">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
                        >
                            <WifiIcon className="h-4 w-4" />
                            {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
                        </button>
                    </div>

                    {/* Advanced Settings */}
                    {showAdvanced && (
                        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Acknowledgment Timeout (ms)
                                </label>
                                <input
                                    type="number"
                                    value={radioConfig.ackTimeout}
                                    onChange={handleAckTimeoutChange}
                                    min={100}
                                    max={5000}
                                    step={100}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                                        shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500">
                                    Time to wait for acknowledgment before retrying (100-5000ms)
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Maximum Retries
                                </label>
                                <input
                                    type="number"
                                    value={radioConfig.maxRetries}
                                    onChange={handleMaxRetriesChange}
                                    min={1}
                                    max={10}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                                        shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500">
                                    Number of times to retry failed transmissions (1-10)
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Simulator Controls */}
                    <div className="space-y-3">
                        {!isSimulatorRunning ? (
                            <button
                                onClick={handleStartSimulator}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 
                                    bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 
                                    transition-colors"
                            >
                                <PlayIcon className="h-5 w-5" />
                                <span className="font-medium">Start Simulator</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleStopSimulator}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 
                                    bg-red-600 text-white rounded-lg shadow-sm hover:bg-red-700 
                                    transition-colors"
                            >
                                <StopIcon className="h-5 w-5" />
                                <span className="font-medium">Stop Simulator</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default SimulatorPopup; 