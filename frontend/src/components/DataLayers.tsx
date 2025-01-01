import React, { useEffect, useState, useCallback } from 'react';
import L from 'leaflet';
import { formatDistanceToNow } from 'date-fns';
import { DroneData, PingData, LocEstData, FrequencyLayer, DroneBackend } from '../utils/backend';

interface DataLayersProps {
    map: L.Map | null;
}

// Helper function to normalize a value between 0 and 1
const normalize = (value: number, min: number, max: number) => {
    if (min === max) return 0.5;
    return (value - min) / (max - min);
};

// Helper function to get color for normalized value (0-1)
const getAmplitudeColor = (normalizedValue: number) => {
    // Blue (cold) to Red (hot)
    const hue = (1 - normalizedValue) * 240; // 240 is blue, 0 is red
    return `hsl(${hue}, 100%, 50%)`;
};

export const DataLayers: React.FC<DataLayersProps> = ({ map }) => {
    const [droneData, setDroneData] = useState<DroneData | null>(null);
    const [frequencyLayers, setFrequencyLayers] = useState<FrequencyLayer[]>([]);
    const [layerGroups] = useState(() => new Map<number, L.LayerGroup>());

    // Find min/max amplitudes across all pings
    const getAmplitudeRange = useCallback(() => {
        let min = Infinity;
        let max = -Infinity;
        frequencyLayers.forEach(layer => {
            layer.pings.forEach(ping => {
                min = Math.min(min, ping.amplitude);
                max = Math.max(max, ping.amplitude);
            });
        });
        return { min: min === Infinity ? 0 : min, max: max === -Infinity ? 100 : max };
    }, [frequencyLayers]);

    // Update drone marker
    useEffect(() => {
        if (!map || !droneData) return;

        // Create or update drone marker
        const droneIcon = L.divIcon({
            className: 'drone-marker',
            html: `
                <div class="relative w-8 h-8">
                    <div class="absolute inset-0 bg-blue-500 opacity-20 rounded-full animate-ping"></div>
                    <div class="absolute inset-0 flex items-center justify-center">
                        <!-- Main dot -->
                        <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <!-- Triangle heading indicator -->
                        <div class="absolute w-0 h-0 -top-2" 
                             style="transform: rotate(${droneData.heading}deg); transform-origin: center 12px; 
                                    border-left: 5px solid transparent; 
                                    border-right: 5px solid transparent; 
                                    border-bottom: 8px solid rgb(59, 130, 246);"></div>
                    </div>
                </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
        });

        const marker = L.marker([droneData.lat, droneData.long], {
            icon: droneIcon,
            zIndexOffset: 1000,
        }).addTo(map);

        const popup = L.popup()
            .setContent(`
                <div class="text-sm">
                    <div>Altitude: ${droneData.altitude.toFixed(1)}m</div>
                    <div>Heading: ${droneData.heading.toFixed(1)}°</div>
                    <div>Last Update: ${formatDistanceToNow(new Date(droneData.lastUpdate))} ago</div>
                </div>
            `);

        marker.bindPopup(popup);

        return () => {
            map.removeLayer(marker);
        };
    }, [map, droneData]);

    // Clear frequency data
    const clearFrequencyData = async (frequency: number) => {
        const backend = window.backend as DroneBackend;
        if (!backend) return;
        try {
            console.log('Clearing frequency data:', frequency);
            const success = await backend.clear_frequency_data(frequency);
            if (success) {
                setFrequencyLayers(prev => prev.filter(layer => layer.frequency !== frequency));
                const group = layerGroups.get(frequency);
                if (group) {
                    group.remove();
                    layerGroups.delete(frequency);
                }
                console.log('Successfully cleared frequency data:', frequency);
            } else {
                console.error('Failed to clear frequency data:', frequency);
            }
        } catch (error) {
            console.error('Error clearing frequency data:', error);
        }
    };

    // Clear all data
    const clearAllData = async () => {
        const backend = window.backend as DroneBackend;
        if (!backend) return;
        try {
            console.log('Clearing all data');
            const success = await backend.clear_all_data();
            if (success) {
                setFrequencyLayers([]);
                layerGroups.forEach(group => {
                    group.remove();
                });
                layerGroups.clear();
                console.log('Successfully cleared all data');
            } else {
                console.error('Failed to clear all data');
            }
        } catch (error) {
            console.error('Error clearing all data:', error);
        }
    };

    // Connect to backend signals
    useEffect(() => {
        const backend = window.backend as DroneBackend;
        if (!backend) return;

        const handleDroneData = (data: DroneData) => {
            console.log('Received drone data:', data);
            // Always ensure lastUpdate is a valid timestamp in milliseconds
            data.lastUpdate = typeof data.lastUpdate === 'number' ? data.lastUpdate : Date.now();
            console.log('Using timestamp:', data.lastUpdate);
            setDroneData(data);
        };

        const handlePingData = (data: PingData | { frequency: number, cleared: boolean }) => {
            console.log('Received ping data:', data);
            if ('cleared' in data) {
                // Handle clear signal
                setFrequencyLayers(prev => prev.filter(layer => layer.frequency !== data.frequency));
                const group = layerGroups.get(data.frequency);
                if (group) {
                    group.remove();
                    layerGroups.delete(data.frequency);
                }
                return;
            }

            setFrequencyLayers(prev => {
                const existingLayer = prev.find(layer => layer.frequency === data.frequency);
                if (existingLayer) {
                    return prev.map(layer =>
                        layer.frequency === data.frequency
                            ? { ...layer, pings: [...layer.pings, data] }
                            : layer
                    );
                } else {
                    return [...prev, {
                        frequency: data.frequency,
                        pings: [data],
                        locationEstimate: null,
                        visible: true,
                    }];
                }
            });
        };

        const handleLocEstData = (data: LocEstData | { frequency: number, cleared: boolean }) => {
            console.log('Received location estimate:', data);
            if ('cleared' in data) {
                // Handle clear signal
                setFrequencyLayers(prev => prev.filter(layer => layer.frequency !== data.frequency));
                const group = layerGroups.get(data.frequency);
                if (group) {
                    group.remove();
                    layerGroups.delete(data.frequency);
                }
                return;
            }

            setFrequencyLayers(prev => {
                const existingLayer = prev.find(layer => layer.frequency === data.frequency);
                if (existingLayer) {
                    return prev.map(layer =>
                        layer.frequency === data.frequency
                            ? { ...layer, locationEstimate: data }
                            : layer
                    );
                } else {
                    return [...prev, {
                        frequency: data.frequency,
                        pings: [],
                        locationEstimate: data,
                        visible: true,
                    }];
                }
            });
        };

        try {
            backend.drone_data_updated.connect(handleDroneData);
            backend.ping_data_updated.connect(handlePingData);
            backend.loc_est_data_updated.connect(handleLocEstData);

            return () => {
                try {
                    backend.drone_data_updated.disconnect(handleDroneData);
                    backend.ping_data_updated.disconnect(handlePingData);
                    backend.loc_est_data_updated.disconnect(handleLocEstData);
                } catch (error) {
                    console.warn('Error disconnecting from signals:', error);
                }
            };
        } catch (error) {
            console.warn('Error connecting to signals:', error);
        }
    }, []);

    // Update map markers
    useEffect(() => {
        if (!map) return;

        const amplitudeRange = getAmplitudeRange();

        frequencyLayers.forEach(freqLayer => {
            let layerGroup = layerGroups.get(freqLayer.frequency);
            
            // Create new layer group if it doesn't exist
            if (!layerGroup) {
                const newLayerGroup = L.layerGroup().addTo(map);
                layerGroups.set(freqLayer.frequency, newLayerGroup);
                layerGroup = newLayerGroup;
            }

            // Skip if layer is not visible
            if (!freqLayer.visible) {
                layerGroup.clearLayers();
                return;
            }

            // Clear existing markers
            layerGroup.clearLayers();

            // Add pings
            freqLayer.pings.forEach(ping => {
                const normalizedAmplitude = normalize(ping.amplitude, amplitudeRange.min, amplitudeRange.max);
                const strokeColor = getAmplitudeColor(normalizedAmplitude);
                const fillColor = `hsl(${freqLayer.frequency % 360}, 70%, 50%)`;

                // Create a pulsing circle marker
                const marker = L.circleMarker([ping.lat, ping.long], {
                    radius: 4,
                    color: strokeColor,
                    fillColor: fillColor,
                    fillOpacity: 0.8,
                    weight: 2,
                    className: 'ping-marker',
                }).bindTooltip(`${ping.frequency}Hz: ${ping.amplitude.toFixed(1)}dB`);

                // Add a larger, fading circle for emphasis
                const pulseMarker = L.circleMarker([ping.lat, ping.long], {
                    radius: 8,
                    color: strokeColor,
                    fillColor: fillColor,
                    fillOpacity: 0.2,
                    weight: 1,
                    className: 'ping-pulse',
                });

                layerGroup.addLayer(pulseMarker);
                layerGroup.addLayer(marker);
            });

            // Add location estimate
            if (freqLayer.locationEstimate) {
                // Create a diamond marker for location estimates
                const icon = L.divIcon({
                    className: 'location-estimate-marker',
                    html: `<div class="w-4 h-4 transform rotate-45 bg-white border-2" style="border-color: hsl(${freqLayer.frequency % 360}, 70%, 50%)"></div>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8],
                });

                const marker = L.marker([freqLayer.locationEstimate.lat, freqLayer.locationEstimate.long], {
                    icon,
                    zIndexOffset: 1000,
                }).bindTooltip(`Est. ${freqLayer.frequency}Hz`);

                // Add a pulsing circle behind the diamond
                const pulseMarker = L.circleMarker([freqLayer.locationEstimate.lat, freqLayer.locationEstimate.long], {
                    radius: 12,
                    color: `hsl(${freqLayer.frequency % 360}, 70%, 50%)`,
                    fillColor: `hsl(${freqLayer.frequency % 360}, 70%, 50%)`,
                    fillOpacity: 0.2,
                    weight: 1,
                    className: 'location-pulse',
                });

                layerGroup.addLayer(pulseMarker);
                layerGroup.addLayer(marker);
            }
        });

        // Clean up any layer groups that no longer have corresponding frequency layers
        layerGroups.forEach((group, freq) => {
            if (!frequencyLayers.some(layer => layer.frequency === freq)) {
                group.remove();
                layerGroups.delete(freq);
            }
        });
    }, [map, frequencyLayers, layerGroups, getAmplitudeRange]);

    useEffect(() => {
        if (!map) return;

        // Add all layer groups to the map
        Object.values(layerGroups).forEach(group => {
            group.addTo(map);
        });

        // Cleanup function to remove layers when component unmounts
        return () => {
            Object.values(layerGroups).forEach(group => {
                group.remove();
            });
        };
    }, [map, layerGroups]);

    return (
        <div className="space-y-4">
            {/* Drone Info */}
            {droneData && (
                <div className="bg-white/50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-700">Drone Status</h3>
                        <button
                            onClick={() => map?.setView([droneData.lat, droneData.long], map.getZoom())}
                            className="text-sm text-blue-600 hover:text-blue-700"
                        >
                            Go to Drone
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>Altitude: {droneData.altitude.toFixed(1)}m</div>
                        <div>Heading: {droneData.heading.toFixed(1)}°</div>
                        <div className="col-span-2">
                            Last Update: {formatDistanceToNow(new Date(droneData.lastUpdate))} ago
                        </div>
                    </div>
                </div>
            )}

            {/* Frequency Layers */}
            <div className="space-y-2">
                {frequencyLayers.map(layer => (
                    <div key={layer.frequency} className="bg-white/50 rounded-lg p-2 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={layer.visible}
                                    onChange={() => {
                                        setFrequencyLayers(prev =>
                                            prev.map(l =>
                                                l.frequency === layer.frequency
                                                    ? { ...l, visible: !l.visible }
                                                    : l
                                            )
                                        );
                                    }}
                                    className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                                />
                                <div>
                                    <div className="text-sm font-medium text-gray-700">{layer.frequency} Hz</div>
                                    <div className="text-xs text-gray-500">
                                        {layer.pings.length} pings
                                        {layer.locationEstimate && ' • Has estimate'}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => clearFrequencyData(layer.frequency)}
                                className="text-xs text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Clear All Button */}
            {frequencyLayers.length > 0 && (
                <button
                    onClick={clearAllData}
                    className="w-full px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                >
                    Clear All Data
                </button>
            )}
        </div>
    );
};

export default DataLayers; 