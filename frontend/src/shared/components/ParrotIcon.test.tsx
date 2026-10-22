import { render } from '@testing-library/react'
import { ParrotIcon } from './ParrotIcon'

describe('ParrotIcon', () => {
  it('dibuja el loro en el color del texto (currentColor)', () => {
    const { container } = render(<ParrotIcon />)

    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('fill', 'currentColor')
    expect(container.querySelector('path')).not.toBeNull()
  })

  it('es decorativo: lo nombra el texto que lo acompaña', () => {
    const { container } = render(<ParrotIcon />)

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
