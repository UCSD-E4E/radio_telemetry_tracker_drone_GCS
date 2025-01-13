import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import Start from '../../../src/components/device/cards/Start'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'
import { GCSState } from '../../../src/context/globalAppTypes'
import { describe, expect, it, vi } from 'vitest'

describe('Start component', () => {
    it('shows "Start Ping Finder" button by default in START_INPUT', () => {
        const mockContext = {
            start: vi.fn(),
            cancelStart: vi.fn(),
            gcsState: GCSState.START_INPUT
        } as any

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <Start />
            </GlobalAppContext.Provider>
        )

        expect(screen.getByText('Start Ping Finder')).toBeInTheDocument()
    })

    it('calls start() when "Start Ping Finder" is clicked', async () => {
        const startMock = vi.fn()
        const mockContext = {
            start: startMock,
            cancelStart: vi.fn(),
            gcsState: GCSState.START_INPUT
        } as any

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <Start />
            </GlobalAppContext.Provider>
        )

        await userEvent.click(screen.getByText('Start Ping Finder'))
        expect(startMock).toHaveBeenCalled()
    })

    it('shows loading state in START_WAITING', () => {
        const mockContext = {
            start: vi.fn(),
            cancelStart: vi.fn(),
            gcsState: GCSState.START_WAITING
        } as any

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <Start />
            </GlobalAppContext.Provider>
        )

        expect(screen.getByText('Starting ping finder...')).toBeInTheDocument()
    })
})
