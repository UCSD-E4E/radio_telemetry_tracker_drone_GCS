import React from 'react';
import FrequencyLayersControl from './FrequencyLayersControl';

const FrequencyManager: React.FC = () => {
    return (
        <div className="space-y-4">
            <div className="card">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Frequency Manager</h3>
                <FrequencyLayersControl />
            </div>
        </div>
    );
};

export default FrequencyManager; 