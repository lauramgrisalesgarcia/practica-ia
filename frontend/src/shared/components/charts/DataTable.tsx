// Tabla con los datos de un gráfico, solo visible para lectores de pantalla
interface DataTableProps {
  title: string
  // Cabecera de la columna de etiquetas (por defecto, «Semana»)
  labelHeader?: string
  valueHeader: string
  rows: [string, string][]
}

export function DataTable({ title, labelHeader = 'Semana', valueHeader, rows }: DataTableProps) {
  return (
    <table className="sr-only">
      <caption>{title}</caption>
      <thead>
        <tr>
          <th scope="col">{labelHeader}</th>
          <th scope="col">{valueHeader}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, value], index) => (
          <tr key={index}>
            <th scope="row">{label}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
