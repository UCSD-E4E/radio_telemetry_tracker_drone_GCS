import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MainLayout from '../../src/MainLayout'
import { GlobalAppContext } from '../../src/context/globalAppContextDef'
import { describe, expect, it } from 'vitest'
import type { GlobalAppState } from '../../src/context/globalAppTypes'
import { GCSState } from '../../src/context/globalAppTypes'

describe('MainLayout component', () => {
    const defaultContext: Partial<GlobalAppState> = {
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
        currentMapSource: { 
            id: 'osm', 
            name: 'OpenStreetMap',
            attribution: '© OpenStreetMap contributors',
            minZoom: 0,
            maxZoom: 19
        },
        mapSources: [{ 
            id: 'osm', 
            name: 'OpenStreetMap',
            attribution: '© OpenStreetMap contributors',
            minZoom: 0,
            maxZoom: 19
        }],
        frequencyVisibility: [],
        frequencyData: {},
        gpsData: null,
        connectionStatus: 0,
        mapRef: { current: null }
    }

    const renderWithContext = (contextOverrides = {}) => {
        const mergedContext = { ...defaultContext, ...contextOverrides } as GlobalAppState
        return render(
            <GlobalAppContext.Provider value={mergedContext}>
                <MainLayout />
            </GlobalAppContext.Provider>
        )
    }

    it('switches to "Frequencies" tab when clicked', async () => {
        renderWithContext()
        const tab = screen.getByRole('button', { name: 'Frequencies' })
        await userEvent.click(tab)
        expect(tab.className).toContain('bg-white text-blue-600')
    })
})
