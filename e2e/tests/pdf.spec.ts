import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { lessonEntry, login, STUDENT, TEACHER } from './helpers'

// Clase de Emma del seed con su PDF de ejemplo
const TOPIC = 'Mi casa'
const PDF_FILENAME = 'mi-casa-a2.pdf'

// Descarga el PDF con el botón indicado y comprueba que es el de la clase
async function expectPdfDownload(page: Page, button: ReturnType<Page['getByRole']>) {
  const download = page.waitForEvent('download')
  await button.click()

  const file = await download
  expect(file.suggestedFilename()).toBe(PDF_FILENAME)
  const content = await readFile(await file.path())
  expect(content.subarray(0, 5).toString()).toBe('%PDF-')
}

test('el docente descarga el PDF de una clase', async ({ page }) => {
  await login(page, TEACHER.email)
  await page.getByRole('link', { name: new RegExp(STUDENT.name) }).click()
  await lessonEntry(page, TOPIC).getByRole('link', { name: 'Ver clase' }).click()

  await expectPdfDownload(page, page.getByRole('button', { name: `Descargar PDF (${PDF_FILENAME})` }))
})

test('el estudiante descarga el PDF de su clase desde el historial', async ({ page }) => {
  await login(page, STUDENT.email)
  await page.getByRole('link', { name: 'Ver mis clases' }).click()

  await expectPdfDownload(page, lessonEntry(page, TOPIC).getByRole('button', { name: /PDF/ }))
})
