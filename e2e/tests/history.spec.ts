import { expect, test, type Page } from '@playwright/test'
import { login, STUDENT, TEACHER } from './helpers'

const SEARCH = 'Buscar por tema'

// Temas visibles en la línea de tiempo del historial
function topics(page: Page) {
  return page.getByRole('region', { name: 'Historial de clases' }).getByRole('heading', { level: 4 })
}

test.beforeEach(async ({ page }) => {
  await login(page, TEACHER.email)
  await page.getByRole('link', { name: new RegExp(STUDENT.name) }).click()
  await expect(topics(page).first()).toBeVisible()
})

test('el docente busca una clase del historial por su tema', async ({ page }) => {
  await page.getByRole('searchbox', { name: SEARCH }).fill('casa')

  await expect(topics(page)).toHaveText(['Mi casa'])
})

test('el docente filtra el historial por estado del material', async ({ page }) => {
  const all = await topics(page).count()

  await page.getByRole('button', { name: /^Sin material/ }).click()
  const withoutMaterial = await topics(page).count()
  expect(withoutMaterial).toBeGreaterThan(0)
  expect(withoutMaterial).toBeLessThanOrEqual(all)
  await expect(page.getByRole('button', { name: /^Sin material/ })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: /^Todas/ }).click()
  await expect(topics(page)).toHaveCount(all)
})

test('el historial avisa si ninguna clase coincide con los filtros', async ({ page }) => {
  await page.getByRole('searchbox', { name: SEARCH }).fill('tema que no existe')

  await expect(topics(page)).toHaveCount(0)
  await expect(page.getByText('Ninguna clase coincide con los filtros.')).toBeVisible()
})
