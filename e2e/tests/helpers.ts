import { expect, type Page } from '@playwright/test'

// Usuarios del seed (backend/app/persistence/seed.py)
export const TEACHER = { email: 'docente@colegio.edu', name: 'María López' }
export const STUDENT = { email: 'emma@correo.com', name: 'Emma Schmidt', firstName: 'Emma' }

export async function login(page: Page, email: string) {
  const password = process.env.SEED_USER_PASSWORD
  if (!password) throw new Error('Falta SEED_USER_PASSWORD (la define playwright.config.ts)')
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)
}

// Clase del historial (línea de tiempo) por su tema
export function lessonEntry(page: Page, topic: string) {
  return page.getByRole('listitem').filter({ has: page.getByRole('heading', { level: 4, name: topic }) })
}
