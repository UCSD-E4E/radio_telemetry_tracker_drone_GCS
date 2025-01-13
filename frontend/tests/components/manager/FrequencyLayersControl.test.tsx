import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FrequencyLayersControl from '../../../src/components/manager/cards/FrequencyLayersControl'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'
import { GlobalAppState, GCSState } from '../../../src/context/globalAppTypes'
import type { PingData } from '../../../src/types/global'
import { describe, expect, it, vi } from 'vitest'

describe('FrequencyLayersControl component', () => {
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
        connectionQuality: 0,
        pingTime: 0,
        gpsFrequency: 0,
        connectionStatus: 0,
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

    const mockPing: PingData = {
        frequency: 150000,
        amplitude: 0.5,
        lat: 32.88,
        long: -117.234,
        timestamp: Date.now() * 1000,
        packet_id: 1
    }

    it('shows empty state when no frequencies exist', () => {
        render(
            <GlobalAppContext.Provider value={baseContext}>
                <FrequencyLayersControl />
            </GlobalAppContext.Provider>
        )
        expect(screen.getByRole('heading', { name: /frequency layers/i })).toBeInTheDocument()
        expect(screen.getByText(/no frequencies/i)).toBeInTheDocument()
    })

    it('displays frequency entry when data exists', () => {
        const mockContext = {
            ...baseContext,
            frequencyData: {
                150000: { pings: [mockPing], locationEstimate: null }
            },
            frequencyVisibility: [
                { frequency: 150000, visible_pings: true, visible_location_estimate: true }
            ]
        }

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <FrequencyLayersControl />
            </GlobalAppContext.Provider>
        )
        expect(screen.getByText(/0\.150|150\.000/i)).toBeInTheDocument()
        expect(screen.getByText(/mhz/i)).toBeInTheDocument()
    })

    it('deletes frequency when clear button is clicked', async () => {
        const deleteMock = vi.fn()
        const mockContext = {
            ...baseContext,
            frequencyVisibility: [
                { frequency: 150000, visible_pings: true, visible_location_estimate: true }
            ],
            frequencyData: {
                150000: { pings: [mockPing], locationEstimate: null }
            },
            deleteFrequencyLayer: deleteMock
        }

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <FrequencyLayersControl />
            </GlobalAppContext.Provider>
        )

        const clearButton = screen.getByRole('button', { name: /clear|delete|remove/i })
        await userEvent.click(clearButton)
        expect(deleteMock).toHaveBeenCalledWith(150000)
    })
})
