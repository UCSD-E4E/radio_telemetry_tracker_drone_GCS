import React, { useEffect, useCallback, useState, useRef, useMemo, useContext } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { formatDistanceToNow, isValid } from 'date-fns';
import { logToPython } from '../../utils/logging';
import type { GpsData, TimeoutRef, PingData, LocEstData } from '../../types/global';
import { GlobalAppContext } from '../../context/globalAppContextDef';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

// Helper functions for visualization
const normalize = (value: number, min: number, max: number) => {
    if (min === max) return 0.5;
    return (value - min) / (max - min);
};

const fnv1a = (value: number): number => {
    const str = value.toString();
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
};

// Get a consistent color for a frequency using improved hashing
const getFrequencyColor = (frequency: number): string => {
    const hash = fnv1a(frequency);
    const hue = (hash * 0.618033988749895) % 1;
    return `hsl(${Math.floor(hue * 360)}, 85%, 60%)`;
};

// Get color for amplitude (used for stroke color of pings)
const getAmplitudeColor = (normalizedValue: number) => {
    const hue = (1 - normalizedValue) * 240;
    return `hsl(${hue}, 100%, 50%)`;
};

// Create a ping icon using SignalIcon with improved styling
const createPingIcon = (color: string, strokeColor: string, size: number): L.DivIcon => {
    const iconSize = Math.max(12, Math.min(24, size));
    const iconHtml = `
        <div class="relative" style="width: ${iconSize}px; height: ${iconSize}px;">
            <div class="absolute inset-0 flex items-center justify-center">
                <div class="ping-pulse absolute inset-0" style="
                    background-color: ${color}40;
                    border: 2px solid ${color}80;
                    border-radius: 50%;
                    animation: ping-pulse 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
                "></div>
                <svg class="w-full h-full relative z-10" viewBox="0 0 24 24" fill="${color}" stroke="${strokeColor}" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79" />
                </svg>
            </div>
        </div>
        <style>
            @keyframes ping-pulse {
                75%, 100% {
                    transform: scale(2);
                    opacity: 0;
                }
            }
            .ping-pulse {
                transform-origin: center;
            }
        </style>
    `;
    
    return L.divIcon({
        html: iconHtml,
        className: 'ping-marker',
        iconSize: [iconSize, iconSize],
        iconAnchor: [iconSize/2, iconSize/2],
    });
};

// Create a location estimate icon with improved styling
const createLocationEstimateIcon = (color: string): L.DivIcon => {
    const iconHtml = `
        <div class="relative" style="width: 32px; height: 32px;">
            <div class="absolute inset-0 flex items-center justify-center">
                <div class="location-pulse absolute inset-0" style="
                    background-color: ${color}40;
                    border: 2px solid ${color}80;
                    border-radius: 50%;
                    animation: location-pulse 2s ease-out infinite;
                "></div>
                <svg class="w-full h-full relative z-10" viewBox="0 0 24 24" fill="white" stroke="${color}" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
            </div>
        </div>
        <style>
            @keyframes location-pulse {
                0% {
                    transform: scale(0.95);
                    opacity: 0.8;
                }
                50% {
                    transform: scale(1.5);
                    opacity: 0.4;
                }
                100% {
                    transform: scale(0.95);
                    opacity: 0.8;
                }
            }
            .location-pulse {
                transform-origin: center;
            }
        </style>
    `;
    
    return L.divIcon({
        html: iconHtml,
        className: 'location-estimate-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
    });
};

interface LoadingIndicatorProps {
    loading: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ loading }) => {
    if (!loading) return null;
    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 px-4 py-2 
            rounded-full shadow-lg z-[1000] flex items-center gap-2.5 text-sm text-blue-700
            border border-blue-100">
            <ArrowPathIcon className="w-5 h-5 animate-spin" />
            <span className="font-medium">Loading map data...</span>
        </div>
    );
};

interface FrequencyLayerProps {
    frequency: number;
    pings: PingData[];
    locationEstimate: LocEstData | null;
    visible_pings: boolean;
    visible_location_estimate: boolean;
}

const FrequencyLayer: React.FC<FrequencyLayerProps> = ({
    frequency,
    pings,
    locationEstimate,
    visible_pings,
    visible_location_estimate,
}) => {
    const map = useMap();
    const pingMarkersRef = useRef<L.Marker[]>([]);
    const locationMarkerRef = useRef<L.Marker | null>(null);
    const frequencyColor = useMemo(() => getFrequencyColor(frequency), [frequency]);

    const cleanupMarkers = useCallback(() => {
        pingMarkersRef.current.forEach(marker => marker.remove());
        pingMarkersRef.current = [];
        if (locationMarkerRef.current) {
            locationMarkerRef.current.remove();
            locationMarkerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!map) return;

        cleanupMarkers();

        if (visible_pings && pings.length > 0) {
            const amplitudes = pings.map(ping => ping.amplitude);
            const minAmplitude = Math.min(...amplitudes);
            const maxAmplitude = Math.max(...amplitudes);

            pings.forEach(ping => {
                const normalizedAmplitude = normalize(ping.amplitude, minAmplitude, maxAmplitude);
                const strokeColor = getAmplitudeColor(normalizedAmplitude);
                const size = 12 + normalizedAmplitude * 12;

                const icon = createPingIcon(frequencyColor, strokeColor, size);
                const marker = L.marker([ping.lat, ping.long], { icon }).addTo(map);

                marker.bindTooltip(`
                    <div class="p-2 font-mono text-sm">
                        <div class="font-medium text-gray-900">Frequency: ${(frequency / 1_000_000).toFixed(3)} MHz</div>
                        <div class="text-gray-600">Amplitude: ${ping.amplitude.toFixed(2)}</div>
                        <div class="text-gray-600">Time: ${new Date(ping.timestamp / 1000).toLocaleTimeString()}</div>
                    </div>
                `, { 
                    className: 'bg-white/95 border-0 shadow-lg rounded-lg',
                    offset: [0, -size/2]
                });

                pingMarkersRef.current.push(marker);
            });
        }

        if (visible_location_estimate && locationEstimate) {
            const icon = createLocationEstimateIcon(frequencyColor);
            const marker = L.marker(
                [locationEstimate.lat, locationEstimate.long],
                { icon }
            ).addTo(map);

            marker.bindTooltip(`
                <div class="p-2 font-mono text-sm">
                    <div class="font-medium text-gray-900">Location Estimate</div>
                    <div class="text-gray-600">Frequency: ${(frequency / 1_000_000).toFixed(3)} MHz</div>
                    <div class="text-gray-600">Time: ${new Date(locationEstimate.timestamp / 1000).toLocaleTimeString()}</div>
                </div>
            `, { 
                className: 'bg-white/95 border-0 shadow-lg rounded-lg',
                offset: [0, -16]
            });

            locationMarkerRef.current = marker;
        }

        return cleanupMarkers;
    }, [map, frequency, pings, locationEstimate, visible_pings, visible_location_estimate, cleanupMarkers, frequencyColor]);

    return null;
};

const DroneMarker: React.FC<{
    gpsData: GpsData | null;
    isConnected: boolean;
}> = ({ gpsData, isConnected }) => {
    const map = useMap();
    const droneMarkerRef = useRef<L.Marker | null>(null);
    const lastUpdateRef = useRef<number>(0);

    const formatLastUpdate = useCallback((timestamp: number | undefined) => {
        try {
            if (!timestamp) return 'Last update: unknown';
            const date = new Date(timestamp);
            if (!isValid(date)) return 'Last update: unknown';
            return `Last update: ${formatDistanceToNow(date, { addSuffix: true, includeSeconds: true })}`;
        } catch (err) {
            logToPython(`Error formatting timestamp: ${err}`);
            return 'Last update: unknown';
        }
    }, []);

    const droneIconSvg = useMemo(() => `
        <div class="relative w-[32px] h-[32px]">
            <div class="absolute inset-0 flex items-center justify-center">
                <div class="drone-status-pulse"></div>
            </div>
            <div class="absolute inset-0 flex items-center justify-center">
                <div class="drone-icon-container" style="transform: rotate(var(--rotation))">
                    <svg 
                        viewBox="0 0 24 24" 
                        width="24" 
                        height="24" 
                        fill="currentColor" 
                        class="drone-icon"
                    >
                        <path d="M12 2 L14 6 L10 6 L12 2 Z" />
                        <circle cx="12" cy="12" r="4" />
                    </svg>
                </div>
            </div>
        </div>
        <style>
            .drone-marker-active {
                color: #2563eb;
                filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.1));
            }
            .drone-marker-disconnected {
                color: #9ca3af;
            }
            .drone-status-pulse {
                position: absolute;
                inset: 0;
                border-radius: 50%;
                transform-origin: center;
            }
            .drone-marker-active .drone-status-pulse {
                background-color: rgba(37, 99, 235, 0.1);
                border: 2px solid rgba(37, 99, 235, 0.2);
                animation: drone-pulse 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            }
            .drone-marker-disconnected .drone-status-pulse {
                background-color: rgba(156, 163, 175, 0.1);
                border: 2px solid rgba(156, 163, 175, 0.2);
            }
            @keyframes drone-pulse {
                75%, 100% {
                    transform: scale(2);
                    opacity: 0;
                }
            }
            .drone-icon-container {
                transform-origin: center;
            }
        </style>
    `, []);

    const drawDroneMarker = useCallback(
        (data: GpsData | null, isConnected: boolean) => {
            if (!map) return;

            if (!isConnected || !data) {
                if (droneMarkerRef.current) {
                    const icon = droneMarkerRef.current.getIcon();
                    if (icon instanceof L.DivIcon) {
                        icon.options.html = `<div class="drone-marker-disconnected">${droneIconSvg}</div>`;
                        droneMarkerRef.current.setIcon(icon);
                    }
                }
                return;
            }

            const { lat, long, heading, timestamp } = data;
            // Store timestamp in milliseconds (convert from microseconds)
            lastUpdateRef.current = timestamp / 1000;

            if (!droneMarkerRef.current) {
                const icon = L.divIcon({
                    className: 'drone-marker',
                    html: `<div class="drone-marker-active">${droneIconSvg.replace('var(--rotation)', `${heading}deg`)}</div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                });
                const marker = L.marker([lat, long], { icon }).addTo(map);
                droneMarkerRef.current = marker;

                marker.bindTooltip('', {
                    permanent: true,
                    direction: 'bottom',
                    offset: [0, 10],
                    className: 'bg-white/95 border-0 shadow-lg rounded px-2 py-1 text-sm'
                });
                marker.setTooltipContent(formatLastUpdate(lastUpdateRef.current));
            } else {
                droneMarkerRef.current.setLatLng([lat, long]);
                const icon = droneMarkerRef.current.getIcon();
                if (icon instanceof L.DivIcon) {
                    const iconHtml = icon.options.html;
                    if (typeof iconHtml === 'string') {
                        // Only update the rotation value in the style attribute
                        const newHtml = iconHtml.replace(/rotate\([^)]+\)/, `rotate(${heading}deg)`);
                        icon.options.html = newHtml;
                        droneMarkerRef.current.setIcon(icon);
                    }
                }
                if (droneMarkerRef.current.getTooltip()) {
                    droneMarkerRef.current.setTooltipContent(formatLastUpdate(lastUpdateRef.current));
                }
            }
        },
        [map, formatLastUpdate, droneIconSvg]
    );

    useEffect(() => {
        drawDroneMarker(gpsData, isConnected);

        const interval = window.setInterval(() => {
            if (droneMarkerRef.current?.getTooltip() && lastUpdateRef.current) {
                droneMarkerRef.current.setTooltipContent(formatLastUpdate(lastUpdateRef.current));
            }
        }, 1000);

        return () => {
            window.clearInterval(interval);
            if (droneMarkerRef.current) {
                droneMarkerRef.current.remove();
                droneMarkerRef.current = null;
            }
        };
    }, [gpsData, isConnected, drawDroneMarker, formatLastUpdate]);

    return null;
};

const DataLayers: React.FC = () => {
    const context = useContext(GlobalAppContext);
    if (!context) throw new Error('DataLayers must be in GlobalAppProvider');

    const { gpsData, connectionStatus, frequencyData, frequencyVisibility } = context;
    const [isLoading, setIsLoading] = useState(false);
    const loadingTimeoutRef = useRef<TimeoutRef | null>(null);
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        const handleMoveStart = () => {
            if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
            setIsLoading(true);
        };

        const handleMoveEnd = () => {
            loadingTimeoutRef.current = setTimeout(() => setIsLoading(false), 1000);
        };

        map.on('movestart', handleMoveStart);
        map.on('moveend', handleMoveEnd);
        map.on('zoomstart', handleMoveStart);
        map.on('zoomend', handleMoveEnd);

        return () => {
            map.off('movestart', handleMoveStart);
            map.off('moveend', handleMoveEnd);
            map.off('zoomstart', handleMoveStart);
            map.off('zoomend', handleMoveEnd);
            if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        };
    }, [map]);

    return (
        <>
            <LoadingIndicator loading={isLoading} />
            <DroneMarker gpsData={gpsData} isConnected={connectionStatus === 1} />
            {frequencyVisibility.map(({ frequency, visible_pings, visible_location_estimate }) => (
                <FrequencyLayer
                    key={frequency}
                    frequency={frequency}
                    pings={frequencyData[frequency]?.pings || []}
                    locationEstimate={frequencyData[frequency]?.locationEstimate || null}
                    visible_pings={visible_pings}
                    visible_location_estimate={visible_location_estimate}
                />
            ))}
        </>
    );
};

export default DataLayers;
