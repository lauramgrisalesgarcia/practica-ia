// Tabla con los datos de un gráfico, solo visible para lectores de pantalla
export function DataTable({ title, valueHeader, rows }: { title: string; valueHeader: string; rows: [string, string][] }) {
  return (
    <table className="sr-only">
      <caption>{title}</caption>
      <thead>
        <tr>
          <th scope="col">Semana</th>
          <th scope="col">{valueHeader}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
