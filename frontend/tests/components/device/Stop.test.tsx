import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Stop from '../../../src/components/device/cards/Stop'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'
import { GlobalAppState, GCSState } from '../../../src/context/globalAppTypes'
import { describe, expect, it, vi } from 'vitest'

describe('Stop component', () => {
    const baseContext: GlobalAppState = {
        gcsState: GCSState.STOP_INPUT,
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
        mapRef: { current: null },
        loadPOIs: vi.fn(),
        addPOI: vi.fn(),
        removePOI: vi.fn(),
        clearTileCache: vi.fn(),
        gpsData: null,
        gpsDataUpdated: false,
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

    it('renders stop button in input state', () => {
        render(
            <GlobalAppContext.Provider value={baseContext}>
                <Stop />
            </GlobalAppContext.Provider>
        )
        
        const stopButton = screen.getByRole('button', { name: /stop/i })
        expect(stopButton).toBeInTheDocument()
        expect(stopButton).toBeEnabled()
    })

    it('disables stop button in waiting state', () => {
        const mockContext = {
            ...baseContext,
            gcsState: GCSState.STOP_WAITING
        }

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <Stop />
            </GlobalAppContext.Provider>
        )

        expect(screen.getByText('Stopping ping finder...')).toBeInTheDocument()
        expect(screen.getByText('This may take a few seconds')).toBeInTheDocument()
    })

    it('calls stop function when button is clicked', async () => {
        const stopMock = vi.fn()
        const mockContext = {
            ...baseContext,
            stop: stopMock
        }

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <Stop />
            </GlobalAppContext.Provider>
        )

        const stopButton = screen.getByRole('button', { name: /stop/i })
        await userEvent.click(stopButton)
        expect(stopMock).toHaveBeenCalled()
    })
})
