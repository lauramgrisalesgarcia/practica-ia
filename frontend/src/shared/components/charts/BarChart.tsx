import { DataTable } from './DataTable'

export interface BarDatum {
  label: string
  value: number
}

interface BarChartProps {
  // Describe el gráfico para lectores de pantalla y titula la tabla de datos
  title: string
  // Cabecera de la columna de etiquetas en la tabla de datos (por defecto, «Semana»)
  labelHeader?: string
  valueHeader: string
  data: BarDatum[]
  formatValue?: (value: number) => string
  // Valor del tope de la escala (por defecto, el mayor de los datos)
  maxValue?: number
}

const WIDTH = 320
const HEIGHT = 140
const BASELINE = HEIGHT - 20
const TOP = 16
const CORNER = 4

// Barras verticales de una sola serie con tabla de datos accesible
export function BarChart({ title, labelHeader, valueHeader, data, formatValue = String, maxValue }: BarChartProps) {
  const max = maxValue ?? Math.max(1, ...data.map((d) => d.value))
  const slot = WIDTH / Math.max(1, data.length)
  const barWidth = Math.min(24, slot * 0.5)
  const last = data.length - 1

  return (
    <div>
      <svg
        role="img"
        aria-label={`${title}: ${data.map((d) => `${d.label}, ${formatValue(d.value)}`).join('; ')}`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
      >
        <line x1={0} x2={WIDTH} y1={BASELINE} y2={BASELINE} className="stroke-ink/20" strokeWidth={1} />
        {data.map((d, i) => {
          const height = ((BASELINE - TOP) * d.value) / max
          const x = i * slot + (slot - barWidth) / 2
          const y = BASELINE - height
          return (
            <g key={i} className="group">
              <title>{`${d.label}: ${formatValue(d.value)}`}</title>
              {/* Área de hover mayor que la barra */}
              <rect x={i * slot} y={TOP} width={slot} height={BASELINE - TOP} fill="transparent" />
              {height > 0 && (
                <>
                  <rect x={x} y={y} width={barWidth} height={height} rx={CORNER} className="fill-ocean group-hover:fill-teal" />
                  {/* Base recta: solo el extremo superior va redondeado */}
                  <rect
                    x={x}
                    y={BASELINE - Math.min(CORNER, height)}
                    width={barWidth}
                    height={Math.min(CORNER, height)}
                    className="fill-ocean group-hover:fill-teal"
                  />
                </>
              )}
              {i === last && (
                <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" className="fill-ink text-[10px] font-semibold">
                  {formatValue(d.value)}
                </text>
              )}
              <text x={i * slot + slot / 2} y={HEIGHT - 6} textAnchor="middle" className="fill-ink/70 text-[9px]">
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
      <DataTable title={title} labelHeader={labelHeader} valueHeader={valueHeader} rows={data.map((d) => [d.label, formatValue(d.value)])} />
    </div>
  )
}
