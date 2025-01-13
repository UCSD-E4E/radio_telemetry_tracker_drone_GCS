import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import SimulatorPopup from '../../../src/components/device/cards/SimulatorPopup'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'
import { describe, expect, it, vi } from 'vitest'

describe('SimulatorPopup component', () => {
    it('does not render if isOpen=false', () => {
        const mockContext = {
            radioConfig: {},
            setRadioConfig: vi.fn(),
            isSimulatorRunning: false,
            initSimulator: vi.fn(),
            cleanupSimulator: vi.fn()
        } as any

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <SimulatorPopup isOpen={false} onClose={() => { }} />
            </GlobalAppContext.Provider>
        )

        expect(screen.queryByText('Simulator Control Panel')).not.toBeInTheDocument()
    })

    it('renders if isOpen=true', () => {
        const mockContext = {
            radioConfig: {},
            setRadioConfig: vi.fn(),
            isSimulatorRunning: false,
            initSimulator: vi.fn(),
            cleanupSimulator: vi.fn()
        } as any

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <SimulatorPopup isOpen={true} onClose={() => { }} />
            </GlobalAppContext.Provider>
        )

        expect(screen.getByText('Simulator Control Panel')).toBeInTheDocument()
    })

    it('calls onClose when backdrop is clicked', async () => {
        const onCloseMock = vi.fn()
        const mockContext = {
            radioConfig: {},
            setRadioConfig: vi.fn(),
            isSimulatorRunning: false,
            initSimulator: vi.fn(),
            cleanupSimulator: vi.fn()
        } as any

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <SimulatorPopup isOpen={true} onClose={onCloseMock} />
            </GlobalAppContext.Provider>
        )
        const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50')
        if (backdrop) {
            await userEvent.click(backdrop)
            expect(onCloseMock).toHaveBeenCalled()
        }
    })
})
