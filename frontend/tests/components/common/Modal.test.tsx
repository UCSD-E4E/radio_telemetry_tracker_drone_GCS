import { describe, expect, it } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import Modal from '../../../src/components/common/Modal'

describe('Modal component', () => {
    it('does not render when show=false', () => {
        render(<Modal show={false} onClose={() => { }}>Hidden Content</Modal>)
        expect(screen.queryByText('Hidden Content')).not.toBeInTheDocument()
    })

    it('renders when show=true', () => {
        render(<Modal show={true} onClose={() => { }}>Visible Content</Modal>)
        expect(screen.getByText('Visible Content')).toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', async () => {
        const mockClose = vi.fn()
        render(
            <Modal show={true} onClose={mockClose} title="Modal Title">
                Modal Content
            </Modal>
        )
        const closeBtn = screen.getByRole('button')
        await userEvent.click(closeBtn)
        expect(mockClose).toHaveBeenCalled()
    })

    it('renders a title if provided', () => {
        render(<Modal show={true} onClose={() => { }} title="My Modal Title">Content</Modal>)
        expect(screen.getByText('My Modal Title')).toBeInTheDocument()
    })
})
