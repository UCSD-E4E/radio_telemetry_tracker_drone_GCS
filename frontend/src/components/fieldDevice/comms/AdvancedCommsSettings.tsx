import React from 'react';
import Tooltip from '../../common/Tooltip';

interface AdvancedCommsSettingsProps {
    ackTimeout: number;
    setAckTimeout: (timeout: number) => void;
    maxRetries: number;
    setMaxRetries: (retries: number) => void;
}

const AdvancedCommsSettings: React.FC<AdvancedCommsSettingsProps> = ({
    ackTimeout,
    setAckTimeout,
    maxRetries,
    setMaxRetries,
}) => {
    return (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div>
                <div className="flex items-center gap-1 mb-2">
                    <label className="text-sm font-medium text-gray-700">ACK Timeout (ms)</label>
                    <Tooltip content="How long to wait for acknowledgment before retrying">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </Tooltip>
                </div>
                <input
                    type="number"
                    value={ackTimeout}
                    onChange={(e) => setAckTimeout(Number(e.target.value))}
                    min={100}
                    max={5000}
                    step={100}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div>
                <div className="flex items-center gap-1 mb-2">
                    <label className="text-sm font-medium text-gray-700">Max Retries</label>
                    <Tooltip content="Maximum number of retries before giving up">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </Tooltip>
                </div>
                <input
                    type="number"
                    value={maxRetries}
                    onChange={(e) => setMaxRetries(Number(e.target.value))}
                    min={1}
                    max={10}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>
    );
};

export default AdvancedCommsSettings;
