import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MapOverlayControls from '../../../src/components/map/MapOverlayControls'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'
import { GlobalAppState, GCSState } from '../../../src/context/globalAppTypes'
import { describe, expect, it, vi } from 'vitest'

describe('MapOverlayControls component', () => {
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

    it('renders map source selector', () => {
        render(
            <GlobalAppContext.Provider value={baseContext}>
                <MapOverlayControls />
            </GlobalAppContext.Provider>
        )
        expect(screen.getByTitle('Map Style')).toBeInTheDocument()
    })

    it('changes map source when selected', async () => {
        const setCurrentMapSourceMock = vi.fn()
        const mockContext = {
            ...baseContext,
            setCurrentMapSource: setCurrentMapSourceMock
        }

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <MapOverlayControls />
            </GlobalAppContext.Provider>
        )

        // Click the Map Style button to show the selector
        await userEvent.click(screen.getByTitle('Map Style'))

        // Now select the map source
        const select = screen.getByRole('combobox')
        await userEvent.selectOptions(select, 'osm')
        expect(setCurrentMapSourceMock).toHaveBeenCalledWith(expect.objectContaining({
            id: 'osm'
        }))
    })
})
