/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { Signal } from '../utils/backend';

interface Window {
  QWebChannel: new (
    _transport: unknown,
    _callback: (_channel: unknown) => void
  ) => void;
  qt: {
    webChannelTransport: unknown;
  };
  backend: import('../utils/backend').DroneBackend;
  backendLoaded: boolean;
  pyqtApi: import('../utils/backend').DroneBackend;
}

declare module '*.css';

export interface DroneData {
    lat: number;
    long: number;
    altitude: number;
    heading: number;
    lastUpdate: number;  // timestamp
}

export interface PingData {
    frequency: number;
    amplitude: number;
    lat: number;
    long: number;
    timestamp: number;
}

export interface LocEstData {
    frequency: number;
    lat: number;
    long: number;
    timestamp: number;
}

export interface FrequencyLayer {
    frequency: number;
    pings: PingData[];
    locationEstimate: LocEstData | null;
    visible: boolean;
}

// Extend the existing Backend interface
interface Backend {
    // ... existing methods ...
    
    // New methods for drone and signal data
    onDroneData: Signal<DroneData>;
    onPingData: Signal<PingData>;
    onLocEstData: Signal<LocEstData>;
    
    clearFrequencyData: (frequency: number) => Promise<boolean>;
    clearAllData: () => Promise<boolean>;
}