import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MainLayout from '../../src/MainLayout'
import { GlobalAppContext } from '../../src/context/globalAppContextDef'
import { describe, expect, it, vi } from 'vitest'

describe('MainLayout component', () => {
    const defaultContext = {
        gcsState: 'RADIO_CONFIG_INPUT',
        radioConfig: {
            interface_type: 'serial',
            serialPorts: [],
            selectedPort: '',
            baudRate: 115200
        },
        currentMapSource: { id: 'osm', name: 'OpenStreetMap' },
        mapSources: [{ id: 'osm', name: 'OpenStreetMap' }],
        frequencyVisibility: [],
        frequencyData: {},
        gpsData: null,
        connectionStatus: 0,
        isLoading: false,
        mapRef: { current: null }
    } as any

    const renderWithContext = (contextOverrides = {}) => {
        const mergedContext = { ...defaultContext, ...contextOverrides }
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
