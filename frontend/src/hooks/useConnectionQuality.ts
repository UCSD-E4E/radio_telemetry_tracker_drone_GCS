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
    const [packetIntervals, setPacketIntervals] = useState<number[]>([]);

    const calculateConnectionQuality = (avgPingTime: number, avgFreq: number): 5 | 4 | 3 | 2 | 1 => {
        const pingQuality = avgPingTime < 200 ? 5 :
            avgPingTime < 500 ? 4 :
            avgPingTime < 1000 ? 3 :
            avgPingTime < 2000 ? 2 : 1;

        const freqQuality = avgFreq >= 1.0 ? 5 :
            avgFreq >= 0.75 ? 4 :  // data every ~1.3s
            avgFreq >= 0.5 ? 3 :   // data every 2s
            avgFreq >= 0.25 ? 2 :  // data every 4s
            1;                     // data slower than every 4s

        // Average the qualities but round down for safety
        return Math.floor((pingQuality + freqQuality) / 2) as 5 | 4 | 3 | 2 | 1;
    };

    // Reset state when disconnected
    useEffect(() => {
        if (!isConnected) {
            setConnectionQuality(0);
            setPingTime(0);
            setGpsFrequency(0);
            setPacketIntervals([]);
            lastPacketRef.current = null;
        }
    }, [isConnected]);

    useEffect(() => {
        if (!gpsData || !isConnected) return;

        const now = Date.now();
        const packetTimestamp = Math.floor(gpsData.timestamp / 1000); // Convert from microseconds to milliseconds
        
        // Calculate ping time for this packet
        const currentPing = now - packetTimestamp;
        setPingTime(currentPing);

        // Calculate packet interval and update frequency
        if (lastPacketRef.current) {
            const interval = packetTimestamp - lastPacketRef.current.timestamp;
            
            setPacketIntervals(prev => {
                const newIntervals = [...prev, interval];
                if (newIntervals.length > WINDOW_SIZE) {
                    newIntervals.shift();
                }
                return newIntervals;
            });

            if (packetIntervals.length > 0) {
                // Calculate average interval in seconds
                const avgInterval = packetIntervals.reduce((a, b) => a + b, 0) / packetIntervals.length / 1000;
                // Frequency is 1/interval
                const freq = avgInterval > 0 ? 1 / avgInterval : 0;
                setGpsFrequency(freq);
            }
        }

        lastPacketRef.current = { timestamp: packetTimestamp, receivedAt: now };

        // Calculate connection quality
        const quality = calculateConnectionQuality(currentPing, gpsFrequency);
        setConnectionQuality(quality);
    }, [gpsData, isConnected, gpsFrequency]);

    return { connectionQuality, pingTime, gpsFrequency };
} 