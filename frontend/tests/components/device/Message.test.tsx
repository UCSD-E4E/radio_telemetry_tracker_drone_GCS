import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Message from '../../../src/components/device/cards/Message'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'

describe('Message component', () => {
    it('shows an error message', () => {
        const mockContext = { setMessageVisible: vi.fn() } as any
        render(
            <GlobalAppContext.Provider value={mockContext}>
                <Message message="Something went wrong" type="error" />
            </GlobalAppContext.Provider>
        )
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
        expect(screen.getByText('Something went wrong')).toHaveClass('text-red-700')
    })

    it('shows a success message', () => {
        const mockContext = { setMessageVisible: vi.fn() } as any
        render(
            <GlobalAppContext.Provider value={mockContext}>
                <Message message="Operation successful" type="success" />
            </GlobalAppContext.Provider>
        )
        expect(screen.getByText('Operation successful')).toHaveClass('text-green-700')
    })

    it('calls setMessageVisible(false) when close button is clicked', async () => {
        const mockSetVisible = vi.fn()
        const mockContext = { setMessageVisible: mockSetVisible } as any

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <Message message="Click close" type="error" />
            </GlobalAppContext.Provider>
        )

        await userEvent.click(screen.getByRole('button'))
        expect(mockSetVisible).toHaveBeenCalledWith(false)
    })
})
