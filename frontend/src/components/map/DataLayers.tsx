import React, { useEffect, useCallback, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { DroneData } from '../../types/global';
import { formatDistanceToNow, isValid } from 'date-fns';
import { logToPython } from '../../utils/logging';

const LoadingIndicator: React.FC<{ loading: boolean }> = ({ loading }) => {
    if (!loading) return null;

    return (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/90 px-3 py-1 rounded-full shadow-md z-[1000] text-sm">
            Loading tiles...
        </div>
    );
};

const DataLayers: React.FC = () => {
    const map = useMap();
    const droneMarkerRef = React.useRef<L.Marker | null>(null);
    const lastUpdateRef = React.useRef<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const loadingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Handle map movement and zoom events
    useEffect(() => {
        if (!map) return;

        const handleMoveStart = () => {
            // Clear any existing timeout
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
            setIsLoading(true);
        };

        const handleMoveEnd = () => {
            // Set a timeout to hide the loading indicator
            loadingTimeoutRef.current = setTimeout(() => {
                setIsLoading(false);
            }, 1000); // Wait 1 second after movement stops
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
            if (!timestamp) {
                return 'Last update: unknown';
            }

            // Create a Date object from the timestamp
            const date = new Date(timestamp);
            if (!isValid(date)) {
                return 'Last update: unknown';
            }

            // Format relative to now
            return `Last update: ${formatDistanceToNow(date, { addSuffix: true, includeSeconds: true })}`;
        } catch (error) {
            logToPython(`Error formatting timestamp: ${error}`);
            return 'Last update: unknown';
        }
    }, []);

    // SVG path for a drone icon (already faces north at 0 degrees)
    const droneIconSvg = `
        <div class="relative w-[20px] h-[20px]">
            <div class="absolute inset-0 flex items-center justify-center">
                <div class="drone-marker-pulse"></div>
            </div>
            <div class="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" style="transform: rotate(var(--rotation))">
                    <path d="M7 0L6 2V5L0 9V11H1L6 10L7 13L5 14V16H11V14L9 13L10 10L15 11H16V9L10 5V2L9 0H7Z"/>
                </svg>
            </div>
        </div>
    `;

    const drawDroneMarker = useCallback((data: DroneData | { disconnected: true }) => {
        if (!map) return;

        if ('disconnected' in data) {
            // Update existing marker to show disconnected state
            if (droneMarkerRef.current) {
                const icon = droneMarkerRef.current.getIcon();
                if (icon instanceof L.DivIcon) {
                    // Extract current rotation from the existing HTML if possible
                    const html = icon.options.html;
                    let currentRotation = "0";
                    if (typeof html === 'string') {
                        const match = html.match(/--rotation:\s*([^deg]*)/);
                        if (match && match[1]) {
                            currentRotation = match[1];
                        }
                    }
                    // Keep the same rotation, just change the color to gray
                    icon.options.html = `<div class="drone-marker-disconnected" style="--rotation: ${currentRotation}deg">${droneIconSvg}</div>`;
                    droneMarkerRef.current.setIcon(icon);
                }
                // Keep the last update time
            }
            return;
        }

        const { lat, long, heading, last_update } = data;
        lastUpdateRef.current = last_update;

        if (!droneMarkerRef.current) {
            // Create new marker
            droneMarkerRef.current = L.marker([lat, long], {
                icon: L.divIcon({
                    className: 'drone-marker',
                    html: `<div class="drone-marker-active" style="--rotation: ${heading}deg">${droneIconSvg}</div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10],
                }),
            }).addTo(map);

            // Add tooltip showing last update time
            droneMarkerRef.current.bindTooltip('', {
                permanent: true,
                direction: 'bottom',
                offset: [0, 10],
            });

            // Update tooltip content immediately
            droneMarkerRef.current.setTooltipContent(formatLastUpdate(data.last_update));
        } else {
            // Update existing marker
            droneMarkerRef.current.setLatLng([lat, long]);
            const icon = droneMarkerRef.current.getIcon();
            if (icon instanceof L.DivIcon) {
                icon.options.html = `<div class="drone-marker-active" style="--rotation: ${heading}deg">${droneIconSvg}</div>`;
                droneMarkerRef.current.setIcon(icon);
            }

            // Update tooltip content
            if (droneMarkerRef.current.getTooltip()) {
                droneMarkerRef.current.setTooltipContent(formatLastUpdate(data.last_update));
            }
        }
    }, [map, formatLastUpdate]);

    useEffect(() => {
        if (!window.backend?.drone_data_updated) return;

        const handleDroneDataUpdated = (data: DroneData | { disconnected: true }) => {
            drawDroneMarker(data);
        };

        window.backend.drone_data_updated.connect(handleDroneDataUpdated);

        // Update tooltip every minute
        const interval = setInterval(() => {
            if (droneMarkerRef.current && droneMarkerRef.current.getTooltip() && lastUpdateRef.current) {
                droneMarkerRef.current.setTooltipContent(formatLastUpdate(lastUpdateRef.current));
            }
        }, 60000);

        return () => {
            window.backend?.drone_data_updated?.disconnect(handleDroneDataUpdated);
            clearInterval(interval);
            if (droneMarkerRef.current) {
                droneMarkerRef.current.remove();
                droneMarkerRef.current = null;
            }
        };
    }, [drawDroneMarker]);

    return <LoadingIndicator loading={isLoading} />;
};

export default DataLayers;
