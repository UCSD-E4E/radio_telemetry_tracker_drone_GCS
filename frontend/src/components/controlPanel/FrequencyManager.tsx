import React from 'react';
import FrequencyLayersControl from './FrequencyLayersControl';

const FrequencyManager: React.FC = () => {
    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Frequency Manager</h3>
                <FrequencyLayersControl />
            </div>
        </div>
    );
};

export default FrequencyManager; 