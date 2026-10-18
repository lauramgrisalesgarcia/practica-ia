import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { LessonPdf } from '@/domain/lesson'
import { PdfDownloadButton } from './PdfDownloadButton'

const PDF: LessonPdf = { filename: 'restaurante-a2.pdf', blob: new Blob(['%PDF-'], { type: 'application/pdf' }) }

function setup(downloadPdf: (lessonId: string) => Promise<LessonPdf> = vi.fn().mockResolvedValue(PDF), filename?: string) {
  const openPdf = vi.fn()
  render(<PdfDownloadButton lessonId="c3" filename={filename} downloadPdf={downloadPdf} openPdf={openPdf} />)
  return { user: userEvent.setup(), openPdf, downloadPdf }
}

describe('PdfDownloadButton', () => {
  it('descarga el PDF de la clase y lo entrega para abrirlo', async () => {
    const { user, openPdf, downloadPdf } = setup()

    await user.click(screen.getByRole('button', { name: 'PDF' }))

    expect(downloadPdf).toHaveBeenCalledWith('c3')
    expect(openPdf).toHaveBeenCalledWith(PDF)
  })

  it('incluye el nombre del archivo en el nombre accesible', () => {
    setup(undefined, 'restaurante-a2.pdf')

    expect(screen.getByRole('button', { name: 'Descargar PDF (restaurante-a2.pdf)' })).toBeInTheDocument()
  })

  it('se desactiva mientras descarga', async () => {
    const { user } = setup(vi.fn().mockReturnValue(new Promise(() => {})))

    await user.click(screen.getByRole('button', { name: 'PDF' }))

    expect(screen.getByRole('button', { name: 'Descargando…' })).toBeDisabled()
  })

  it('muestra el error si la descarga falla y permite reintentar', async () => {
    const { user, openPdf } = setup(vi.fn().mockRejectedValue(new Error('El PDF no existe')))

    await user.click(screen.getByRole('button', { name: 'PDF' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El PDF no existe')
    expect(screen.getByRole('button', { name: 'PDF' })).toBeEnabled()
    expect(openPdf).not.toHaveBeenCalled()
  })
})
