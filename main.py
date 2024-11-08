import os
from flask import Flask, render_template, request, jsonify
import serial.tools.list_ports
from rasterio.io import MemoryFile
import shapefile

app = Flask(__name__)

def list_connected_devices():
    """List all available serial ports, excluding those with 'n/a' descriptions."""
    ports = serial.tools.list_ports.comports()
    devices = [
        {"port": port.device, "description": port.description, "hwid": port.hwid} 
        for port in ports 
        if port.description != 'n/a'
    ]
    return devices

@app.route('/')
def home():
    """Render the home page."""
    return render_template('index.html')

@app.route('/device', methods=['POST'])
def select_device():
    """Select a connected device based on the provided identifier."""
    selected_device = request.form.get('device')
    devices = list_connected_devices()
    device_info = next((d for d in devices if d['port'] == selected_device), None)
    
    if device_info:
        print(f"Connected to '{device_info['port']}'")
        return jsonify({'message': f"Connected to '{device_info['port']}'"})
    else:
        return jsonify({'error': 'Device not found'}), 404

@app.route('/list_devices', methods=['GET'])
def list_devices():
    """Return a list of all connected devices as JSON."""
    devices = list_connected_devices()
    return jsonify(devices)

@app.route('/upload_geotiff', methods=['POST'])
def upload_geotiff():
    """Handle GeoTIFF file upload, extract bounds, and return as JSON."""
    try:
        # Get the uploaded file
        file = request.files['geotiff']
        
        # Read the file into a MemoryFile
        with MemoryFile(file.read()) as memfile:
            with memfile.open() as dataset:
                # Extract bounds from the GeoTIFF
                bounds = dataset.bounds
                response = {
                    'xmin': bounds.left,
                    'ymin': bounds.bottom,
                    'xmax': bounds.right,
                    'ymax': bounds.top
                }
                
        return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/upload_shapefile', methods=['POST'])
def upload_shapefile():
    """Handle shapefile upload, convert to GeoJSON, and return as JSON."""
    # Check if any files were uploaded
    if 'shapefiles' not in request.files:
        return jsonify({'error': 'No files uploaded'}), 400

    shapefiles = request.files.getlist('shapefiles')
    if not shapefiles:
        return jsonify({'error': 'No shapefiles found'}), 400

    # Initialize file variables
    shp_file = None
    shx_file = None
    dbf_file = None
    prj_file = None

    # Identify each file by its extension
    for f in shapefiles:
        if f.filename.endswith('.shp'):
            shp_file = f
        elif f.filename.endswith('.shx'):
            shx_file = f
        elif f.filename.endswith('.dbf'):
            dbf_file = f
        elif f.filename.endswith('.prj'):
            prj_file = f

    # Ensure mandatory files are present
    if not shp_file or not shx_file or not dbf_file:
        return jsonify({'error': 'Missing mandatory shapefile components (.shp, .shx, .dbf)'}), 400

    try:
        # Save the uploaded files to a temporary location for reading
        temp_dir = '/tmp/shapefiles'
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)

        shp_path = os.path.join(temp_dir, shp_file.filename)
        shx_path = os.path.join(temp_dir, shx_file.filename)
        dbf_path = os.path.join(temp_dir, dbf_file.filename)
        prj_path = os.path.join(temp_dir, prj_file.filename) if prj_file else None

        # Save each file locally
        shp_file.save(shp_path)
        shx_file.save(shx_path)
        dbf_file.save(dbf_path)
        if prj_file:
            prj_file.save(prj_path)

        # Read the shapefile using the saved files
        with shapefile.Reader(shp=shp_path, shx=shx_path, dbf=dbf_path) as shp:
            geojson_features = []
            for sr in shp.shapeRecords():
                geom = sr.shape.__geo_interface__
                geojson_features.append({
                    "type": "Feature",
                    "geometry": geom,
                    "properties": sr.record.as_dict()
                })

            geojson_data = {
                "type": "FeatureCollection",
                "features": geojson_features
            }
        # Return the GeoJSON data to the frontend
        return jsonify(geojson_data), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': 'Failed to process shapefile'}), 500
    
@app.route('/export_geojson', methods=['POST'])
def export_geojson():
    """Export GeoJSON data to a file."""
    try:
        # Extract GeoJSON data from the request
        data = request.get_json()
        geojson_str = data.get('geojson')

        if not geojson_str:
            return jsonify({'error': 'No GeoJSON data provided'}), 400

        # Save GeoJSON to a file
        export_path = '/tmp/exported_data.geojson'
        with open(export_path, 'w') as geojson_file:
            geojson_file.write(geojson_str)

        return jsonify({'message': 'GeoJSON data has been successfully exported'}), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': 'Failed to export GeoJSON data'}), 500

if __name__ == '__main__':
    app.run(debug=True)
