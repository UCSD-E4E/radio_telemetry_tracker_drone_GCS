import { describe, expect, it } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Card from '../../../src/components/common/Card'

describe('Card component', () => {
    it('renders children content', () => {
        render(
            <Card>
                <p data-testid="child-content">Hello from Card!</p>
            </Card>
        )
        expect(screen.getByTestId('child-content')).toHaveTextContent('Hello from Card!')
    })

    it('renders title if provided', () => {
        render(<Card title="Test Title">Some Content</Card>)
        expect(screen.getByText('Test Title')).toBeInTheDocument()
    })

    it('applies extra className if provided', () => {
        render(<Card className="my-card-class">Child</Card>)
        const cardElement = screen.getByText('Child').closest('div')
        expect(cardElement).toHaveClass('my-card-class')
    })
})
