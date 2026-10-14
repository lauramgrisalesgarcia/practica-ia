import { render, screen } from '@testing-library/react'
import { BarChart } from './BarChart'

// Altura de la barra principal (el primer rectángulo con color de cada grupo)
function barHeights(container: HTMLElement): number[] {
  return [...container.querySelectorAll('g')].map((group) => Number(group.querySelectorAll('rect')[1]?.getAttribute('height') ?? 0))
}

describe('BarChart', () => {
  it('escala las barras respecto al mayor de los datos', () => {
    const { container } = render(
      <BarChart title="Clases" valueHeader="Clases" data={[{ label: 'a', value: 2 }, { label: 'b', value: 4 }]} />,
    )

    const [half, full] = barHeights(container)
    expect(half * 2).toBeCloseTo(full)
  })

  it('escala las barras respecto al tope indicado', () => {
    const { container } = render(
      <BarChart title="Nota" valueHeader="Nota" maxValue={100} data={[{ label: 'a', value: 50 }, { label: 'b', value: 25 }]} />,
    )

    const [half, quarter] = barHeights(container)
    expect(quarter * 2).toBeCloseTo(half)
    // Con tope 100, la mitad de la escala es la mitad de la altura útil: no llena el gráfico
    const { container: full } = render(
      <BarChart title="Nota" valueHeader="Nota" maxValue={100} data={[{ label: 'a', value: 100 }]} />,
    )
    expect(barHeights(full)[0]).toBeCloseTo(half * 2)
  })

  it('describe los datos para lectores de pantalla', () => {
    render(<BarChart title="Nota" valueHeader="Nota" data={[{ label: '12 oct', value: 67 }]} formatValue={(v) => `${v} %`} />)

    expect(screen.getByRole('img', { name: 'Nota: 12 oct, 67 %' })).toBeInTheDocument()
  })
})
