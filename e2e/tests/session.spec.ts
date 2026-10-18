import { expect, test } from '@playwright/test'
import { login, STUDENT, TEACHER, TOKEN_KEY } from './helpers'

test('con la sesión caducada vuelve al inicio de sesión y lo avisa', async ({ page }) => {
  await login(page, TEACHER.email)
  await expect(page).toHaveURL(/\/docente$/)

  // Mientras usa la app, el token deja de ser válido (como al caducar) y la siguiente petición recibe un 401
  await page.evaluate((key) => sessionStorage.setItem(key, 'token-caducado'), TOKEN_KEY)
  await page.getByRole('link', { name: new RegExp(STUDENT.name) }).click()

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('Tu sesión ha caducado. Vuelve a iniciar sesión.')).toBeVisible()
})
