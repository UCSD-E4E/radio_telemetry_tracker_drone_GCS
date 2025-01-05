import React, { useContext } from 'react';
import { MapContext } from '../../contexts/MapContext';

const FrequencyLayersControl: React.FC = () => {
    const { frequencyLayers, setFrequencyLayers } = useContext(MapContext);

    const clearFrequencyData = async (frequency: number) => {
        if (!window.backend) return;
        try {
            const success = await window.backend.clear_frequency_data(frequency);
            if (!success) {
                console.error('Failed to clear frequency data:', frequency);
            }
        } catch (err) {
            console.error('Error clearing frequency data:', err);
        }
    };

    const toggleLayerVisibility = (frequency: number) => {
        setFrequencyLayers((prev) =>
            prev.map((layer) =>
                layer.frequency === frequency
                    ? { ...layer, visible: !layer.visible }
                    : layer
            )
        );
    };

    if (frequencyLayers.length === 0) {
        return <div className="text-sm text-gray-600">No frequencies tracked yet.</div>;
    }

    return (
        <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">
                Frequency Layers
            </div>
            {frequencyLayers.map((layer) => (
                <div key={layer.frequency} className="bg-white/50 rounded-lg p-2 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={layer.visible}
                                onChange={() => toggleLayerVisibility(layer.frequency)}
                                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                            />
                            <div>
                                <div className="text-sm font-medium text-gray-700">
                                    {layer.frequency} Hz
                                </div>
                                <div className="text-xs text-gray-500">
                                    {layer.pings.length} pings
                                    {layer.locationEstimate && ' • Has estimate'}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => clearFrequencyData(layer.frequency)}
                            className="text-xs text-red-600 hover:text-red-800 transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default FrequencyLayersControl;
