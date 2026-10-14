import { useState } from 'react'
// Clase en el calendario: el texto (p. ej. «Emma Schmidt · Presentarse») lo decide quien lo usa
export interface CalendarEntry {
  id: string
  // Fecha y hora de inicio (ISO 8601)
  start: string
  label: string
}

interface LessonCalendarProps {
  lessons: CalendarEntry[]
  today: Date
  // Zona horaria en la que se agrupan y muestran las clases (por defecto, la del navegador)
  timeZone?: string
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MAX_DOTS = 3

// Las fechas del calendario son días sin hora: se calculan y formatean en UTC
const monthTitleFormat = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const dayFormat = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', timeZone: 'UTC' })

// Fecha (AAAA-MM-DD) de un instante en la zona horaria indicada
function dayKey(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(date)
}

function utcDay(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day))
}

// Semanas del mes (lunes a domingo); null en los huecos fuera del mes
function monthWeeks(year: number, month: number): (number | null)[][] {
  const offset = (utcDay(year, month, 1).getUTCDay() + 6) % 7
  const daysInMonth = utcDay(year, month + 1, 0).getUTCDate()
  const cells: (number | null)[] = [...Array<null>(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7))
}

export function LessonCalendar({ lessons, today, timeZone }: LessonCalendarProps) {
  const todayKey = dayKey(today, timeZone)
  const [todayYear, todayMonth] = todayKey.split('-').map(Number)
  const [visible, setVisible] = useState({ year: todayYear, month: todayMonth - 1 })
  const [selectedKey, setSelectedKey] = useState(todayKey)

  const timeFormat = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', timeZone })
  const lessonsByDay = new Map<string, CalendarEntry[]>()
  for (const lesson of lessons) {
    const key = dayKey(new Date(lesson.start), timeZone)
    lessonsByDay.set(key, [...(lessonsByDay.get(key) ?? []), lesson])
  }

  const keyOf = (day: number) =>
    `${visible.year}-${String(visible.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const [selYear, selMonth, selDay] = selectedKey.split('-').map(Number)
  const selectedLabel = dayFormat.format(utcDay(selYear, selMonth - 1, selDay))
  const selectedLessons = lessonsByDay.get(selectedKey) ?? []

  function moveMonth(delta: number) {
    const date = utcDay(visible.year, visible.month + delta, 1)
    setVisible({ year: date.getUTCFullYear(), month: date.getUTCMonth() })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Mes anterior" onClick={() => moveMonth(-1)} className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-ocean hover:bg-mist">
          ‹
        </button>
        <h4 className="font-semibold text-ink first-letter:uppercase">{monthTitleFormat.format(utcDay(visible.year, visible.month, 1))}</h4>
        <button type="button" aria-label="Mes siguiente" onClick={() => moveMonth(1)} className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-ocean hover:bg-mist">
          ›
        </button>
      </div>

      <table className="w-full table-fixed text-center text-sm">
        <thead>
          <tr>
            {WEEKDAYS.map((weekday) => (
              <th key={weekday} scope="col" className="pb-1 text-xs font-medium text-ink/70">
                {weekday}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthWeeks(visible.year, visible.month).map((week, index) => (
            <tr key={index}>
              {week.map((day, column) => {
                if (day === null) return <td key={`empty-${column}`} />
                const key = keyOf(day)
                const count = lessonsByDay.get(key)?.length ?? 0
                const isToday = key === todayKey
                const isSelected = key === selectedKey
                const label = `${dayFormat.format(utcDay(visible.year, visible.month, day))}${
                  count ? `, ${count} ${count === 1 ? 'clase' : 'clases'}` : ''
                }`
                return (
                  <td key={key} className="p-0.5">
                    <button
                      type="button"
                      aria-label={label}
                      aria-current={isToday ? 'date' : undefined}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedKey(key)}
                      className={`flex h-10 w-full flex-col items-center justify-center gap-0.5 rounded-lg ${
                        isSelected ? 'bg-ocean text-white' : 'hover:bg-mist'
                      } ${isToday && !isSelected ? 'font-semibold text-ocean ring-2 ring-teal' : ''}`}
                    >
                      {day}
                      <span aria-hidden="true" className="flex h-1.5 gap-0.5">
                        {Array.from({ length: Math.min(count, MAX_DOTS) }, (_, dot) => (
                          <span key={dot} className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-mint' : 'bg-teal'}`} />
                        ))}
                      </span>
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <section aria-label={`Clases del ${selectedLabel}`} className="flex flex-col gap-2 border-t border-mist pt-3">
        <p className="text-sm font-semibold text-ink">Clases del {selectedLabel}</p>
        {selectedLessons.length === 0 ? (
          <p className="text-sm text-ink/70">No hay clases este día.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {selectedLessons.map((lesson) => (
              <li key={lesson.id} className="flex items-center gap-3 rounded-lg bg-mist px-3 py-2 text-sm">
                <time dateTime={lesson.start} className="font-semibold text-ocean">
                  {timeFormat.format(new Date(lesson.start))}
                </time>
                <span className="text-ink">{lesson.label}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
