import { render, screen } from '@testing-library/react'
import { Brand } from './Brand'

describe('Brand', () => {
  it('muestra el nombre de la plataforma como un único elemento accesible', () => {
    render(<Brand />)

    expect(screen.getByRole('img', { name: 'PractIcA' })).toHaveTextContent('PractIcA')
  })

  it('muestra el loro junto al nombre', () => {
    const { container } = render(<Brand />)

    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('destaca la I y la A', () => {
    render(<Brand />)

    const highlighted = screen.getByRole('img', { name: 'PractIcA' }).querySelectorAll('[data-highlight]')
    expect(Array.from(highlighted, (letter) => letter.textContent)).toEqual(['I', 'A'])
  })
})
