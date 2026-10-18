import { render, screen } from '@testing-library/react'
import { BlankSentence } from './BlankSentence'

describe('BlankSentence', () => {
  it('muestra la frase con el hueco resaltado', () => {
    render(
      <p data-testid="frase">
        <BlankSentence text="Hola, ___ Emma." />
      </p>,
    )

    expect(screen.getByTestId('frase')).toHaveTextContent('Hola, ___ Emma.')
    expect(screen.getByText('___')).toHaveClass('text-ocean')
  })
})
