import React from 'react';
import FrequencyLayersControl from './cards/FrequencyLayersControl';
import Card from '../common/Card';

const FrequencyManager: React.FC = () => {
    return (
        <Card title="Frequency Manager">
            <FrequencyLayersControl />
        </Card>
    );
};

export default FrequencyManager;
