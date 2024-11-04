// Initialize Leaflet map, centered on UC San Diego coordinates
var map = L.map('map').setView([32.8801, -117.2340], 15);
var currentGeoTiffLayer = null;

// Load OpenStreetMap tiles as a base layer
var baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Fetch available devices and populate the dropdown
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
document.getElementById('geotiff-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    console.log('GeoTIFF form submitted');

    const loadingElement = document.querySelector('.loading');
    loadingElement.style.display = 'block';  // Show the loading message

    const fileInput = document.getElementById('geotiff');
    if (fileInput.files.length === 0) {
        console.log('No file selected');
        alert('Please select a GeoTIFF file to upload.');
        loadingElement.style.display = 'none';  // Hide the loading message
        return;
    }

    const file = fileInput.files[0];
    console.log('File selected:', file.name);

    const formData = new FormData();
    formData.append('geotiff', file);

    try {
        console.log('Sending GeoTIFF to backend');
        const response = await fetch('/upload_geotiff', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload GeoTIFF');
        }

        const data = await response.json();
        console.log('Received bounds from backend:', data);

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
        console.log('Removing existing GeoRasterLayer from map');
        if (currentGeoTiffLayer) {
            map.removeLayer(currentGeoTiffLayer);
        }

        // Add new rectangle to map
        console.log('Adding new rectangle to map');
        currentGeoTiffLayer = rectangle;
        rectangle.addTo(map);
        console.log('Fitting map bounds to new layer');
        map.fitBounds(rectangle.getBounds());

    } catch (error) {
        console.error('Error:', error);
        alert('There was an error processing the GeoTIFF file.');

    } finally {
        loadingElement.style.display = 'none';  // Hide the loading message after processing
    }
});





// Export GeoJSON data
document.getElementById('export-geojson').addEventListener('click', function () {
    var geojsonData = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [32.8801, -117.2340]
                }
            }
        ]
    };

    fetch('/export_geojson', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({geojson: JSON.stringify(geojsonData)})
    })
    .then(response => response.json())
    .then(data => alert(data.message));
});