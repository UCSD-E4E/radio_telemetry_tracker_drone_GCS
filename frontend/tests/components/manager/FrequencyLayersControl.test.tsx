import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FrequencyLayersControl from '../../../src/components/manager/cards/FrequencyLayersControl'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'
import { describe, expect, it, vi } from 'vitest'

describe('FrequencyLayersControl component', () => {
    it('shows message if no frequencies are tracked', () => {
        const mockContext = {
            frequencyVisibility: [],
            frequencyData: {},
            deleteFrequencyLayer: vi.fn(),
            setFrequencyVisibility: vi.fn()
        } as any

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <FrequencyLayersControl />
            </GlobalAppContext.Provider>
        )

        expect(screen.getByText(/No frequencies are being tracked yet\./i)).toBeInTheDocument()
    })

    it('displays frequency entries when they exist', () => {
        const mockContext = {
            frequencyData: {
                150000: { pings: [{}], location: {} },
                200000: { pings: [], location: {} }
            },
            frequencyVisibility: [
                { frequency: 150000, visible_pings: true, visible_location_estimate: true },
                { frequency: 200000, visible_pings: false, visible_location_estimate: true }
            ],
            setFrequencyVisibility: vi.fn(),
            clearFrequencyData: vi.fn()
        }

        render(
            <GlobalAppContext.Provider value={mockContext as any}>
                <FrequencyLayersControl />
            </GlobalAppContext.Provider>
        )

        expect(screen.getByText(/0\.150\s*MHz/)).toBeInTheDocument()
        expect(screen.getByText(/0\.200\s*MHz/)).toBeInTheDocument()
    })

    it('calls deleteFrequencyLayer when trash is clicked', async () => {
        const deleteMock = vi.fn()
        const mockContext = {
            frequencyVisibility: [
                { frequency: 150000, visible_pings: true, visible_location_estimate: true }
            ],
            frequencyData: {
                150000: { pings: [], locationEstimate: null }
            },
            deleteFrequencyLayer: deleteMock,
            setFrequencyVisibility: vi.fn()
        } as any

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <FrequencyLayersControl />
            </GlobalAppContext.Provider>
        )

        await userEvent.click(screen.getByRole('button', { name: /Clear frequency data/i }))
        expect(deleteMock).toHaveBeenCalledWith(150000)
    })
})
