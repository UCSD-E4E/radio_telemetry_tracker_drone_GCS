import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import POIList from '../../../src/components/poi/POIList'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'
import { GlobalAppState, GCSState } from '../../../src/context/globalAppTypes'
import { Map } from 'leaflet'
import type { POI } from '../../../src/types/global'
import { describe, expect, it, vi } from 'vitest'

describe('POIList component', () => {
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
        mapRef: { current: { setView: vi.fn() } as unknown as Map },
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

    const mockPOIs: POI[] = [
        { name: 'Location A', coords: [32.88, -117.234] },
        { name: 'Location B', coords: [32.89, -117.235] }
    ]

    it('renders empty state when no POIs exist', () => {
        render(
            <GlobalAppContext.Provider value={baseContext}>
                <POIList />
            </GlobalAppContext.Provider>
        )
        
        expect(screen.getByText(/no locations added yet/i)).toBeInTheDocument()
    })

    it('renders list of POIs when they exist', () => {
        const mockContext = {
            ...baseContext,
            pois: mockPOIs
        }

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <POIList />
            </GlobalAppContext.Provider>
        )
        
        expect(screen.getByText('Location A')).toBeInTheDocument()
        expect(screen.getByText('Location B')).toBeInTheDocument()
    })

    it('calls removePOI when delete button is clicked', async () => {
        const removePOIMock = vi.fn()
        const mockContext = {
            ...baseContext,
            pois: mockPOIs,
            removePOI: removePOIMock
        }

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <POIList />
            </GlobalAppContext.Provider>
        )

        // First find the POI container by its text content
        const poiContainer = screen.getByText(/location a/i).closest('.flex.items-center.gap-2.p-2') as HTMLDivElement
        const removeButton = within(poiContainer).getByTitle('Remove')
        await userEvent.click(removeButton)
        
        expect(removePOIMock).toHaveBeenCalledWith('Location A')
    })

    it('centers map on POI when clicked', async () => {
        const setViewMock = vi.fn()
        const mockMapRef = {
            current: {
                setView: setViewMock,
                getZoom: () => 13
            } as unknown as Map
        }

        const mockContext = {
            ...baseContext,
            mapRef: mockMapRef,
            pois: mockPOIs
        }

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <POIList />
            </GlobalAppContext.Provider>
        )

        // First find the POI container by its text content
        const poiContainer = screen.getByText('Location A').closest('.flex.items-center.gap-2.p-2') as HTMLDivElement
        expect(poiContainer).toBeInTheDocument()

        // Then find the "Go to location" button within that container
        const goToButton = within(poiContainer).getByTitle('Go to location')
        await userEvent.click(goToButton)
        
        expect(setViewMock).toHaveBeenCalledWith([32.88, -117.234], 13)
    })
})
