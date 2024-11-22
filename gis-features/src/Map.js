import React, { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './leaflet/leaflet.js'; // Import custom local JS if needed

function Map() {
  useEffect(() => {
    // Initialize the map
    const map = L.map('map').setView([32.8801, -117.2340], 15);

    // Add a tile layer (OpenStreetMap in this case)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Clean up map instance on component unmount
    return () => {
      map.remove();
    };
  }, []);

  return (
    <div className="map-container" style={{ height: '100vh', width: '100%' }}>
      <div id="map" style={{ height: '100%', width: '100%' }}></div>
    </div>
  );
}

export default Map;
