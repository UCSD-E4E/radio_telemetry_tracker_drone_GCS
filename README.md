# Radio Telemetry Tracker Drone Ground Control Station (GCS)

**The Radio Telemetry Tracker Drone Ground Control Station (GCS)** is a desktop application designed to interface with the [**Radio Telemetry Tracker Drone Field Device Software (FDS)**](https://github.com/UCSD-E4E/radio-telemetry-tracker-drone-fds) for wildlife radio tracking. Using this GCS, users can configure radio parameters, send start/stop commands, track GPS data, visualize pings on a map, and control drone operations in real-time or via a built-in simulator.

## Table of Contents
- [Radio Telemetry Tracker Drone Ground Control Station (GCS)](#radio-telemetry-tracker-drone-ground-control-station-gcs)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
  - [System Requirements](#system-requirements)
  - [Download and Installation](#download-and-installation)
    - [Prebuilt Releases](#prebuilt-releases)
    - [Building from Source](#building-from-source)
    - [Hot-running the app](#hot-running-the-app)
  - [Troubleshooting](#troubleshooting)
  - [License](#license)

## Overview

The **GCS** complements the **FDS** software (which runs on the drone payload), enabling a real-time link for controlling and monitoring wildlife telemetry operations. Whether you’re tracking radio-tagged animals in the field or testing the system at a desk, this tool offers a graphical interface for:

1. **Radio Configuration** – set baud rates, TCP/serial modes, retry settings.
2. **Ping Finder Configuration** – manage scanning frequencies and signal detection parameters.
3. **GPS Visualization** – see the drone’s location on a map, plus ping detection layers.
4. **Start/Stop** – control the FDS’s signal scanning process.
5. **Offline/Simulator** – test or demo the system without drone hardware.

## Features

- **Interactive Map**: Displays live drone position, ping detections, and location estimates.
- **Telemetry**: Real-time GPS updates, frequency data, and logs from the drone FDS.
- **Configurable**: Choose between serial or TCP communications.
- **Simulator**: Built-in simulator for local testing (no physical drone hardware required).
- **Offline Caching**: Optionally caches map tiles for limited connectivity environments.

## System Requirements

- **Operating System**: Windows 10/11, Ubuntu 22.04+ (or similar).
- **Memory**: 8 GB+ recommended.
- **Python**: 3.13+ if building/running Python backend.
- **Poetry**: 2.0+ if building/running Python backend.
- **Node.js**: 22+ if building React/TypeScript locally.
- **Dependencies**:
  - PyQt6, PyQt6-WebEngine, requests, pyproj, scipy (for the Python side).
  - React, Leaflet, TypeScript, etc. (for the frontend).

*(Prebuilt releases may bundle these dependencies, so you don’t need to install them separately.)*

## Download and Installation

### Prebuilt Releases

Precompiled executables are availabe under the [**Releases** tab](https://github.com/UCSD-E4E/radio-telemetry-tracker-drone-gcs/releases). 

Download the one for your platform, unzip it, and run the executable.

### Building from Source

If you want to build from source:

1. **Clone** the repository:

```bash
git clone https://github.com/UCSD-E4E/radio-telemetry-tracker-drone-gcs.git
cd radio-telemetry-tracker-drone-gcs
```

2. **Install dependencies**:

   - **Python side**:
    ```bash
    poetry install
    ```

   - **Node/React side (optional)**:
    ```bash
    cd frontend
    npm install
    ```

3. **Build** the app:
    ```bash
    poetry run rtt-gcs-build
    ```
    This generates a `dist/` folder with the executable. Note that PyInstaller only builds for the current platform.

### Hot-running the app

To run the app with minimal build requirements, you can use the following command:

```bash
poetry run rtt-gcs-dev
```

This will only build the frontend and run the Python backend.


## Troubleshooting
1. **Connection Fails**
   - Verify the drone’s FDS is powered and running.
   - Confirm correct COM port or TCP port settings.
   - Check logs for “Unable to sync” or “Timeout”.
2. **No Map Tiles**
   - If offline, you may need to cache tiles while connected or switch back to online mode.
   - Check the tile info overlay in GCS for how many tiles are cached.
3. **Simulator Doesn’t Start**
   - Make sure you installed Python dependencies (e.g., radio_telemetry_tracker_drone_comms_package).
   - Check the console logs for errors.
4. **Crashes or Unresponsive**
   - Try restarting the GCS, or updating graphics drivers for QWebEngine.
   - Use the system’s event logs or journalctl (Linux) for deeper info.

## License
This project is licensed under the terms specified in the [LICENSE](LICENSE) file.
