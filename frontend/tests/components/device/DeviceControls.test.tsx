import React from 'react'
import { render } from '@testing-library/react'
import DeviceControls from '../../../src/components/device/DeviceControls'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'
import { GCSState, GlobalAppState } from '../../../src/context/globalAppTypes'
import { describe, expect, it, vi } from 'vitest'

describe('DeviceControls component', () => {
    const mockSetMessageVisible = vi.fn()
    const mockSendRadioConfig = vi.fn()
    const mockCancelRadioConfig = vi.fn()
    const mockSendPingFinderConfig = vi.fn()
    const mockCancelPingFinderConfig = vi.fn()
    const mockStart = vi.fn()
    const mockCancelStart = vi.fn()
    const mockStop = vi.fn()
    const mockCancelStop = vi.fn()
    const mockDisconnect = vi.fn()

    const defaultContext: GlobalAppState = {
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
        setMessageVisible: mockSetMessageVisible,
        sendRadioConfig: mockSendRadioConfig,
        cancelRadioConfig: mockCancelRadioConfig,
        sendPingFinderConfig: mockSendPingFinderConfig,
        cancelPingFinderConfig: mockCancelPingFinderConfig,
        start: mockStart,
        cancelStart: mockCancelStart,
        stop: mockStop,
        cancelStop: mockCancelStop,
        disconnect: mockDisconnect,
        // Map related
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
        // GPS data
        gpsData: null,
        gpsDataUpdated: false,
        setGpsDataUpdated: vi.fn(),
        // Radio config
        setRadioConfig: vi.fn(),
        loadSerialPorts: vi.fn(),
        // Ping finder config
        setPingFinderConfig: vi.fn(),
        // Connection quality
        connectionQuality: 0,
        pingTime: 0,
        gpsFrequency: 0,
        // Connection status
        connectionStatus: 0,
        message: '',
        messageVisible: false,
        messageType: 'success',
        setupStateHandlers: vi.fn(),
        setGcsState: vi.fn(),
        // Simulator
        initSimulator: vi.fn(),
        cleanupSimulator: vi.fn(),
        isSimulatorRunning: false,
        // Fatal error
        fatalError: false
    }

    it('renders DroneStatus always', () => {
        const { getByText } = render(
            <GlobalAppContext.Provider value={defaultContext}>
                <DeviceControls />
            </GlobalAppContext.Provider>
        )
        expect(getByText('Drone Status')).toBeInTheDocument()
    })
})
