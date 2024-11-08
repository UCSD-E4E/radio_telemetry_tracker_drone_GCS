// Initialize Leaflet map, centered on UC San Diego coordinates
var map = L.map('map').setView([32.8801, -117.2340], 15);
var currentGeoTiffLayer = null;

// Load OpenStreetMap tiles as a base layer
var baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

/**
 * Fetch available devices and populate the dropdown menu.
 */
function loadDevices() {
    fetch('/list_devices')
        .then(response => response.json())
        .then(data => {
            const deviceSelect = document.getElementById('device');
            deviceSelect.innerHTML = '<option value="">Select a device...</option>';
            data.forEach(device => {
                const option = document.createElement('option');
                option.value = device.port;
                option.textContent = `${device.port} - ${device.description}`;
                deviceSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading devices:', error);
            alert('Failed to load devices.');
        });
}

// Load devices on page load
window.onload = loadDevices;

// Device form submission
/**
 * Handle device form submission to connect to the selected device.
 */
document.getElementById('device-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const deviceSelect = document.getElementById('device');
    const selectedDevice = deviceSelect.value;

    if (!selectedDevice) {
        alert('Please select a device');
        return;
    }

    const formData = new FormData();
    formData.append('device', selectedDevice);

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
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to connect to device');
    });
});

// GeoTIFF upload and display
/**
 * Handle GeoTIFF file upload, display its bounds on the map, and update the map view.
 */
document.getElementById('geotiff-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const loadingElement = document.querySelector('.loading');
    loadingElement.style.display = 'block';  // Show the loading message

    const fileInput = document.getElementById('geotiff');
    if (fileInput.files.length === 0) {
        alert('Please select a GeoTIFF file to upload.');
        loadingElement.style.display = 'none';  // Hide the loading message
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('geotiff', file);

    try {
        const response = await fetch('/upload_geotiff', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload GeoTIFF');
        }

        const data = await response.json();
        const bounds = [
            [data.ymin, data.xmin],
            [data.ymax, data.xmax]
        ];

        // Create a rectangle to represent the GeoTIFF bounds with an outline only
        const rectangle = L.rectangle(bounds, {
            color: '#000000',
            weight: 2,
            fill: false // No fill, only an outline
        });

        // Remove existing GeoRasterLayer from map
        if (currentGeoTiffLayer) {
            map.removeLayer(currentGeoTiffLayer);
        }

        // Add new rectangle to map
        currentGeoTiffLayer = rectangle;
        rectangle.addTo(map);
        map.fitBounds(rectangle.getBounds());

    } catch (error) {
        console.error('Error:', error);
        alert('There was an error processing the GeoTIFF file.');

    } finally {
        loadingElement.style.display = 'none';  // Hide the loading message after processing
    }
});

// Shapefile upload and display
/**
 * Handle shapefile upload, plot the GeoJSON on the map, and update the map view.
 */
document.getElementById('shapefile-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
        const response = await fetch('/upload_shapefile', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (response.ok) {
            // Show a popup with the uploaded file names
            const fileNames = Array.from(formData.getAll('shapefiles')).map(file => file.name);
            alert('Uploaded Files: \n' + fileNames.join('\n'));

            // Plot GeoJSON on the map
            if (data.type === "FeatureCollection") {
                const geoJsonLayer = L.geoJSON(data, {
                    style: function (feature) {
                        return { color: "#ff7800", weight: 2 };
                    },
                    onEachFeature: function (feature, layer) {
                        if (feature.properties) {
                            let popupContent = "<table>";
                            for (const key in feature.properties) {
                                popupContent += `<tr><td><strong>${key}</strong></td><td>${feature.properties[key]}</td></tr>`;
                            }
                            popupContent += "</table>";
                            layer.bindPopup(popupContent);
                        }
                    }
                });

                // Remove any existing GeoJSON layers from the map
                if (currentGeoTiffLayer) {
                    map.removeLayer(currentGeoTiffLayer);
                }

                // Add the new GeoJSON layer to the map
                currentGeoTiffLayer = geoJsonLayer;
                geoJsonLayer.addTo(map);

                // Fit map bounds to the new layer
                map.fitBounds(geoJsonLayer.getBounds());
            }

        } else {
            alert(`Error: ${data.error}`);
        }
    } catch (error) {
        console.error('Error uploading shapefile:', error);
        alert('Failed to upload shapefile.');
    }
});

// GeoJSON export
/**
 * Handle GeoJSON export of the current map layer and prompt the user for a filename.
 */
document.getElementById('export-geojson').addEventListener('click', function () {
    if (currentGeoTiffLayer) {
        // Prompt user for filename
        let filename = prompt('Enter a filename for the GeoJSON export:', 'exported_data');

        // If user cancels the prompt, exit the function
        if (filename === null) return;

        // Add .geojson extension if not present
        if (!filename.toLowerCase().endsWith('.geojson')) {
            filename += '.geojson';
        }

        // Sanitize filename to remove invalid characters
        filename = filename.replace(/[/\\?%*:|"<>]/g, '-');

        // Extract GeoJSON data from the current layer on the map
        const geojsonData = currentGeoTiffLayer.toGeoJSON();

        // Create a Blob from the GeoJSON data and save it as a .geojson file
        const blob = new Blob([JSON.stringify(geojsonData, null, 2)], { type: 'application/geo+json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the URL object
        URL.revokeObjectURL(link.href);
    } else {
        alert('No GeoJSON data available to export.');
    }
});
