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

## Arquitectura del backend (obligatorio)

El backend se divide en **tres capas**. Las dependencias solo apuntan hacia el dominio: `transport → domain ← persistence`. Un test de arquitectura (`tests/architecture/test_layers.py`) falla si se rompe esta regla.

```
app/
├── transport/http/   Transporte: routers FastAPI, schemas Pydantic, autenticación HTTP
├── domain/           Dominio: entidades, errores, puertos (interfaces) y use cases
├── persistence/      Persistencia: modelos SQLAlchemy y repositories
├── core/             Transversal: configuración, argon2, JWT
├── composition.py    Raíz de composición: crea repositories y los inyecta en los use cases
└── main.py           Crea la app y registra los routers
```

- **Dominio (`app/domain`)**: Python puro. No importa FastAPI, SQLAlchemy, Pydantic ni otras capas.
  - Entidades como `dataclass` inmutables (`entities.py`) y errores de negocio (`errors.py`).
  - Puertos en `ports.py` (`Protocol`): lo que el dominio necesita de fuera (`UserRepository`, `PasswordHasher`…).
  - Un **use case** por acción en `use_cases/`: una clase con dependencias inyectadas en el constructor y un método `execute`. Lanza errores de dominio; nunca `HTTPException`.
- **Persistencia (`app/persistence`)**: modelos SQLAlchemy (`*Model`) y un **repository** por agregado en `repositories/` que implementa el puerto del dominio y devuelve **entidades**, nunca modelos.
- **Transporte (`app/transport/http`)**: valida la entrada con Pydantic, obtiene el use case por `Depends` y llama a `execute`. Los errores de dominio se traducen a códigos HTTP en un único lugar, `error_handlers.py` (los routers no usan `try/except` para ello). No importa SQLAlchemy ni modelos.
- **Composición (`app/composition.py`)**: único lugar que conoce a la vez persistencia y dominio.
- **Tests por capa** (`tests/domain`, `tests/persistence`, `tests/transport`, `tests/core`): los use cases se prueban con fakes en memoria y sin BD; los repositories contra la BD de test; los endpoints con `TestClient`.

## Contratos (obligatorio)

- **Interfaces internas**: en el backend, los puertos del dominio son `Protocol` (`app/domain/ports.py`) y cada implementación (repositories, adaptadores y fakes de test) **hereda explícitamente** de su protocolo. En el frontend, los servicios son `interface` de TypeScript.
- **Verificación de tipos**: `mypy --strict` (backend) y `tsc` (frontend) comprueban que cada implementación cumple su contrato. Se ejecutan en local y en CI; un error de tipos bloquea el cambio. No se usa `type: ignore` salvo justificación en un comentario.
- **Contrato de la API**: `docs/openapi.yaml` es la fuente de verdad. `tests/contract/test_openapi_contract.py` verifica que cada endpoint implementado está documentado y que la petición y la respuesta de éxito coinciden con la especificación (campos, obligatorios, tipos, enums y restricciones). Si un cambio de la API es intencionado, se actualiza primero `openapi.yaml` (el test falla: red) y después el código.

## Principios SOLID (obligatorio)

Todo el código, frontend y backend, respeta SOLID. Antes de dar un cambio por terminado, revisa que lo cumpla.

- **S — Responsabilidad única**: cada módulo, clase o componente tiene un único motivo de cambio.
  - Backend: los routers solo traducen HTTP; la lógica de negocio vive en los use cases (`app/domain/use_cases/`) y el acceso a datos en los repositories.
  - Frontend: los componentes muestran y capturan datos; no llaman a la API directamente.
- **O — Abierto/cerrado**: el comportamiento nuevo se añade con nuevas implementaciones (p. ej. otro `LLMClient` o un nuevo tipo de actividad), no modificando el código existente.
- **L — Sustitución de Liskov**: cualquier implementación de una interfaz (servicio en memoria, cliente HTTP, LLM simulado o real) es intercambiable sin que el consumidor lo note.
- **I — Segregación de interfaces**: interfaces pequeñas y específicas por contexto (`AuthService`, `TeacherService`…), nunca una interfaz que lo mezcle todo.
- **D — Inversión de dependencias**: se depende de abstracciones inyectadas, no de implementaciones concretas.
  - Backend: los use cases dependen de puertos (`Protocol`), no de SQLAlchemy ni argon2; `app/composition.py` inyecta las implementaciones con `Depends`, sustituibles en tests.
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
uv run mypy
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "descripción"

# E2E
npx playwright test
```
