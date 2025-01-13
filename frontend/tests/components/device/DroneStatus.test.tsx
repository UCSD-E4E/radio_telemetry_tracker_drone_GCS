import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DroneStatus from '../../../src/components/device/cards/DroneStatus'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'
import { GlobalAppState, GCSState } from '../../../src/context/globalAppTypes'
import { Map } from 'leaflet'
import { describe, expect, it, vi } from 'vitest'

// Mock the useConnectionQuality hook
vi.mock('../../../src/hooks/useConnectionQuality', () => ({
    useConnectionQuality: () => ({
        connectionQuality: 4,
        pingTime: 100,
        gpsFrequency: 1
    })
}))

describe('DroneStatus component', () => {
    const baseContext: GlobalAppState = {
        gcsState: GCSState.RADIO_CONFIG_INPUT,
        radioConfig: {
            interface_type: 'serial',
            serialPorts: [],
            selectedPort: '',
            baudRate: 115200,
            host: 'localhost',
            tcpPort: 50000,
            ackTimeout: 2000,
            maxRetries: 5
        },
        pingFinderConfig: {
            gain: 56.0,
            samplingRate: 2500000,
            centerFrequency: 173500000,
            enableTestData: false,
            pingWidthMs: 25,
            pingMinSnr: 25,
            pingMaxLenMult: 1.5,
            pingMinLenMult: 0.5,
            targetFrequencies: []
        },
        isMapOffline: false,
        setIsMapOfflineUser: vi.fn(),
        currentMapSource: { 
            id: 'osm', 
            name: 'OpenStreetMap',
            attribution: '© OpenStreetMap contributors',
            minZoom: 0,
            maxZoom: 19
        },
        setCurrentMapSource: vi.fn(),
        mapSources: [{ 
            id: 'osm', 
            name: 'OpenStreetMap',
            attribution: '© OpenStreetMap contributors',
            minZoom: 0,
            maxZoom: 19
        }],
        tileInfo: null,
        pois: [],
        frequencyData: {},
        deleteFrequencyLayer: vi.fn(),
        deleteAllFrequencyLayers: vi.fn(),
        frequencyVisibility: [],
        setFrequencyVisibility: vi.fn(),
        mapRef: { current: null as unknown as Map },
        loadPOIs: vi.fn(),
        addPOI: vi.fn(),
        removePOI: vi.fn(),
        clearTileCache: vi.fn(),
        gpsData: {
            lat: 32.88,
            long: -117.234,
            altitude: 100,
            heading: 90,
            timestamp: Date.now(),
            packet_id: 1
        },
        gpsDataUpdated: true,
        setGpsDataUpdated: vi.fn(),
        setRadioConfig: vi.fn(),
        loadSerialPorts: vi.fn(),
        sendRadioConfig: vi.fn(),
        cancelRadioConfig: vi.fn(),
        setPingFinderConfig: vi.fn(),
        sendPingFinderConfig: vi.fn(),
        cancelPingFinderConfig: vi.fn(),
        start: vi.fn(),
        cancelStart: vi.fn(),
        stop: vi.fn(),
        cancelStop: vi.fn(),
        disconnect: vi.fn(),
        connectionQuality: 4,
        pingTime: 100,
        gpsFrequency: 1,
        connectionStatus: 1,
        message: '',
        messageVisible: false,
        messageType: 'success',
        setupStateHandlers: vi.fn(),
        setMessageVisible: vi.fn(),
        setGcsState: vi.fn(),
        initSimulator: vi.fn(),
        cleanupSimulator: vi.fn(),
        isSimulatorRunning: false,
        fatalError: false
    }

    it('renders connection and GPS stats when connected', () => {
        render(
            <GlobalAppContext.Provider value={baseContext}>
                <DroneStatus />
            </GlobalAppContext.Provider>
        )
        
        const container = screen.getByRole('heading', { name: /drone status/i }).closest('.card')
        expect(container).toBeInTheDocument()
        
        // Check for ping time and GPS frequency
        expect(container).toHaveTextContent('100ms')  // From mock useConnectionQuality
        expect(container).toHaveTextContent('1.0Hz')  // From mock useConnectionQuality
        
        // Verify locate button is enabled
        const locateButton = screen.getByRole('button', { name: /locate/i })
        expect(locateButton).toBeEnabled()
    })

    it('shows no data indicators when GPS data is unavailable', () => {
        const noGpsContext = {
            ...baseContext,
            gpsData: null
        }
        render(
            <GlobalAppContext.Provider value={noGpsContext}>
                <DroneStatus />
            </GlobalAppContext.Provider>
        )
        
        const container = screen.getByRole('heading', { name: /drone status/i }).closest('.card')
        expect(container).toHaveTextContent(/--/i)  // Check for the no data indicator
        
        // Verify the locate button is disabled
        const locateButton = screen.getByRole('button', { name: /locate/i })
        expect(locateButton).toBeDisabled()
    })

    it('displays connection quality indicator', () => {
        render(
            <GlobalAppContext.Provider value={baseContext}>
                <DroneStatus />
            </GlobalAppContext.Provider>
        )
        
        // Check for presence of connection quality without exact formatting
        const container = screen.getByRole('heading', { name: /drone status/i }).closest('.card')
        expect(container).toHaveTextContent(/excellent range/i)  // For connection quality 4 and connected status
    })

    it('handles locate button click', async () => {
        const mockMapRef = {
            current: {
                setView: vi.fn(),
                getZoom: () => 13
            } as unknown as Map
        }
        
        const mockContext = {
            ...baseContext,
            mapRef: mockMapRef
        }

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <DroneStatus />
            </GlobalAppContext.Provider>
        )

        const locateButton = screen.getByRole('button', { name: /locate/i })
        await userEvent.click(locateButton)
        expect(mockMapRef.current.setView).toHaveBeenCalledWith([32.88, -117.234], 13)
    })
})
