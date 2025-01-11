import { useState, useEffect } from 'react';
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
    const [pingTimeWindow, setPingTimeWindow] = useState<number[]>([]);
    const [freqWindow, setFreqWindow] = useState<number[]>([]);

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
            setPingTimeWindow([]);
            setFreqWindow([]);
        }
    }, [isConnected]);

    useEffect(() => {
        if (!gpsData || !isConnected) return;

        const now = new Date().getTime();
        const lastUpdate = new Date(gpsData.timestamp).getTime();
        const timeDiff = now - lastUpdate;

        // Update ping time window
        setPingTimeWindow(prev => {
            const newWindow = [...prev, timeDiff];
            if (newWindow.length > WINDOW_SIZE) {
                newWindow.shift();
            }
            return newWindow;
        });

        // Update frequency window
        setFreqWindow(prev => {
            const newWindow = [...prev, now];
            if (newWindow.length > WINDOW_SIZE) {
                newWindow.shift();
            }
            return newWindow;
        });

        // Calculate average ping time
        const avgPingTime = Math.round(pingTimeWindow.reduce((a, b) => a + b, 0) / pingTimeWindow.length);
        setPingTime(avgPingTime);

        // Calculate GPS frequency
        if (freqWindow.length >= 2) {
            const timeSpan = freqWindow[freqWindow.length - 1] - freqWindow[0];
            const freq = ((freqWindow.length - 1) / timeSpan) * 1000;
            setGpsFrequency(freq);
        }

        // Calculate connection quality
        const quality = calculateConnectionQuality(avgPingTime, gpsFrequency);
        setConnectionQuality(quality);
    }, [gpsData, gpsFrequency, freqWindow, pingTimeWindow, isConnected]);

    return { connectionQuality, pingTime, gpsFrequency };
} 