import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import POIForm from '../../../src/components/poi/POIForm'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'
import { GlobalAppState, GCSState } from '../../../src/context/globalAppTypes'
import { Map, LatLng } from 'leaflet'
import { describe, expect, it, vi } from 'vitest'

describe('POIForm component', () => {
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
        mapRef: {
            current: {
                getCenter: () => ({ lat: 32.88, lng: -117.234 } as LatLng)
            } as unknown as Map
        },
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

    it('renders POI form with input field', () => {
        render(
            <GlobalAppContext.Provider value={baseContext}>
                <POIForm />
            </GlobalAppContext.Provider>
        )
        
        const input = screen.getByPlaceholderText(/name/i)
        expect(input).toBeInTheDocument()
    })

    it('adds POI when form is submitted', async () => {
        const addPOIMock = vi.fn()
        const mockContext = {
            ...baseContext,
            addPOI: addPOIMock
        }

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <POIForm />
            </GlobalAppContext.Provider>
        )

        const input = screen.getByPlaceholderText(/name/i)
        await userEvent.type(input, 'Test POI')
        
        const addButton = screen.getByRole('button', { name: /add/i })
        await userEvent.click(addButton)
        
        expect(addPOIMock).toHaveBeenCalledWith('Test POI', [32.88, -117.234])
    })

    it('clears input after successful submission', async () => {
        const addPOIMock = vi.fn().mockResolvedValue(true)
        const mockContext = {
            ...baseContext,
            addPOI: addPOIMock
        }

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <POIForm />
            </GlobalAppContext.Provider>
        )

        const input = screen.getByPlaceholderText(/name/i)
        await userEvent.type(input, 'Test POI')
        
        const addButton = screen.getByRole('button', { name: /add/i })
        await userEvent.click(addButton)
        
        expect(input).toHaveValue('')
    })
})
