import React, { useContext } from 'react';
import { GlobalAppContext } from '../../../context/globalAppContextDef';
import { EyeIcon, EyeSlashIcon, MapPinIcon, SignalIcon, TrashIcon } from '@heroicons/react/24/outline';
import Card from '../../common/Card';

const FrequencyLayersControl: React.FC = () => {
    const context = useContext(GlobalAppContext);
    if (!context) throw new Error('FrequencyLayersControl must be in GlobalAppProvider');

    const { 
        frequencyData,
        frequencyVisibility,
        setFrequencyVisibility,
        deleteFrequencyLayer
    } = context;

    const toggleLayerVisibility = (frequency: number, type: 'pings' | 'location' | 'both') => {
        const newVisibility = frequencyVisibility.map(layer => {
            if (layer.frequency !== frequency) return layer;
            
            if (type === 'both') {
                const newValue = !(layer.visible_pings || layer.visible_location_estimate);
                return {
                    ...layer,
                    visible_pings: newValue,
                    visible_location_estimate: newValue
                };
            }
            
            return {
                ...layer,
                visible_pings: type === 'pings' ? !layer.visible_pings : layer.visible_pings,
                visible_location_estimate: type === 'location' ? !layer.visible_location_estimate : layer.visible_location_estimate
            };
        });
        setFrequencyVisibility(newVisibility);
    };

    const toggleAllVisibility = (type: 'pings' | 'location' | 'both') => {
        // Determine current state to toggle
        const allVisible = frequencyVisibility.every(layer => {
            if (type === 'pings') return layer.visible_pings;
            if (type === 'location') return layer.visible_location_estimate;
            return layer.visible_pings && layer.visible_location_estimate;
        });

        const newVisibility = frequencyVisibility.map(layer => ({
            ...layer,
            visible_pings: type === 'location' ? layer.visible_pings : !allVisible,
            visible_location_estimate: type === 'pings' ? layer.visible_location_estimate : !allVisible
        }));
        setFrequencyVisibility(newVisibility);
    };

    if (frequencyVisibility.length === 0) {
        return (
            <Card title="Frequency Layers">
                <div className="flex flex-col items-center justify-center py-8 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <SignalIcon className="h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600 text-center">
                        No frequencies are being tracked yet.
                        <br />
                        Configure and start the ping finder to begin tracking.
                    </p>
                </div>
            </Card>
        );
    }

    const allPingsVisible = frequencyVisibility.every(layer => layer.visible_pings);
    const allLocationsVisible = frequencyVisibility.every(layer => layer.visible_location_estimate);
    const allVisible = allPingsVisible && allLocationsVisible;

    return (
        <Card title="Frequency Layers">
            <div className="space-y-4">
                {/* Global Controls */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="text-sm font-medium text-gray-700">
                        Show/Hide All
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => toggleAllVisibility('pings')}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors
                                ${allPingsVisible 
                                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            title={`${allPingsVisible ? 'Hide' : 'Show'} all pings`}
                        >
                            <SignalIcon className="w-4 h-4" />
                            <span className="text-sm">Pings</span>
                        </button>
                        <button
                            onClick={() => toggleAllVisibility('location')}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors
                                ${allLocationsVisible 
                                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            title={`${allLocationsVisible ? 'Hide' : 'Show'} all location estimates`}
                        >
                            <MapPinIcon className="w-4 h-4" />
                            <span className="text-sm">Locations</span>
                        </button>
                        <button
                            onClick={() => toggleAllVisibility('both')}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors
                                ${allVisible 
                                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            title={`${allVisible ? 'Hide' : 'Show'} everything`}
                        >
                            {allVisible ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
                            <span className="text-sm">All</span>
                        </button>
                    </div>
                </div>

                {/* Frequency List */}
                <div className="space-y-2">
                    {frequencyVisibility.map((layer) => {
                        const data = frequencyData[layer.frequency];
                        const hasLocation = data?.locationEstimate !== undefined;
                        return (
                            <div 
                                key={layer.frequency} 
                                className="p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 
                                    transition-colors shadow-sm"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => toggleLayerVisibility(layer.frequency, 'pings')}
                                                className={`flex items-center gap-1 px-2 py-1.5 rounded transition-colors
                                                    ${layer.visible_pings 
                                                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                    }`}
                                                title={`${layer.visible_pings ? 'Hide' : 'Show'} pings`}
                                            >
                                                <SignalIcon className="w-4 h-4" />
                                                <span className="text-xs font-medium">{data?.pings.length || 0}</span>
                                            </button>
                                            <button
                                                onClick={() => toggleLayerVisibility(layer.frequency, 'location')}
                                                className={`flex items-center gap-1 px-2 py-1.5 rounded transition-colors
                                                    ${hasLocation
                                                        ? layer.visible_location_estimate 
                                                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                        : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                                    }`}
                                                disabled={!hasLocation}
                                                title={hasLocation 
                                                    ? `${layer.visible_location_estimate ? 'Hide' : 'Show'} location estimate`
                                                    : 'No location estimate available'
                                                }
                                            >
                                                <MapPinIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {(layer.frequency / 1_000_000).toFixed(3)} MHz
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {data?.pings.length} ping{data?.pings.length !== 1 ? 's' : ''} detected
                                                {hasLocation && ' • Location available'}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteFrequencyLayer(layer.frequency)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 
                                            rounded-md transition-colors"
                                        title="Clear frequency data"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
};

export default FrequencyLayersControl;
