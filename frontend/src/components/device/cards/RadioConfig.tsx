import React, { useState, useContext } from 'react';
import { GlobalAppContext } from '../../../context/globalAppContextDef';
import { ArrowPathIcon, ComputerDesktopIcon, CpuChipIcon, WifiIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Card from '../../common/Card';
import { GCSState } from '../../../context/globalAppTypes';

const RadioConfig: React.FC = () => {
    const context = useContext(GlobalAppContext);
    if (!context) throw new Error('RadioConfig must be used within GlobalAppProvider');

    const {
        radioConfig,
        setRadioConfig,
        loadSerialPorts,
        sendRadioConfig,
        cancelRadioConfig,
        gcsState
    } = context;

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isCustomBaudRate, setIsCustomBaudRate] = useState(false);

    const handleInterfaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value as 'serial' | 'simulated';
        setRadioConfig({
            ...radioConfig,
            interface_type: value
        });
    };

    const handlePortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setRadioConfig({
            ...radioConfig,
            selectedPort: e.target.value
        });
    };

    const handleBaudRateChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        if (e.target.tagName === 'SELECT') {
            if (e.target.value === 'custom') {
                setIsCustomBaudRate(true);
                return;
            }
            setIsCustomBaudRate(false);
        }
        if (!isNaN(value)) {
            setRadioConfig({
                ...radioConfig,
                baudRate: value
            });
        }
    };

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

    const handleConnect = async () => {
        await sendRadioConfig();
    };

    const handleCancel = () => {
        cancelRadioConfig();
    };

    const isConnecting = gcsState === GCSState.RADIO_CONFIG_WAITING;
    const showCancelSync = gcsState === GCSState.RADIO_CONFIG_TIMEOUT;

    return (
        <Card title="Radio Configuration">
            <div className="space-y-6">
                {/* Interface Type Selection */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Interface Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleInterfaceChange({ target: { value: 'serial' } } as React.ChangeEvent<HTMLSelectElement>)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all
                                ${radioConfig.interface_type === 'serial'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                }`}
                        >
                            <CpuChipIcon className="h-5 w-5" />
                            <span className="font-medium">Serial</span>
                        </button>
                        <button
                            onClick={() => handleInterfaceChange({ target: { value: 'simulated' } } as React.ChangeEvent<HTMLSelectElement>)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all
                                ${radioConfig.interface_type === 'simulated'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                }`}
                        >
                            <ComputerDesktopIcon className="h-5 w-5" />
                            <span className="font-medium">Simulated</span>
                        </button>
                    </div>
                </div>

                {radioConfig.interface_type === 'serial' ? (
                    <>
                        {/* Serial Port Selection */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700">
                                    Serial Port
                                </label>
                                <button
                                    onClick={loadSerialPorts}
                                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
                                >
                                    <ArrowPathIcon className="h-4 w-4" />
                                    Refresh Ports
                                </button>
                            </div>
                            <select
                                value={radioConfig.selectedPort}
                                onChange={handlePortChange}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg 
                                    shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select a port</option>
                                {radioConfig.serialPorts.map(port => (
                                    <option key={port} value={port}>{port}</option>
                                ))}
                            </select>
                        </div>

                        {/* Baud Rate Selection */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Baud Rate
                            </label>
                            {!isCustomBaudRate ? (
                                <select
                                    value={radioConfig.baudRate}
                                    onChange={handleBaudRateChange}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg 
                                        shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="9600">9600</option>
                                    <option value="19200">19200</option>
                                    <option value="38400">38400</option>
                                    <option value="57600">57600</option>
                                    <option value="115200">115200</option>
                                    <option value="custom">Custom...</option>
                                </select>
                            ) : (
                                <div className="space-y-2">
                                    <input
                                        type="number"
                                        value={radioConfig.baudRate}
                                        onChange={handleBaudRateChange}
                                        min={1200}
                                        max={3000000}
                                        placeholder="Enter baud rate..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                                            shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        onClick={() => setIsCustomBaudRate(false)}
                                        className="text-sm text-blue-600 hover:text-blue-700"
                                    >
                                        Use preset value
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        {/* Simulated Connection Settings */}
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
                    </>
                )}

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

                {/* Connection Status and Actions */}
                <div className="space-y-3">
                    {!isConnecting && !showCancelSync ? (
                        <button
                            onClick={handleConnect}
                            disabled={radioConfig.interface_type === 'serial' && !radioConfig.selectedPort}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-3 
                                rounded-lg shadow-sm transition-all duration-200
                                ${radioConfig.interface_type === 'serial' && !radioConfig.selectedPort
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                        >
                            <WifiIcon className="h-5 w-5" />
                            <span className="font-medium">Connect</span>
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                <ArrowPathIcon className="animate-spin h-5 w-5 text-blue-600" />
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-blue-700">
                                        Establishing connection...
                                    </div>
                                    <div className="text-xs text-blue-600 mt-0.5">
                                        This may take a few seconds
                                    </div>
                                </div>
                            </div>

                            {showCancelSync && (
                                <>
                                    <button
                                        onClick={handleCancel}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 
                                            text-red-600 bg-white border-2 border-red-200 rounded-lg 
                                            hover:bg-red-50 transition-colors"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                        <span className="font-medium">Cancel Connection</span>
                                    </button>
                                    <p className="text-sm text-gray-600 text-center">
                                        Connection is taking longer than expected. You may cancel and try again.
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default RadioConfig; 
