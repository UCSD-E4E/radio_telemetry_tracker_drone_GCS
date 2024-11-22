import React, { useState, useEffect } from 'react';

function Sidebar() {
  const [devices, setDevices] = useState([]);
  
  // Load devices when the component mounts
  useEffect(() => {
    fetch('http://localhost:5000/list_devices')  // Ensure to use the correct backend URL
      .then(response => response.json())
      .then(data => setDevices(data))
      .catch(error => console.error('Error loading devices:', error));
  }, []);

  const handleDeviceSubmit = (event) => {
    event.preventDefault();
    const device = event.target.device.value;
    if (!device) {
      alert('Please select a device');
      return;
    }
    const formData = new FormData();
    formData.append('device', device);

    fetch('http://localhost:5000/device', {  // Correct backend URL
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        alert('Error: ' + data.error);
      } else {
        alert('Successfully connected to: ' + data.message);
      }
    })
    .catch(error => alert('Failed to connect to device'));
  };

  const handleGeoTIFFUpload = (event) => {
    event.preventDefault();
    const formData = new FormData();
    const file = document.getElementById('geotiff').files[0];
    if (!file) {
      alert('Please select a GeoTIFF file');
      return;
    }
    formData.append('geotiff', file);

    fetch('http://localhost:5000/upload_geotiff', {  // Correct backend URL
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        alert('Error: ' + data.error);
      } else {
        alert('GeoTIFF uploaded successfully. Bounds: ' + JSON.stringify(data));
      }
    })
    .catch(error => alert('Failed to upload GeoTIFF'));
  };

  const handleShapefileUpload = (event) => {
    event.preventDefault();
    const formData = new FormData();
    const files = document.getElementById('shapefile').files;
    if (files.length === 0) {
      alert('Please select shapefiles');
      return;
    }
    Array.from(files).forEach(file => formData.append('shapefiles', file));

    fetch('http://localhost:5000/upload_shapefile', {  // Correct backend URL
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        alert('Error: ' + data.error);
      } else {
        alert('Shapefiles uploaded successfully');
        console.log('GeoJSON Data:', data);  // You can further process the GeoJSON data here
      }
    })
    .catch(error => alert('Failed to upload shapefiles'));
  };

  const handleExportGeoJSON = () => {
    // You need to send GeoJSON data for export (ensure you have it ready)
    const geojsonData = {};  // Replace with actual GeoJSON data

    fetch('http://localhost:5000/export_geojson', {  // Correct backend URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ geojson: JSON.stringify(geojsonData) })
    })
    .then(response => response.json())
    .then(data => alert(data.message))
    .catch(error => alert('Failed to export GeoJSON'));
  };

  return (
    <div className="sidebar">
      <h1>GIS Features</h1>
      
      {/* Device selection */}
      <div id="device-selection">
        <h3>Select Device</h3>
        <form id="device-form" onSubmit={handleDeviceSubmit}>
          <select name="device" id="device">
            <option value="">Loading devices...</option>
            {devices.map((device, index) => (
              <option key={index} value={device.port}>{device.port} - {device.description}</option>
            ))}
          </select>
          <button type="submit">Submit</button>
        </form>
      </div>

      {/* GeoTIFF upload */}
      <div id="upload-section">
        <h3>Upload GeoTIFF</h3>
        <form id="geotiff-form" encType="multipart/form-data" onSubmit={handleGeoTIFFUpload}>
          <input type="file" name="geotiff" id="geotiff" accept=".tif,.tiff" />
          <button type="submit">Upload</button>
        </form>
      </div>

      {/* Shapefile upload */}
      <div id="upload-shapefile-section">
        <h3>Upload Shapefile</h3>
        <form id="shapefile-form" encType="multipart/form-data" onSubmit={handleShapefileUpload}>
          <input type="file" name="shapefiles" id="shapefile" accept=".shp,.shx,.dbf,.prj" multiple />
          <button type="submit">Upload</button>
        </form>
      </div>

      {/* Export Button */}
      <button id="export-geojson" onClick={handleExportGeoJSON}>Export GeoJSON</button>
    </div>
  );
}

export default Sidebar;
