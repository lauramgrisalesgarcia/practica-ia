import { expect, test } from '@playwright/test'
import { lessonEntry, login, logout, STUDENT, TEACHER } from './helpers'

// Clase pasada de Emma sin material en el seed
const TOPIC = 'La rutina diaria'

// El estudiante resuelve el material que genera el docente: los pasos dependen unos de otros
test.describe.serial('material de refuerzo de principio a fin', () => {
  test('el docente genera el material de una clase', async ({ page }) => {
    await login(page, TEACHER.email)
    await page.getByRole('link', { name: new RegExp(STUDENT.name) }).click()

    await lessonEntry(page, TOPIC).getByRole('link', { name: 'Generar material' }).click()
    const form = page.getByRole('form', { name: 'Generar material' })
    await form.getByRole('button', { name: 'Generar material' }).click()

    await expect(page.getByRole('heading', { name: `Refuerzo: ${TOPIC}` })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pregunta 1' })).toBeVisible()
    // Solo se genera una vez
    await expect(form).toBeHidden()
    await logout(page)
  })

  test('el estudiante lo resuelve y ve su nota y sus recomendaciones', async ({ page }) => {
    await login(page, STUDENT.email)
    await page.getByRole('link', { name: 'Ver mis clases' }).click()
    await lessonEntry(page, TOPIC).getByRole('link', { name: 'Ver clase' }).click()

    await page.getByRole('button', { name: 'Resolver refuerzo' }).click()
    const send = page.getByRole('button', { name: 'Enviar respuestas' })
    // Una opción por pregunta hasta llegar al envío
    while (!(await send.isVisible())) {
      await page.getByRole('listbox', { name: 'Opciones' }).getByRole('option').first().click()
      await page.getByRole('button', { name: 'Siguiente' }).click()
    }
    await page.getByRole('listbox', { name: 'Opciones' }).getByRole('option').first().click()
    await send.click()

    await expect(page.getByRole('region', { name: 'Tu nota' })).toContainText('%')
    await expect(page.getByRole('list', { name: 'Recomendaciones' })).toContainText(TOPIC)
    await expect(page.getByRole('button', { name: 'Resolver refuerzo' })).toBeHidden()
  })

  test('el docente ve el resultado del estudiante en la clase', async ({ page }) => {
    await login(page, TEACHER.email)
    await page.getByRole('link', { name: new RegExp(STUDENT.name) }).click()

    await expect(lessonEntry(page, TOPIC)).toContainText('Resuelto')
  })
})
