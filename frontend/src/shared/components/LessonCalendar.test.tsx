import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LessonCalendar, type CalendarEntry } from './LessonCalendar'

const LESSONS: CalendarEntry[] = [
  { id: 'c1', start: '2026-10-08T16:00:00Z', label: 'Emma Schmidt · Pedir en un restaurante' },
  { id: 'c2', start: '2026-10-13T15:00:00Z', label: 'John Miller · Hablar del tiempo' },
  { id: 'c3', start: '2026-10-13T17:00:00Z', label: 'Emma Schmidt · Ir de compras' },
  { id: 'c4', start: '2026-11-03T16:00:00Z', label: 'Emma Schmidt · En el médico' },
]

function setup() {
  render(<LessonCalendar lessons={LESSONS} today={new Date('2026-10-13T09:00:00Z')} timeZone="UTC" />)
  return userEvent.setup()
}

describe('LessonCalendar', () => {
  it('muestra el mes actual empezando la semana en lunes', () => {
    setup()

    expect(screen.getByRole('heading', { name: 'octubre de 2026' })).toBeInTheDocument()
    const weekdays = screen.getAllByRole('columnheader').map((header) => header.textContent)
    expect(weekdays).toEqual(['L', 'M', 'X', 'J', 'V', 'S', 'D'])
    // El 1 de octubre de 2026 es jueves: la primera fila empieza con tres huecos
    const firstWeek = screen.getAllByRole('row')[1]
    expect(within(firstWeek).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['', '', '', '1', '2', '3', '4'])
  })

  it('marca el día de hoy', () => {
    setup()

    expect(screen.getByRole('button', { name: /^13 de octubre/ })).toHaveAttribute('aria-current', 'date')
  })

  it('indica cuántas clases hay cada día', () => {
    setup()

    expect(screen.getByRole('button', { name: '13 de octubre, 2 clases' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '8 de octubre, 1 clase' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '9 de octubre' })).toBeInTheDocument()
  })

  it('muestra por defecto las clases de hoy con su hora', () => {
    setup()

    const day = screen.getByRole('region', { name: 'Clases del 13 de octubre' })
    expect(within(day).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '15:00John Miller · Hablar del tiempo',
      '17:00Emma Schmidt · Ir de compras',
    ])
  })

  it('muestra las clases del día elegido', async () => {
    const user = setup()

    await user.click(screen.getByRole('button', { name: '8 de octubre, 1 clase' }))

    expect(screen.getByRole('button', { name: '8 de octubre, 1 clase' })).toHaveAttribute('aria-pressed', 'true')
    const day = screen.getByRole('region', { name: 'Clases del 8 de octubre' })
    expect(within(day).getByRole('listitem')).toHaveTextContent('Emma Schmidt · Pedir en un restaurante')
  })

  it('indica cuando un día no tiene clases', async () => {
    const user = setup()

    await user.click(screen.getByRole('button', { name: '9 de octubre' }))

    expect(screen.getByRole('region', { name: 'Clases del 9 de octubre' })).toHaveTextContent('No hay clases este día.')
  })

  it('permite cambiar de mes', async () => {
    const user = setup()

    await user.click(screen.getByRole('button', { name: 'Mes siguiente' }))
    expect(screen.getByRole('heading', { name: 'noviembre de 2026' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3 de noviembre, 1 clase' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mes anterior' }))
    await user.click(screen.getByRole('button', { name: 'Mes anterior' }))
    expect(screen.getByRole('heading', { name: 'septiembre de 2026' })).toBeInTheDocument()
  })
})
