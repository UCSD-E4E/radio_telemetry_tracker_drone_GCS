import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import Stop from '../../../src/components/device/cards/Stop'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'
import { GCSState } from '../../../src/context/globalAppTypes'
import { describe, expect, it, vi } from 'vitest'

describe('Stop component', () => {
    it('shows "Stop Ping Finder" button by default in STOP_INPUT', () => {
        render(
            <GlobalAppContext.Provider value={{ gcsState: GCSState.STOP_INPUT } as any}>
                <Stop />
            </GlobalAppContext.Provider>
        )
        expect(screen.getByRole('button', { name: 'Stop Ping Finder' })).toBeInTheDocument()
    })

    it('calls stop() when "Stop Ping Finder" is clicked', async () => {
        const stopMock = vi.fn()
        render(
            <GlobalAppContext.Provider value={{ 
                stop: stopMock, 
                gcsState: GCSState.STOP_INPUT 
            } as any}>
                <Stop />
            </GlobalAppContext.Provider>
        )
        await userEvent.click(screen.getByRole('button', { name: 'Stop Ping Finder' }))
        expect(stopMock).toHaveBeenCalled()
    })

    it('shows loading state in STOP_WAITING', () => {
        render(
            <GlobalAppContext.Provider value={{ gcsState: GCSState.STOP_WAITING } as any}>
                <Stop />
            </GlobalAppContext.Provider>
        )
        expect(screen.getByText('Stopping ping finder...')).toBeInTheDocument()
    })
})
