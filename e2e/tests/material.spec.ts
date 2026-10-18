import { expect, test } from '@playwright/test'
import { lessonEntry, login, logout, STUDENT, TEACHER, TOKEN_KEY } from './helpers'

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

  test('el docente no puede volver a generar el material', async ({ page }) => {
    await login(page, TEACHER.email)
    await page.getByRole('link', { name: new RegExp(STUDENT.name) }).click()

    const entry = lessonEntry(page, TOPIC)
    await expect(entry).toContainText('Material pendiente')
    await expect(entry.getByRole('link', { name: 'Generar material' })).toHaveCount(0)

    await entry.getByRole('link', { name: 'Ver clase' }).click()
    await expect(page.getByRole('region', { name: 'Material de refuerzo' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Generar material de refuerzo' })).toHaveCount(0)
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

  test('el estudiante no puede resolver el material dos veces', async ({ page }) => {
    await login(page, STUDENT.email)
    await page.getByRole('link', { name: 'Ver mis clases' }).click()
    await lessonEntry(page, TOPIC).getByRole('link', { name: 'Ver clase' }).click()

    // La interfaz muestra el resultado y no ofrece resolverlo de nuevo
    await expect(page.getByRole('region', { name: 'Resumen del resultado' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Resolver refuerzo' })).toHaveCount(0)

    // Y la API rechaza un segundo intento aunque se envíe directamente
    const lessonId = decodeURIComponent(new URL(page.url()).pathname.split('/').pop() ?? '')
    const status = await page.evaluate(
      async ({ id, key }) => {
        const response = await fetch(`/api/students/me/lessons/${encodeURIComponent(id)}/material/submission`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem(key)}` },
          // Un cuerpo bien formado: el rechazo es por el intento repetido, no por el formato
          body: JSON.stringify({ answers: [{ exercise_id: 1, selected_option: 'me levanto' }] }),
        })
        return response.status
      },
      { id: lessonId, key: TOKEN_KEY },
    )
    expect(status).toBe(409)
  })

  test('el docente ve el resultado del estudiante en la clase', async ({ page }) => {
    await login(page, TEACHER.email)
    await page.getByRole('link', { name: new RegExp(STUDENT.name) }).click()

    await expect(lessonEntry(page, TOPIC)).toContainText('Resuelto')
  })
})
