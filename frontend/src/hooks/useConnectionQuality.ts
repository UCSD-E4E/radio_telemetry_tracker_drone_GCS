import { useState, useEffect, useRef } from 'react';
import type { GpsData } from '../types/global';

const WINDOW_SIZE = 10;

export interface ConnectionQualityState {
    connectionQuality: 5 | 4 | 3 | 2 | 1 | 0;
    pingTime: number;
    gpsFrequency: number;
}

export function useConnectionQuality(gpsData: GpsData | null, isConnected: boolean): ConnectionQualityState {
    const [connectionQuality, setConnectionQuality] = useState<5 | 4 | 3 | 2 | 1 | 0>(0);
    const [pingTime, setPingTime] = useState<number>(0);
    const [gpsFrequency, setGpsFrequency] = useState<number>(0);
    const lastPacketRef = useRef<{ timestamp: number, receivedAt: number } | null>(null);
    const packetIntervalsRef = useRef<number[]>([]);

    const calculateConnectionQuality = (avgPingTime: number, avgFreq: number): 5 | 4 | 3 | 2 | 1 => {
        const pingQuality = avgPingTime < 500 ? 5 :    // More lenient ping thresholds
            avgPingTime < 1000 ? 4 :
            avgPingTime < 2000 ? 3 :
            avgPingTime < 3000 ? 2 : 1;

        const freqQuality = avgFreq >= 0.8 ? 5 :      // More lenient frequency thresholds
            avgFreq >= 0.5 ? 4 :   // data every ~2s
            avgFreq >= 0.25 ? 3 :  // data every 4s
            avgFreq >= 0.1 ? 2 :   // data every 10s
            1;                     // slower than every 10s

        // Average the qualities but round up for more leniency
        return Math.ceil((pingQuality + freqQuality) / 2) as 5 | 4 | 3 | 2 | 1;
    };

    // Reset state when disconnected
    useEffect(() => {
        if (!isConnected) {
            setConnectionQuality(0);
            setPingTime(0);
            setGpsFrequency(0);
            packetIntervalsRef.current = [];
            lastPacketRef.current = null;
        }
    }, [isConnected]);

    useEffect(() => {
        if (!gpsData || !isConnected) return;

        const now = Date.now();
        const packetTimestamp = Math.floor(gpsData.timestamp / 1000); // Convert from microseconds to milliseconds
        
        // Calculate ping time for this packet
        const currentPing = now - packetTimestamp;

        // Calculate packet interval and update frequency
        if (lastPacketRef.current) {
            const interval = packetTimestamp - lastPacketRef.current.timestamp;
            
            const intervals = [...packetIntervalsRef.current, interval];
            if (intervals.length > WINDOW_SIZE) {
                intervals.shift();
            }
            
            // Calculate frequency using the latest intervals
            const avgIntervalMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const freq = avgIntervalMs > 0 ? 1000 / avgIntervalMs : 0;
            
            packetIntervalsRef.current = intervals;
            setGpsFrequency(freq);
            
            // Calculate quality using the latest values
            const quality = calculateConnectionQuality(currentPing, freq);
            setConnectionQuality(quality);
            setPingTime(currentPing);
        } else {
            // First packet, just set ping time
            setPingTime(currentPing);
        }

        lastPacketRef.current = { timestamp: packetTimestamp, receivedAt: now };
    }, [gpsData, isConnected]);

    return { connectionQuality, pingTime, gpsFrequency };
} 