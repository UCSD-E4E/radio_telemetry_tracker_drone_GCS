import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RadioConfig from '../../../src/components/device/cards/RadioConfig'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'
import { describe, expect, it, vi } from 'vitest'

describe('RadioConfig component', () => {
    const mockSendRadioConfig = vi.fn()
    const mockLoadSerialPorts = vi.fn()
    const mockSetRadioConfig = vi.fn().mockImplementation((config) => {
        defaultContext.radioConfig = { ...config }
    })

    const defaultContext = {
        radioConfig: {
            interface_type: 'serial',
            serialPorts: ['COM1', 'COM2'],
            selectedPort: '',
            baudRate: 115200,
            host: '',
            tcpPort: 50000,
            ackTimeout: 2000,
            maxRetries: 3
        },
        setRadioConfig: mockSetRadioConfig,
        sendRadioConfig: mockSendRadioConfig,
        loadSerialPorts: mockLoadSerialPorts,
        gcsState: 'RADIO_CONFIG_INPUT'
    } as any

    const renderWithContext = (contextOverrides = {}) => {
        const mergedContext = { ...defaultContext, ...contextOverrides }
        return render(
            <GlobalAppContext.Provider value={mergedContext}>
                <RadioConfig />
            </GlobalAppContext.Provider>
        )
    }

    it('calls sendRadioConfig on Connect click', async () => {
        const { rerender } = renderWithContext()
        const portSelect = screen.getAllByRole('combobox')[0]
        await userEvent.selectOptions(portSelect, 'COM1')
        
        // Re-render with updated context after port selection
        rerender(
            <GlobalAppContext.Provider value={defaultContext}>
                <RadioConfig />
            </GlobalAppContext.Provider>
        )
        
        await userEvent.click(screen.getByRole('button', { name: 'Connect' }))
        expect(mockSendRadioConfig).toHaveBeenCalled()
    })
})
