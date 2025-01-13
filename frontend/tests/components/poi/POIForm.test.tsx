import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import POIForm from '../../../src/components/poi/POIForm'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'
import { describe, expect, it, vi } from 'vitest'

describe('POIForm component', () => {
    it('disables "Add" if empty input', () => {
        const mockContext = {
            addPOI: vi.fn(),
            loadPOIs: vi.fn(),
            mapRef: { current: null }
        } as any

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <POIForm />
            </GlobalAppContext.Provider>
        )

        const addBtn = screen.getByRole('button', { name: 'Add' })
        expect(addBtn).toBeDisabled()
    })

    it('calls addPOI and loadPOIs on success', async () => {
        const addMock = vi.fn().mockResolvedValue(true)
        const loadMock = vi.fn()
        const mockContext = {
            addPOI: addMock,
            loadPOIs: loadMock,
            mapRef: { current: { getCenter: () => ({ lat: 32.88, lng: -117.234 }) } }
        } as any

        render(
            <GlobalAppContext.Provider value={mockContext}>
                <POIForm />
            </GlobalAppContext.Provider>
        )

        await userEvent.type(screen.getByPlaceholderText('Enter location name...'), 'MyLocation')
        await userEvent.click(screen.getByText('Add'))

        expect(addMock).toHaveBeenCalledWith('MyLocation', [32.88, -117.234])
        expect(loadMock).toHaveBeenCalled()
    })
})
