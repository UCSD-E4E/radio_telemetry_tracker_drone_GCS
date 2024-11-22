import React, { useState, useEffect } from 'react';

function Sidebar() {
  const [devices, setDevices] = useState([]);
  
  // Load devices when the component mounts
  useEffect(() => {
    fetch('/list_devices')
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

    fetch('/device', {
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
        <form id="geotiff-form" encType="multipart/form-data">
          <input type="file" name="geotiff" id="geotiff" accept=".tif,.tiff" />
          <button type="submit">Upload</button>
        </form>
      </div>

      {/* Shapefile upload */}
      <div id="upload-shapefile-section">
        <h3>Upload Shapefile</h3>
        <form id="shapefile-form" encType="multipart/form-data">
          <input type="file" name="shapefiles" id="shapefile" accept=".shp,.shx,.dbf,.prj" multiple />
          <button type="submit">Upload</button>
        </form>
      </div>

      {/* Export Button */}
      <button id="export-geojson">Export GeoJSON</button>
    </div>
  );
}

export default Sidebar;
