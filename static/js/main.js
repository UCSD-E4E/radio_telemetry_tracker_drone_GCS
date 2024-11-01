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
document.getElementById('geotiff-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    document.querySelector('.loading').style.display = 'block';

    fetch('/upload_geotiff', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
            document.querySelector('.loading').style.display = 'none';
        } else {
            // Load and display the GeoTIFF
            fetch(data.file_path)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => {
                    parseGeoraster(arrayBuffer).then(georaster => {
                        // Remove existing GeoTIFF layer if it exists
                        if (currentGeoTiffLayer) {
                            map.removeLayer(currentGeoTiffLayer);
                        }

                        // Create and add the new GeoTIFF layer
                        currentGeoTiffLayer = new GeoRasterLayer({
                            georaster: georaster,
                            opacity: 0.7,
                            resolution: 256
                        });
                        
                        currentGeoTiffLayer.addTo(map);

                        // Fit map to GeoTIFF bounds
                        const bounds = [
                            [georaster.bounds.south, georaster.bounds.west],
                            [georaster.bounds.north, georaster.bounds.east]
                        ];
                        map.fitBounds(bounds);

                        document.querySelector('.loading').style.display = 'none';
                        alert('GeoTIFF loaded successfully!');
                    });
                })
                .catch(error => {
                    console.error('Error loading GeoTIFF:', error);
                    alert('Failed to load GeoTIFF file');
                    document.querySelector('.loading').style.display = 'none';
                });
        }
    });
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
