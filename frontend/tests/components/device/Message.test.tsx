import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Message from '../../../src/components/device/cards/Message'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'
import { GlobalAppState, GCSState } from '../../../src/context/globalAppTypes'
import { describe, expect, it, vi } from 'vitest'

describe('Message component', () => {
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
        message: 'Test message',
        messageVisible: true,
        messageType: 'success',
        setupStateHandlers: vi.fn(),
        setMessageVisible: vi.fn(),
        setGcsState: vi.fn(),
        initSimulator: vi.fn(),
        cleanupSimulator: vi.fn(),
        isSimulatorRunning: false,
        fatalError: false
    }

    it('renders message when visible', () => {
        render(
            <GlobalAppContext.Provider value={baseContext}>
                <Message message="Test message" type="success" />
            </GlobalAppContext.Provider>
        )
        // Check for presence of message container and content
        const messageElement = screen.getByRole('alert')
        expect(messageElement).toBeInTheDocument()
        expect(messageElement).toHaveTextContent('Test message')
    })

    it('does not render when message is not visible', () => {
        const hiddenContext = {
            ...baseContext,
            messageVisible: false
        }
        render(
            <GlobalAppContext.Provider value={hiddenContext}>
                <Message message="Hidden message" type="success" />
            </GlobalAppContext.Provider>
        )
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('calls setMessageVisible when close button is clicked', async () => {
        const setMessageVisibleMock = vi.fn()
        const mockContext = {
            ...baseContext,
            setMessageVisible: setMessageVisibleMock
        }
        render(
            <GlobalAppContext.Provider value={mockContext}>
                <Message message="Closeable message" type="success" />
            </GlobalAppContext.Provider>
        )
        
        // Find close button by role and click it
        const closeButton = screen.getByRole('button')
        await userEvent.click(closeButton)
        expect(setMessageVisibleMock).toHaveBeenCalledWith(false)
    })
})
