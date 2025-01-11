import React, { useState, useCallback, useContext } from 'react';
import { GlobalAppContext } from '../../../context/globalAppContextDef';
import { GCSState } from '../../../context/globalAppTypes';
import { PlusIcon, XMarkIcon, AdjustmentsHorizontalIcon, BeakerIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Card from '../../common/Card';

const calculateCenterFrequency = (frequencies: number[], defaultFreq: number) => {
    if (!frequencies.length) return defaultFreq;
    return Math.round(frequencies.reduce((a: number, b: number) => a + b, 0) / frequencies.length);
};

const PingFinderConfig: React.FC = () => {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [newFrequency, setNewFrequency] = useState('');
    const [autoCenter, setAutoCenter] = useState(true);
    
    const context = useContext(GlobalAppContext);

    const addFrequency = useCallback(() => {
        if (!context) return;
        const { pingFinderConfig, setPingFinderConfig } = context;
        
        const freqMHz = parseFloat(newFrequency);
        if (isNaN(freqMHz)) return;
        
        const freqHz = freqMHz * 1_000_000;
        const newFreqs = [...pingFinderConfig.targetFrequencies, freqHz];
        
        setPingFinderConfig({
            ...pingFinderConfig,
            centerFrequency: autoCenter ? calculateCenterFrequency(newFreqs, pingFinderConfig.centerFrequency) : pingFinderConfig.centerFrequency,
            targetFrequencies: newFreqs
        });
        setNewFrequency('');
    }, [context, newFrequency, autoCenter]);

    const removeFrequency = useCallback((freq: number) => {
        if (!context) return;
        const { pingFinderConfig, setPingFinderConfig } = context;
        
        const newFreqs = pingFinderConfig.targetFrequencies.filter((f: number) => f !== freq);
        setPingFinderConfig({
            ...pingFinderConfig,
            centerFrequency: autoCenter ? calculateCenterFrequency(newFreqs, pingFinderConfig.centerFrequency) : pingFinderConfig.centerFrequency,
            targetFrequencies: newFreqs
        });
    }, [context, autoCenter]);

    if (!context) return null;
    const { pingFinderConfig, setPingFinderConfig, sendPingFinderConfig, cancelPingFinderConfig, gcsState } = context;

    const isWaiting = gcsState === GCSState.PING_FINDER_CONFIG_WAITING;
    const isTimeout = gcsState === GCSState.PING_FINDER_CONFIG_TIMEOUT;
    const isInput = gcsState === GCSState.PING_FINDER_CONFIG_INPUT;

    return (
        <Card title="Ping Finder Configuration">
            <div className="space-y-6">
                {/* Frequency Input Section */}
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Target Frequencies (MHz)</label>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <input
                                type="number"
                                value={newFrequency}
                                onChange={(e) => setNewFrequency(e.target.value)}
                                placeholder="Enter frequency in MHz"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm 
                                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                                    placeholder:text-gray-400 text-sm"
                            />
                        </div>
                        <button
                            onClick={addFrequency}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white 
                                rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 
                                focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                            <PlusIcon className="h-4 w-4" />
                            <span className="font-medium">Add</span>
                        </button>
                    </div>

                    {/* Frequency List */}
                    <div className="space-y-2">
                        {pingFinderConfig.targetFrequencies.map((freq) => (
                            <div key={freq} 
                                className="flex items-center justify-between px-4 py-2 bg-gray-50 
                                    border border-gray-200 rounded-lg group hover:border-gray-300 
                                    transition-colors"
                            >
                                <span className="text-sm font-medium text-gray-700">
                                    {(freq / 1_000_000).toFixed(3)} MHz
                                </span>
                                <button
                                    onClick={() => removeFrequency(freq)}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Auto Center Toggle */}
                <div className="flex items-center justify-between py-3 border-t border-gray-100">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            checked={autoCenter}
                            onChange={(e) => setAutoCenter(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">Auto Center</label>
                    </div>
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
                    >
                        <AdjustmentsHorizontalIcon className="h-4 w-4" />
                        {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                    </button>
                </div>

                {/* Advanced Settings */}
                {showAdvanced && (
                    <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Center (MHz)</label>
                                <input
                                    type="number"
                                    value={(pingFinderConfig.centerFrequency / 1_000_000).toFixed(3)}
                                    onChange={(e) => {
                                        const freqMHz = parseFloat(e.target.value);
                                        if (isNaN(freqMHz)) return;
                                        setPingFinderConfig({
                                            ...pingFinderConfig,
                                            centerFrequency: Math.round(freqMHz * 1_000_000)
                                        });
                                    }}
                                    disabled={autoCenter}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm 
                                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 
                                        disabled:text-gray-500 text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Gain (dB)</label>
                                <input
                                    type="number"
                                    value={pingFinderConfig.gain}
                                    onChange={(e) => setPingFinderConfig({...pingFinderConfig, gain: parseFloat(e.target.value)})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm 
                                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Sampling Rate (Hz)</label>
                                <input
                                    type="number"
                                    value={pingFinderConfig.samplingRate}
                                    onChange={(e) => setPingFinderConfig({...pingFinderConfig, samplingRate: parseInt(e.target.value)})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm 
                                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Ping Width (ms)</label>
                                <input
                                    type="number"
                                    value={pingFinderConfig.pingWidthMs}
                                    onChange={(e) => setPingFinderConfig({...pingFinderConfig, pingWidthMs: parseInt(e.target.value)})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm 
                                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Ping Min SNR</label>
                                <input
                                    type="number"
                                    value={pingFinderConfig.pingMinSnr}
                                    onChange={(e) => setPingFinderConfig({...pingFinderConfig, pingMinSnr: parseFloat(e.target.value)})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm 
                                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Max Length Multiplier</label>
                                <input
                                    type="number"
                                    value={pingFinderConfig.pingMaxLenMult}
                                    onChange={(e) => setPingFinderConfig({...pingFinderConfig, pingMaxLenMult: parseFloat(e.target.value)})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm 
                                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Min Length Multiplier</label>
                            <input
                                type="number"
                                value={pingFinderConfig.pingMinLenMult}
                                onChange={(e) => setPingFinderConfig({...pingFinderConfig, pingMinLenMult: parseFloat(e.target.value)})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm 
                                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>

                        <div className="flex items-center gap-2 py-2">
                            <input
                                type="checkbox"
                                checked={pingFinderConfig.enableTestData}
                                onChange={(e) => setPingFinderConfig({...pingFinderConfig, enableTestData: e.target.checked})}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="flex items-center gap-1.5">
                                <BeakerIcon className="h-4 w-4 text-gray-500" />
                                <label className="text-sm text-gray-700">Enable Test Data</label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="pt-4 space-y-3">
                    {(isWaiting || isTimeout) ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                <div className="animate-spin h-5 w-5 text-blue-600">
                                    <ArrowPathIcon />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-blue-700">
                                        Configuring ping finder...
                                    </div>
                                    <div className="text-xs text-blue-600 mt-0.5">
                                        This may take a few seconds
                                    </div>
                                </div>
                            </div>

                            {isTimeout && (
                                <>
                                    <button
                                        onClick={cancelPingFinderConfig}
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
                            onClick={sendPingFinderConfig}
                            disabled={!isInput || pingFinderConfig.targetFrequencies.length === 0}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 
                                text-white bg-blue-600 rounded-lg hover:bg-blue-700 
                                transition-colors duration-200 disabled:bg-gray-300
                                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <AdjustmentsHorizontalIcon className="h-5 w-5" />
                            <span className="font-medium">Apply Configuration</span>
                        </button>
                    )}
                    {isInput && pingFinderConfig.targetFrequencies.length === 0 && (
                        <p className="text-xs text-red-600 text-center">
                            Please add at least one target frequency
                        </p>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default PingFinderConfig; 