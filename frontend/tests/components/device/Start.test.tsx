import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Start from '../../../src/components/device/cards/Start'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'
import { GlobalAppState, GCSState } from '../../../src/context/globalAppTypes'
import { describe, expect, it, vi } from 'vitest'

describe('Start component', () => {
    const baseContext: GlobalAppState = {
        gcsState: GCSState.START_INPUT,
        radioConfig: {
            interface_type: 'serial',
            serialPorts: ['COM1', 'COM2'],
            selectedPort: 'COM1',
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

    const renderWithContext = (contextOverrides: Partial<GlobalAppState> = {}) => {
        const mergedContext = { ...baseContext, ...contextOverrides }
        return render(
            <GlobalAppContext.Provider value={mergedContext}>
                <Start />
            </GlobalAppContext.Provider>
        )
    }

    it('renders start button in input state', () => {
        render(
            <GlobalAppContext.Provider value={baseContext}>
                <Start />
            </GlobalAppContext.Provider>
        )
        
        const startButton = screen.getByRole('button', { name: /start/i })
        expect(startButton).toBeInTheDocument()
        expect(startButton).toBeEnabled()
    })

    it('shows waiting message in waiting state', () => {
        renderWithContext({
            gcsState: GCSState.START_WAITING
        })

        expect(screen.getByText('Starting ping finder...')).toBeInTheDocument()
        expect(screen.getByText('This may take a few seconds')).toBeInTheDocument()
    })

    it('calls start function when button is clicked', async () => {
        const startMock = vi.fn()
        const mockContext = {
            ...baseContext,
            start: startMock
        }

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <Start />
            </GlobalAppContext.Provider>
        )

        const startButton = screen.getByRole('button', { name: /start/i })
        await userEvent.click(startButton)
        expect(startMock).toHaveBeenCalled()
    })
})
