import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Disconnect from '../../../src/components/device/cards/Disconnect'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'

describe('Disconnect component', () => {
    it('shows "Disconnect Device" button initially', () => {
        const mockContext = { disconnect: vi.fn() } as any

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <Disconnect />
            </GlobalAppContext.Provider>
        )

        expect(screen.getByText('Disconnect Device')).toBeInTheDocument()
    })

    it('asks for confirmation before disconnecting', async () => {
        const mockDisconnect = vi.fn()
        const mockContext = { disconnect: mockDisconnect } as any

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <Disconnect />
            </GlobalAppContext.Provider>
        )

        // Click "Disconnect Device"
        await userEvent.click(screen.getByText('Disconnect Device'))
        expect(screen.getByText(/Are you sure you want to disconnect\?/i)).toBeInTheDocument()

        // Confirm
        await userEvent.click(screen.getByText('Yes, Disconnect'))
        expect(mockDisconnect).toHaveBeenCalled()
    })
})
