import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import MapOverlayControls from '../../../src/components/map/MapOverlayControls'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'
import { describe, expect, it, vi } from 'vitest'

describe('MapOverlayControls component', () => {
    const defaultContext = {
        currentMapSource: { id: 'osm', name: 'OpenStreetMap' },
        mapSources: [{ id: 'osm', name: 'OpenStreetMap' }],
        setCurrentMapSource: vi.fn()
    } as any

    it('shows/hides map source panel', async () => {
        render(
            <GlobalAppContext.Provider value={defaultContext}>
                <MapOverlayControls />
            </GlobalAppContext.Provider>
        )
        
        await userEvent.click(screen.getByTitle('Map Style'))
        expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
})
