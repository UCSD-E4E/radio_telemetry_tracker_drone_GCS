import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import POIList from '../../../src/components/poi/POIList'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'
import { describe, expect, it, vi } from 'vitest'

describe('POIList component', () => {
    it('shows empty message if no POIs', () => {
        const mockContext = {
            pois: [],
            loadPOIs: vi.fn(),
            removePOI: vi.fn(),
            mapRef: { current: null }
        } as any

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <POIList />
            </GlobalAppContext.Provider>
        )

        expect(screen.getByText('No locations added yet')).toBeInTheDocument()
    })

    it('renders POI items', () => {
        const mockContext = {
            pois: [{ name: 'POI A', coords: [32.88, -117.234] }, { name: 'POI B', coords: [33.0, -118.0] }],
            loadPOIs: vi.fn(),
            removePOI: vi.fn(),
            mapRef: { current: { setView: vi.fn(), getZoom: vi.fn() } }
        } as any

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <POIList />
            </GlobalAppContext.Provider>
        )

        expect(screen.getByText('POI A')).toBeInTheDocument()
        expect(screen.getByText('POI B')).toBeInTheDocument()
    })

    it('calls removePOI when trash icon is clicked', async () => {
        const removeMock = vi.fn().mockResolvedValue(true)
        const loadMock = vi.fn()
        const mockContext = {
            pois: [{ name: 'POI X', coords: [32.88, -117.234] }],
            loadPOIs: loadMock,
            removePOI: removeMock,
            mapRef: { current: { setView: vi.fn(), getZoom: vi.fn() } }
        } as any

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <POIList />
            </GlobalAppContext.Provider>
        )

        await userEvent.click(screen.getByTitle('Remove'))
        expect(removeMock).toHaveBeenCalledWith('POI X')
    })

    it('goes to a POI if "Go to location" is clicked', async () => {
        const setViewMock = vi.fn()
        const mockContext = {
            pois: [{ name: 'POI Y', coords: [32.88, -117.234] }],
            loadPOIs: vi.fn(),
            removePOI: vi.fn(),
            mapRef: { current: { setView: setViewMock, getZoom: () => 13 } }
        } as any

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <POIList />
            </GlobalAppContext.Provider>
        )

        await userEvent.click(screen.getByTitle('Go to location'))
        expect(setViewMock).toHaveBeenCalledWith([32.88, -117.234], 13)
    })
})
