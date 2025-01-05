import React, { useEffect, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { DroneData } from '../../types/global';

const DataLayers: React.FC = () => {
    const map = useMap();
    const droneMarkerRef = React.useRef<L.Marker | null>(null);

    const drawDroneMarker = useCallback((data: DroneData) => {
        if (!map) return;

        const { lat, long, heading } = data;

        if (!droneMarkerRef.current) {
            // Create new marker
            droneMarkerRef.current = L.marker([lat, long], {
                icon: L.divIcon({
                    className: 'drone-marker',
                    html: `<div style="transform: rotate(${heading}deg)">🛩️</div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12],
                }),
            }).addTo(map);
        } else {
            // Update existing marker
            droneMarkerRef.current.setLatLng([lat, long]);
            const icon = droneMarkerRef.current.getIcon();
            if (icon instanceof L.DivIcon) {
                icon.options.html = `<div style="transform: rotate(${heading}deg)">🛩️</div>`;
                droneMarkerRef.current.setIcon(icon);
            }
        }
    }, [map]);

    useEffect(() => {
        if (!window.backend?.drone_data_updated) return;

        const handleDroneDataUpdated = (data: DroneData) => {
            drawDroneMarker(data);
        };

        window.backend.drone_data_updated.connect(handleDroneDataUpdated);

        return () => {
            window.backend?.drone_data_updated?.disconnect(handleDroneDataUpdated);
            if (droneMarkerRef.current) {
                droneMarkerRef.current.remove();
                droneMarkerRef.current = null;
            }
        };
    }, [drawDroneMarker]);

    return null;
};

export default DataLayers;
