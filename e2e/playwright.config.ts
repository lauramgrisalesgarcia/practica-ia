import { randomBytes } from 'node:crypto'
import { defineConfig, devices } from '@playwright/test'
import { e2eEnv } from './env'

// Puertos propios: no chocan con el back (8001) ni el front (5173) de desarrollo
const API_PORT = 8011
const WEB_PORT = 5180

// Los tests inician sesión con la contraseña del seed: la heredan del proceso, sin escribirla
process.env.SEED_USER_PASSWORD = e2eEnv.seedUserPassword

export default defineConfig({
  testDir: './tests',
  // Los flujos comparten la BD: se ejecutan en orden y de uno en uno
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Progreso en consola e informe HTML en playwright-report/ (se abre con `npx playwright show-report`)
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    // Solo se guardan evidencias de los tests que fallan (en test-results/)
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // BD limpia en cada ejecución (migraciones + seed) y después la API
      command: `uv run python ../e2e/scripts/prepare_db.py && uv run uvicorn app.main:app --port ${API_PORT}`,
      cwd: '../backend',
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        DATABASE_URL: e2eEnv.databaseUrl,
        SEED_USER_PASSWORD: e2eEnv.seedUserPassword,
        // Clave aleatoria en cada ejecución: los tokens de E2E no sirven en ningún otro entorno
        JWT_SECRET: randomBytes(32).toString('base64url'),
        STORAGE_DIR: '../e2e/.storage',
        // Los E2E nunca llaman a Gemini: una clave vacía (aunque esté en backend/.env) usa el LLM simulado
        GEMINI_API_KEY: '',
      },
    },
    {
      command: `npm run dev -- --port ${WEB_PORT} --strictPort`,
      cwd: '../frontend',
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        VITE_API_URL: '/api',
        API_PROXY_TARGET: `http://localhost:${API_PORT}`,
      },
    },
  ],
})
