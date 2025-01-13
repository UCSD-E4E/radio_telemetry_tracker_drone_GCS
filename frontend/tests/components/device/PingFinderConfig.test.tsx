import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PingFinderConfig from '../../../src/components/device/cards/PingFinderConfig'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'
import { describe, expect, it, vi } from 'vitest'

describe('PingFinderConfig component', () => {
    const mockSendPingFinderConfig = vi.fn()
    const mockSetPingFinderConfig = vi.fn().mockImplementation((config) => {
        defaultContext.pingFinderConfig = config
    })

    const defaultContext = {
        pingFinderConfig: {
            targetFrequencies: [],
            autoCenter: true,
            centerFrequency: 150000000,
            gain: 0,
            samplingRate: 2048000,
            pingWidthMs: 20,
            pingMinSnr: 10,
            pingMaxLenMult: 1.5,
            pingMinLenMult: 0.5,
            enableTestData: false
        },
        setPingFinderConfig: mockSetPingFinderConfig,
        sendPingFinderConfig: mockSendPingFinderConfig,
        gcsState: 'PING_FINDER_CONFIG_INPUT'
    } as any

    const renderWithContext = (contextOverrides = {}) => {
        const mergedContext = { ...defaultContext, ...contextOverrides }
        return render(
            <GlobalAppContext.Provider value={mergedContext}>
                <PingFinderConfig />
            </GlobalAppContext.Provider>
        )
    }

    it('adds new frequency', async () => {
        renderWithContext()
        const freqInput = screen.getByPlaceholderText('Enter frequency in MHz')
        await userEvent.type(freqInput, '123.45')
        await userEvent.click(screen.getByRole('button', { name: 'Add' }))
        
        // Verify the setPingFinderConfig was called with correct value
        expect(mockSetPingFinderConfig).toHaveBeenCalledWith(expect.objectContaining({
            targetFrequencies: [123450000]  // 123.45 MHz in Hz
        }))
        
        // Re-render with updated context to see the new frequency
        renderWithContext()
        expect(screen.getByText('123.450 MHz')).toBeInTheDocument()
    })
})
