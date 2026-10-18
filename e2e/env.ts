import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

// Configuración de los E2E: variables de entorno (CI) o, en local, backend/.env.
// Los valores no se escriben en ningún archivo ni se imprimen.
const backendEnvFile = new URL('../backend/.env', import.meta.url)
const backendEnv: Record<string, string | undefined> = existsSync(backendEnvFile)
  ? parseEnv(readFileSync(backendEnvFile, 'utf8'))
  : {}

function read(name: string): string | undefined {
  return process.env[name] ?? backendEnv[name]
}

function required(name: string, hint: string): string {
  const value = read(name)
  if (!value) throw new Error(`Falta ${name} para los tests E2E: ${hint}`)
  return value
}

// Misma BD de PostgreSQL que el desarrollo, pero en su propia base de datos «practica_ia_e2e»
function e2eDatabaseUrl(): string {
  const explicit = read('E2E_DATABASE_URL')
  if (explicit) return explicit
  const base = required('DATABASE_URL', 'define E2E_DATABASE_URL o DATABASE_URL (backend/.env)')
  return base.replace(/\/[^/?]*(\?.*)?$/, '/practica_ia_e2e$1')
}

export const e2eEnv = {
  databaseUrl: e2eDatabaseUrl(),
  seedUserPassword: required('SEED_USER_PASSWORD', 'es la contraseña de los usuarios del seed (backend/.env)'),
}
