import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DroneStatus from '../../../src/components/device/cards/DroneStatus'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'

describe('DroneStatus component', () => {
    it('renders "Drone Status" title', () => {
        const mockContext = {
            connectionStatus: 1,
            gpsData: null,
            mapRef: { current: null },
        } as any

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <DroneStatus />
            </GlobalAppContext.Provider>
        )

        expect(screen.getByText('Drone Status')).toBeInTheDocument()
    })

    it('disables the "Locate" button if no gpsData', () => {
        const mockContext = {
            connectionStatus: 1,
            gpsData: null,
            mapRef: { current: null },
        } as any

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <DroneStatus />
            </GlobalAppContext.Provider>
        )

        const locateButton = screen.getByText('Locate')
        expect(locateButton).toBeDisabled()
    })

    it('calls map.setView when "Locate" is clicked', async () => {
        const setViewMock = vi.fn()
        const mockContext = {
            connectionStatus: 1,
            gpsData: { lat: 32.88, long: -117.234 },
            mapRef: {
                current: {
                    getZoom: vi.fn().mockReturnValue(13),
                    setView: setViewMock,
                }
            },
        } as any

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <DroneStatus />
            </GlobalAppContext.Provider>
        )

        await userEvent.click(screen.getByText('Locate'))
        expect(setViewMock).toHaveBeenCalledWith([32.88, -117.234], 13)
    })
})
