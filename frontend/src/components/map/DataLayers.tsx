import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { formatDistanceToNow, isValid } from 'date-fns';
import { logToPython } from '../../utils/logging';
import type { DroneData, TimeoutRef } from '../../types/global';

// Heroicon spinner
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface LoadingIndicatorProps {
    loading: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ loading }) => {
    if (!loading) return null;

    // Display a small popover near the top/center of the map
    return (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/90 px-3 py-1 rounded-full shadow-md z-[1000] flex items-center gap-2 text-sm text-blue-700">
            <ArrowPathIcon className="w-5 h-5 animate-spin" />
            <span>Loading tiles...</span>
        </div>
    );
};

const DataLayers: React.FC = () => {
    const map = useMap();
    const droneMarkerRef = useRef<L.Marker | null>(null);
    const lastUpdateRef = useRef<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const loadingTimeoutRef = useRef<TimeoutRef | null>(null);

    // Show/hide a loading indicator while the map is moving or zooming
    useEffect(() => {
        if (!map) return;

        const handleMoveStart = () => {
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
            setIsLoading(true);
        };

        const handleMoveEnd = () => {
            // Wait 1 second after movement stops before hiding
            loadingTimeoutRef.current = setTimeout(() => {
                setIsLoading(false);
            }, 1000);
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

            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        };
    }, [map]);

    const formatLastUpdate = useCallback((timestamp: number | undefined) => {
        try {
            if (!timestamp) return 'Last update: unknown';

            const date = new Date(timestamp);
            if (!isValid(date)) return 'Last update: unknown';

            // Format relative to "now"
            return `Last update: ${formatDistanceToNow(date, { addSuffix: true, includeSeconds: true })}`;
        } catch (err) {
            logToPython(`Error formatting timestamp: ${err}`);
            return 'Last update: unknown';
        }
    }, []);

    // The drone marker is still a custom inline SVG, 
    // because there's no standard heroicon for a drone
    const droneIconSvg = useMemo(() => `
        <div class="relative w-[20px] h-[20px]">
            <div class="absolute inset-0 flex items-center justify-center">
                <div class="drone-marker-pulse"></div>
            </div>
            <div class="absolute inset-0 flex items-center justify-center">
                <svg 
                    viewBox="0 0 16 16" 
                    width="16" 
                    height="16" 
                    fill="currentColor" 
                    style="transform: rotate(var(--rotation))"
                >
                    <path d="M7 0L6 2V5L0 9V11H1L6 10L7 13L5 14V16H11V14L9 13L10 10L15 11H16V9L10 5V2L9 0H7Z"/>
                </svg>
            </div>
        </div>
    `, []);

    const drawDroneMarker = useCallback(
        (data: DroneData | { disconnected: true }) => {
            if (!map) return;

            if ('disconnected' in data) {
                // If we detect a "disconnected" state, show a 'drone-marker-disconnected'
                if (droneMarkerRef.current) {
                    const icon = droneMarkerRef.current.getIcon();
                    if (icon instanceof L.DivIcon) {
                        let currentRotation = '0';
                        const html = icon.options.html;
                        if (typeof html === 'string') {
                            const match = html.match(/--rotation:\s*([^deg]+)/);
                            if (match && match[1]) {
                                currentRotation = match[1];
                            }
                        }
                        icon.options.html = `<div class="drone-marker-disconnected" style="--rotation: ${currentRotation}deg">${droneIconSvg}</div>`;
                        droneMarkerRef.current.setIcon(icon);
                    }
                }
                return;
            }

            // Normal drone data
            const { lat, long, heading, last_update } = data;
            lastUpdateRef.current = last_update;

            if (!droneMarkerRef.current) {
                // Create a new marker
                const icon = L.divIcon({
                    className: 'drone-marker',
                    html: `<div class="drone-marker-active" style="--rotation: ${heading}deg">${droneIconSvg}</div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10],
                });
                const marker = L.marker([lat, long], { icon }).addTo(map);
                droneMarkerRef.current = marker;

                // Bind a tooltip that shows last update time
                marker.bindTooltip('', {
                    permanent: true,
                    direction: 'bottom',
                    offset: [0, 10],
                });
                marker.setTooltipContent(formatLastUpdate(last_update));
            } else {
                // Update existing marker's position & rotation
                droneMarkerRef.current.setLatLng([lat, long]);
                const icon = droneMarkerRef.current.getIcon();
                if (icon instanceof L.DivIcon) {
                    icon.options.html = `<div class="drone-marker-active" style="--rotation: ${heading}deg">${droneIconSvg}</div>`;
                    droneMarkerRef.current.setIcon(icon);
                }
                // Update tooltip
                if (droneMarkerRef.current.getTooltip()) {
                    droneMarkerRef.current.setTooltipContent(formatLastUpdate(last_update));
                }
            }
        },
        [map, formatLastUpdate, droneIconSvg]
    );

    // Connect to the drone_data_updated signal
    useEffect(() => {
        if (!window.backend?.drone_data_updated) return;

        const handleDroneDataUpdated = (data: DroneData | { disconnected: true }) => {
            drawDroneMarker(data);
        };

        window.backend.drone_data_updated.connect(handleDroneDataUpdated);

        // Update the tooltip's timestamp every minute
        const interval = window.setInterval(() => {
            if (
                droneMarkerRef.current &&
                droneMarkerRef.current.getTooltip() &&
                lastUpdateRef.current
            ) {
                droneMarkerRef.current.setTooltipContent(
                    formatLastUpdate(lastUpdateRef.current)
                );
            }
        }, 60_000);

        return () => {
            window.backend?.drone_data_updated?.disconnect(handleDroneDataUpdated);
            window.clearInterval(interval);
            if (droneMarkerRef.current) {
                droneMarkerRef.current.remove();
                droneMarkerRef.current = null;
            }
        };
    }, [drawDroneMarker, formatLastUpdate]);

    return <LoadingIndicator loading={isLoading} />;
};

export default DataLayers;
