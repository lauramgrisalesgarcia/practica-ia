# CLAUDE.md

Guía para Claude Code al trabajar en este repositorio.

## Stack tecnológico

### Frontend
- **React** + **TypeScript** (modo `strict`)
- **Vite** como bundler y dev server
- **Tailwind CSS v4** (configuración CSS-first con `@import "tailwindcss";` y `@theme`, sin `tailwind.config.js`; plugin `@tailwindcss/vite`)
- **Vitest** + **React Testing Library** para tests unitarios y de componentes

### Backend
- **Python 3.13** con **FastAPI**, gestionado con **uv**
- **PostgreSQL 16** (Docker Compose, puerto 5433) con **SQLAlchemy 2** y migraciones con **Alembic**
- **pytest** + `TestClient` para tests del backend

### End-to-end
- **Playwright** para tests E2E que cubren flujos completos frontend ↔ backend

## Metodología: TDD obligatorio

Todo el desarrollo sigue **Test-Driven Development**. Sin excepciones.

1. **Red** — Escribe primero un test que falle y descríbelo. Ejecútalo y confirma que falla por la razón esperada.
2. **Green** — Escribe el código mínimo necesario para que el test pase.
3. **Refactor** — Mejora el código manteniendo todos los tests en verde.

Reglas:
- No se escribe código de producción sin un test que lo justifique.
- Cada bug se corrige primero reproduciéndolo con un test que falle.
- Ejecuta la suite relevante después de cada paso y reporta el resultado real (no asumas que pasa).
- Tests pequeños, deterministas e independientes entre sí; nombres descriptivos del comportamiento.
- Nivel adecuado: lógica → unit; componentes → React Testing Library; endpoints → pytest con BD de test; flujos de usuario → Playwright.

## Principios SOLID (obligatorio)

Todo el código, frontend y backend, respeta SOLID. Antes de dar un cambio por terminado, revisa que lo cumpla.

- **S — Responsabilidad única**: cada módulo, clase o componente tiene un único motivo de cambio.
  - Backend: los routers solo traducen HTTP (validar entrada, llamar al servicio, mapear errores a códigos HTTP). La lógica de negocio vive en `app/services/` y se prueba sin HTTP.
  - Frontend: los componentes muestran y capturan datos; no llaman a la API directamente.
- **O — Abierto/cerrado**: el comportamiento nuevo se añade con nuevas implementaciones (p. ej. otro `LLMClient` o un nuevo tipo de actividad), no modificando el código existente.
- **L — Sustitución de Liskov**: cualquier implementación de una interfaz (servicio en memoria, cliente HTTP, LLM simulado o real) es intercambiable sin que el consumidor lo note.
- **I — Segregación de interfaces**: interfaces pequeñas y específicas por contexto (`AuthService`, `TeacherService`…), nunca una interfaz que lo mezcle todo.
- **D — Inversión de dependencias**: se depende de abstracciones inyectadas, no de implementaciones concretas.
  - Backend: dependencias por `Depends` (sesión de BD, usuario actual, `LLMClient`), sustituibles en tests.
  - Frontend: los servicios se inyectan por props/contexto; los tipos de dominio viven en `src/domain/` y no dependen de componentes.

## Gestión de secretos (obligatorio)

**Nunca se exponen secretos**: ni en el código, ni en commits, ni en documentación, ni en logs, ni en las respuestas del chat.

- **Dónde viven**: solo en archivos `.env` locales (raíz para Docker Compose, `backend/.env` para la API) o en variables de entorno / secretos de GitHub Actions. Los `.env` nunca se versionan; solo las plantillas `.env.example`, con marcadores vacíos y nunca con valores reales.
- **Sin valores por defecto**: los secretos (`DATABASE_URL`, `JWT_SECRET`, …) no tienen valor por defecto en el código; si faltan, la aplicación no arranca. `JWT_SECRET` exige un mínimo de 32 caracteres.
- **Tipado como secreto**: en el backend son `SecretStr`, de modo que no aparecen al imprimir la configuración ni en errores. Se leen con `.get_secret_value()` solo donde se usan.
- **Tests**: no contienen secretos escritos; la clave JWT se genera aleatoriamente en cada ejecución y la URL de la BD de test se lee de `TEST_DATABASE_URL`.
- **Documentación y ejemplos**: usan marcadores (`<token JWT>`, `<contraseña>`), nunca valores reales. Las credenciales de usuarios ficticios de prueba son la única excepción.
- **Detección automática**: Gitleaks se ejecuta antes de cada commit (`pre-commit`) y en GitHub Actions sobre todo el historial. Un hallazgo bloquea el cambio; un falso positivo se justifica en `.gitleaksignore`.
- **Si se filtra un secreto**: se considera comprometido. Se rota (se genera uno nuevo) de inmediato; borrarlo del repositorio no basta porque queda en el historial.

## Convenciones

- TypeScript sin `any` implícito; tipar props y respuestas de la API.
- Python con type hints y modelos Pydantic para request/response.
- Los tests viven junto al código (`*.test.ts(x)`) en frontend y en `tests/` en backend; E2E en `e2e/`.
- La BD de tests es independiente de la de desarrollo.

## Comandos

```bash
# Configuración inicial (una vez): copiar plantillas y rellenar secretos
cp .env.example .env
cp backend/.env.example backend/.env
uvx --python 3.13 pre-commit install   # hook de detección de secretos

# Base de datos (desde la raíz)
docker compose up -d

# Frontend (desde frontend/)
npm run dev
npm test            # Vitest en modo watch
npm run coverage
npm run lint
npm run build

# Backend (desde backend/)
uv run uvicorn app.main:app --reload --port 8001
uv run pytest
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "descripción"

# E2E
npx playwright test
```
