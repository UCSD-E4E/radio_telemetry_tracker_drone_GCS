import React, { useContext, useEffect, useState } from 'react';
import { CommsContext } from '../../../contexts/CommsContext';
import Tooltip from '../../common/Tooltip';
import AdvancedCommsSettings from './AdvancedCommsSettings';
import ErrorModal from './ErrorModal';
import { fetchBackend } from '../../../utils/backend';

const CommsConfig: React.FC = () => {
    const context = useContext(CommsContext);

    if (!context) {
        throw new Error('CommsConfig must be used within a CommsProvider');
    }

    const {
        interfaceType,
        setInterfaceType,
        serialPorts,
        loadSerialPorts,
        selectedPort,
        setSelectedPort,
        baudRate,
        setBaudRate,
        host,
        setHost,
        tcpPort,
        setTcpPort,
        ackTimeout,
        setAckTimeout,
        maxRetries,
        setMaxRetries,

        isConnecting,
        isConnected,
        setIsConnected,
        connectionStatus,
        errorMessage,
        setErrorMessage,
        waitingForSync,
        setWaitingForSync,

        showCancelSync,
        setShowCancelSync,

        initializeComms,
        cancelConnection,
    } = context;

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showCustomBaudRate, setShowCustomBaudRate] = useState(false);
    const [customBaudRateInput, setCustomBaudRateInput] = useState('');
    const [showErrorModal, setShowErrorModal] = useState(false);

    useEffect(() => {
        loadSerialPorts();
    }, [loadSerialPorts]);

    useEffect(() => {
        setBaudRate(57600);
        setHost('localhost');
        setTcpPort(50000);
    }, [setBaudRate, setHost, setTcpPort]);

    useEffect(() => {
        if (errorMessage && !errorMessage.startsWith('Warning:')) {
            setShowErrorModal(true);
        }
    }, [errorMessage]);

    const handleConnect = async () => {
        if (interfaceType === 'serial') {
            if (!selectedPort) {
                setErrorMessage('Please select a port');
                return;
            }
            if (!baudRate) {
                setErrorMessage('Please select a baud rate');
                return;
            }
        } else {
            if (!host) {
                setErrorMessage('Please enter a host');
                return;
            }
            if (!tcpPort) {
                setErrorMessage('Please enter a TCP port');
                return;
            }
        }

        await initializeComms();
    };

    const handleCancel = () => {
        setShowCancelSync(false);
        cancelConnection();
    };

    const handleCustomBaudRate = () => {
        const rate = Number(customBaudRateInput);
        if (!isNaN(rate) && rate > 0) {
            setBaudRate(rate);
            setShowCustomBaudRate(false);
            setCustomBaudRateInput('');
        }
    };

    const handleDisconnect = async () => {
        const backend = await fetchBackend();
        await backend.disconnect();
        setIsConnected(false);
        setWaitingForSync(false);
        setErrorMessage('');
        setShowCancelSync(false);
    };

    return (
        <div className="p-4 space-y-6 relative z-[1100]">
            {!isConnected && (
                <>
                    {/* Interface type */}
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <button
                                onClick={() => setInterfaceType('serial')}
                                className={`flex-1 p-4 rounded-lg border-2 transition-colors ${interfaceType === 'serial'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="font-medium mb-1">Serial Connection</div>
                                <div className="text-sm text-gray-500">
                                    Connect directly to radio hardware
                                </div>
                            </button>
                            <button
                                onClick={() => setInterfaceType('simulated')}
                                className={`flex-1 p-4 rounded-lg border-2 transition-colors ${interfaceType === 'simulated'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="font-medium mb-1">Simulated Connection</div>
                                <div className="text-sm text-gray-500">
                                    Test with simulated data over TCP/IP
                                </div>
                            </button>
                        </div>

                        {/* Serial config */}
                        {interfaceType === 'serial' && (
                            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <div className="flex items-center gap-1 mb-2">
                                        <label className="text-sm font-medium text-gray-700">Serial Port</label>
                                        <Tooltip content="The COM or ttyUSB port where your radio device is connected (e.g. COM3 or ttyUSB0).">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </Tooltip>
                                    </div>
                                    <select
                                        value={selectedPort}
                                        onChange={(e) => setSelectedPort(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 
                                       rounded-md shadow-sm focus:outline-none 
                                       focus:ring-2 focus:ring-blue-500"
                                    >
                                        {serialPorts.length === 0 && <option value="">No serial ports found</option>}
                                        {serialPorts.map((port: string) => (
                                            <option key={port} value={port}>
                                                {port}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <div className="flex items-center gap-1 mb-2">
                                        <label className="text-sm font-medium text-gray-700">Baud Rate</label>
                                        <Tooltip content="Must match your device's configured rate (e.g. 57600).">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </Tooltip>
                                    </div>
                                    <select
                                        value={baudRate?.toString() || '57600'}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === 'custom') {
                                                setShowCustomBaudRate(true);
                                            } else {
                                                setBaudRate(parseInt(val));
                                            }
                                        }}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 
                                       rounded-md shadow-sm focus:outline-none 
                                       focus:ring-2 focus:ring-blue-500"
                                        disabled={isConnecting || isConnected}
                                    >
                                        <option value="4800">4800</option>
                                        <option value="9600">9600</option>
                                        <option value="19200">19200</option>
                                        <option value="38400">38400</option>
                                        <option value="57600">57600</option>
                                        <option value="115200">115200</option>
                                        <option value="custom">Custom...</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Simulated config */}
                        {interfaceType === 'simulated' && (
                            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <div className="flex items-center gap-1 mb-2">
                                        <label className="text-sm font-medium text-gray-700">Host</label>
                                        <Tooltip content="Use 'localhost' for local, or remote IP for network.">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </Tooltip>
                                    </div>
                                    <input
                                        type="text"
                                        value={host || 'localhost'}
                                        onChange={(e) => setHost(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 
                                       rounded-md shadow-sm focus:outline-none 
                                       focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1 mb-2">
                                        <label className="text-sm font-medium text-gray-700">TCP Port</label>
                                        <Tooltip content="Port for TCP simulation. Default 50000.">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </Tooltip>
                                    </div>
                                    <input
                                        type="number"
                                        value={tcpPort?.toString() || '50000'}
                                        onChange={(e) => setTcpPort(e.target.value ? parseInt(e.target.value) : null)}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 
                                       rounded-md shadow-sm focus:outline-none 
                                       focus:ring-2 focus:ring-blue-500"
                                        disabled={isConnecting || isConnected}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Advanced settings */}
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                        <svg
                            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Advanced Settings
                    </button>
                    {showAdvanced && (
                        <AdvancedCommsSettings
                            ackTimeout={ackTimeout}
                            setAckTimeout={setAckTimeout}
                            maxRetries={maxRetries}
                            setMaxRetries={setMaxRetries}
                        />
                    )}
                </>
            )}

            {/* Custom baud modal */}
            {showCustomBaudRate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
                    <div className="bg-white rounded-lg p-6 w-96 space-y-4">
                        <h3 className="text-lg font-medium text-gray-900">Custom Baud Rate</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Enter baud rate
                            </label>
                            <input
                                type="number"
                                value={customBaudRateInput}
                                onChange={(e) => setCustomBaudRateInput(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 
                                       rounded-md shadow-sm focus:outline-none 
                                       focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. 250000"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleCustomBaudRate();
                                    } else if (e.key === 'Escape') {
                                        setShowCustomBaudRate(false);
                                        setCustomBaudRateInput('');
                                    }
                                }}
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowCustomBaudRate(false);
                                    setCustomBaudRateInput('');
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 
                                       hover:bg-gray-50 border border-gray-300 
                                       rounded-md focus:outline-none"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCustomBaudRate}
                                className="px-4 py-2 text-sm font-medium text-white 
                                       bg-blue-500 hover:bg-blue-600 rounded-md focus:outline-none"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Connection progress */}
            <div className="space-y-3">
                {/* Buttons */}
                <div className="flex gap-2">
                    {!isConnected && !isConnecting && !waitingForSync && (
                        <button
                            onClick={handleConnect}
                            className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 
                                     text-white rounded-lg shadow-sm hover:shadow-md 
                                     focus:outline-none transition-all duration-200 font-medium"
                        >
                            Connect
                        </button>
                    )}
                    {(isConnecting || waitingForSync) && (
                        <div className="flex flex-col gap-2 flex-1">
                            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <svg className="animate-spin h-6 w-6 text-blue-500 flex-shrink-0" viewBox="0 0 24 24">
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="none"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                <div className="flex-1">
                                    <div className="text-sm text-blue-700">
                                        {connectionStatus}
                                    </div>
                                    {connectionStatus === 'Waiting for drone to respond...' && (
                                        <div className="text-xs text-blue-600 mt-0.5">
                                            This may take a few seconds while we establish communication
                                        </div>
                                    )}
                                </div>
                            </div>
                            {showCancelSync && (
                                <button
                                    onClick={handleCancel}
                                    className="w-full px-4 py-3 text-red-600 bg-white border-2 
                                    border-red-600 rounded-lg hover:bg-red-50 shadow-sm 
                                    hover:shadow-md focus:outline-none focus:ring-2 
                                    focus:ring-red-500 transition-all duration-200 font-medium"
                                >
                                    Cancel Connection
                                </button>
                            )}
                            {showCancelSync && (
                                <div className="text-sm text-gray-600 px-1">
                                    Connection is taking longer than expected. You may cancel and try again.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {isConnected && (
                    <div className="space-y-2">
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2 text-green-700">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                                    <path
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                <span className="font-medium">Successfully connected to drone</span>
                            </div>
                        </div>
                        {errorMessage && errorMessage.startsWith('Warning:') && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-center gap-2 text-yellow-700">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                    <span className="font-medium">{errorMessage.substring(8)}</span>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={handleDisconnect}
                            className="w-full px-4 py-3 text-red-600 bg-white border-2 
                            border-red-600 rounded-lg hover:bg-red-50 shadow-sm 
                            hover:shadow-md focus:outline-none focus:ring-2 
                            focus:ring-red-500 transition-all duration-200 font-medium"
                        >
                            Disconnect
                        </button>
                    </div>
                )}

                {/* Error Modal */}
                {showErrorModal && errorMessage && (
                    <ErrorModal
                        errorMessage={errorMessage}
                        onClose={() => setShowErrorModal(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default CommsConfig;
