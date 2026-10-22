import { render } from '@testing-library/react'
import { ParrotIcon } from './ParrotIcon'

describe('ParrotIcon', () => {
  it('dibuja un loro de línea sin relleno', () => {
    const { container } = render(<ParrotIcon />)

    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute('fill', 'none')
    expect(svg).toHaveAttribute('stroke', 'currentColor')
  })

  it('es decorativo: lo nombra el texto que lo acompaña', () => {
    const { container } = render(<ParrotIcon />)

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
