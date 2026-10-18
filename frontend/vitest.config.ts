import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Tests unitarios y de componentes (Vitest). Reutiliza la configuración de Vite (alias @/, plugins).
// Los E2E (Playwright) viven en ../e2e y se ejecutan aparte con `npm run test:e2e`.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      exclude: [...configDefaults.exclude, 'e2e/**', '../e2e/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/app/main.tsx', 'src/test/**', 'src/**/*.test.{ts,tsx}'],
      },
    },
  }),
)
