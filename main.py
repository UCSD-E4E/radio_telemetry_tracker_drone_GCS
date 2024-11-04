import os
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
import serial.tools.list_ports

app = Flask(__name__)

# Define the folder to save uploaded files
UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Allowed extensions for device communication
ALLOWED_EXTENSIONS = {'txt', 'log','tif','tiff'}

def allowed_file(filename):
    """Check if the file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def list_connected_devices():
    """List all available serial ports, excluding those with 'n/a' descriptions"""
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
    """Handle the upload of a GeoTIFF file."""
    if 'geotiff' not in request.files:
        return jsonify({'error': 'No file part'})
    
    file = request.files['geotiff']
    if file.filename == '':
        return jsonify({'error': 'No selected file'})
        
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        return jsonify({'message': 'GeoTIFF uploaded successfully', 'file_path': file_path})
    
    return jsonify({'error': 'Invalid file type'})

@app.route('/export_geojson', methods=['POST'])
def export_geojson():
    """Export GeoJSON data to a file."""
    geojson_data = request.json.get('geojson')
    with open(os.path.join(app.config['UPLOAD_FOLDER'], 'shapes.geojson'), 'w') as f:
        f.write(geojson_data)
    return jsonify({'message': 'GeoJSON exported successfully'})

if __name__ == '__main__':
    app.run(debug=True)