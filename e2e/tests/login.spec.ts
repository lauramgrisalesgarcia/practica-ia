import { expect, test } from '@playwright/test'
import { login, logout, STUDENT, TEACHER } from './helpers'

test('el docente inicia sesión y ve su panel con sus alumnos', async ({ page }) => {
  await login(page, TEACHER.email)

  await expect(page).toHaveURL(/\/docente$/)
  await expect(page.getByRole('list', { name: 'Alumnos asignados' })).toContainText(STUDENT.name)

  await logout(page)
})

test('el estudiante inicia sesión y ve su panel', async ({ page }) => {
  await login(page, STUDENT.email)

  await expect(page).toHaveURL(/\/estudiante$/)
  await expect(page.getByRole('heading', { level: 1, name: `Hola, ${STUDENT.name}` })).toBeVisible()
})

test('una contraseña incorrecta no inicia sesión', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(TEACHER.email)
  await page.getByLabel('Contraseña').fill('no-es-la-contraseña')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
})

test('sin sesión, una página privada lleva al inicio de sesión', async ({ page }) => {
  await page.goto('/docente')

  await expect(page).toHaveURL(/\/login$/)
})
