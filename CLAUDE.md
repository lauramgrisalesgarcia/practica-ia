# CLAUDE.md

Guía para Claude Code al trabajar en este repositorio.

## Stack tecnológico

### Frontend
- **React** + **TypeScript** (modo `strict`)
- **Vite** como bundler y dev server
- **React Router 8** (modo declarativo: `BrowserRouter`, `Routes`, `Route`)
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
├── core/             Transversal: configuración, argon2, JWT, reloj
├── llm/              Adaptador del LLM (implementa el puerto LLMClient; hoy simulado: ejercicios con las palabras clave y recomendaciones en un fixture JSON)
├── composition.py    Raíz de composición: crea repositories y los inyecta en los use cases
└── main.py           Crea la app y registra los routers
```

- **Dominio (`app/domain`)**: Python puro. No importa FastAPI, SQLAlchemy, Pydantic ni otras capas.
  - Entidades como `dataclass` inmutables (`entities.py`) y errores de negocio (`errors.py`).
  - Puertos en `ports.py` (`Protocol`): lo que el dominio necesita de fuera (`UserRepository`, `PasswordHasher`…).
  - Un **use case** por acción en `use_cases/`: una clase con dependencias inyectadas en el constructor y un método `execute`. Lanza errores de dominio; nunca `HTTPException`.
- **Identificadores públicos**: la API, el dominio y los tokens identifican cada recurso con un **UUID v4 aleatorio** (`public_id`). El `id` numérico de la BD solo existe dentro de la persistencia (claves foráneas) y nunca se expone. Todo recurso nuevo debe tener `public_id` (`public_id_column()` en `models.py`).
- **Archivos**: se leen y escriben solo a través del puerto `FileStorage` (implementación `LocalFileStorage`, limitada a `backend/storage/` y protegida contra path traversal). La BD guarda la ruta; la ruta nunca se expone en la API. Las descargas usan `transport/http/files.py` (nombre de archivo saneado y `X-Content-Type-Options: nosniff`).
- **LLM (`app/llm`)**: implementa el puerto `LLMClient`. El dominio construye la petición (`MaterialGenerationRequest.to_llm_payload()`) y **valida siempre la respuesta** (`domain/material_validation.py`) antes de guardarla; una respuesta no válida o un fallo del proveedor es `InvalidLLMResponseError` (502) y no se guarda nada. Para usar un LLM real basta con otra implementación de `LLMClient` en `composition.py`.
- **Migraciones**: toda modificación del esquema es una migración de Alembic (`migrations/versions/`). Tras crearla, se regenera `migrations/001-esquema-base-de-datos.sql` (script SQL completo del esquema) con `migrations/export_schema.py`; un test falla si el archivo no está sincronizado.
- **Transacciones**: una unidad de trabajo por petición. `get_session` hace `commit` si la petición termina bien y `rollback` si falla. Los repositories solo hacen `flush`, nunca `commit`.
- **Persistencia (`app/persistence`)**: modelos SQLAlchemy (`*Model`) y un **repository** por agregado en `repositories/` que implementa el puerto del dominio y devuelve **entidades**, nunca modelos.
- **Transporte (`app/transport/http`)**: valida la entrada con Pydantic, obtiene el use case por `Depends` y llama a `execute`. Los errores de dominio se traducen a códigos HTTP en un único lugar, `error_handlers.py` (los routers no usan `try/except` para ello). No importa SQLAlchemy ni modelos.
- **Composición (`app/composition.py`)**: único lugar que conoce a la vez persistencia y dominio.
- **Tests por capa** (`tests/domain`, `tests/persistence`, `tests/transport`, `tests/core`): los use cases se prueban con fakes en memoria y sin BD; los repositories contra la BD de test; los endpoints con `TestClient`.

## Arquitectura del frontend (obligatorio)

El código vive en `frontend/src/`, organizado por **features**. Cada feature tiene sus páginas (con su test) en la raíz, las piezas de esas páginas en `components/` y sus servicios en `services/`.

```
src/
├── app/            Arranque y composición: App (solo rutas), main, composition.ts, AuthenticatedLayout,
│                   routes/RequireRole y services/ (contexto de servicios)
├── domain/         Tipos del dominio (sin dependencias de componentes ni de la API)
├── features/
│   ├── auth/       LoginPage + components/ + services/ + session/ (SessionProvider)
│   ├── teacher/    Páginas del docente + components/ + services/
│   └── student/    Páginas del estudiante + components/ + services/
├── shared/         Lo que usan varias features: components/ (Brand, PdfDownloadButton, charts/),
│                   http/ (cliente y formas de la API), i18n/, files/, routes/paths
├── dev/            Datos y simulaciones para desarrollar sin back (mocks, LLM y corrección simulados)
└── test/           Helpers de test, contracts/ (contratos compartidos) y fakes/
```

- **Dependencias**: `app/` compone todo y nada importa de `app/`. Las features no importan de otras features; lo compartido va en `shared/`. `domain/` no depende de nada del resto.
- **Imports**: el alias `@/` apunta a `src/` (configurado en `tsconfig.app.json` y `vite.config.ts`). Los imports que salen de la carpeta actual usan `@/…`; los de la misma carpeta, rutas relativas (`./components/LoginForm`).
- **Servicios**: cada servicio es una `interface` en `features/<feature>/services/` con sus implementaciones: HTTP (`http*`), en memoria (`mock*`) o con datos de ejemplo (`sample*`). Todas cumplen el mismo **test de contrato** (`src/test/contracts/`), de modo que son intercambiables.
- **Composición (`app/composition.ts`)**: único lugar que elige implementaciones. Con `VITE_API_URL` usa las HTTP; sin ella, las de `src/dev`. `App` obtiene los servicios del contexto y se los pasa a las páginas **por props**; las features nunca usan el contexto de `app/`.
- **Datos de ejemplo**: una sección sin endpoint en el back usa una implementación `sample*` que marca sus datos con `isSample: true`, y la interfaz muestra el aviso «Datos de ejemplo». Para pasar a datos reales basta con una implementación HTTP en `composition.ts`.
- **Cliente HTTP (`shared/http`)**: traduce los errores del back a `ApiError` (con el `detail` como mensaje) y los fallos de red a `NetworkError`. Las formas de la API (snake_case) se convierten al dominio (camelCase) en los servicios HTTP; los componentes no ven la API.
- **Desarrollo**: en local, Vite reenvía `/api` al backend (`localhost:8001`), así que no hace falta CORS. La plantilla `frontend/.env.example` define `VITE_API_URL=/api`.
- **Diseño**: la paleta de PractIcA son tokens de Tailwind en `src/index.css` (`ink`, `ocean`, `teal`, `mint`, `mist`); no se usan los colores por defecto de Tailwind salvo el rojo para errores. El texto pequeño sobre blanco usa `ink` u `ocean` (`teal` y `mint` no tienen contraste suficiente). El logo es el componente `Brand`.
- **Accesibilidad**: los formularios asocian sus errores a cada campo (`aria-invalid`, `aria-describedby`); el color nunca es la única pista (estados con etiqueta de texto); los gráficos son `role="img"` con descripción y una tabla de datos para lectores de pantalla.

## Contratos (obligatorio)

- **Interfaces internas**: en el backend, los puertos del dominio son `Protocol` (`app/domain/ports.py`) y cada implementación (repositories, adaptadores y fakes de test) **hereda explícitamente** de su protocolo. En el frontend, los servicios son `interface` de TypeScript y cada implementación se declara con el tipo de su interfaz (`createHttpAuthService(...): AuthService`).
- **Tests de contrato del frontend**: el comportamiento de cada servicio se describe una vez en `src/test/contracts/` y lo ejecutan todas sus implementaciones; la HTTP, contra un back falso que responde según `docs/openapi.yaml`.
- **Verificación de tipos**: `mypy --strict` (backend) y `tsc` (frontend) comprueban que cada implementación cumple su contrato. Se ejecutan en local y en CI; un error de tipos bloquea el cambio. No se usa `type: ignore` salvo justificación en un comentario.
- **Contrato de la API**: `docs/openapi.yaml` es la fuente de verdad. `tests/contract/test_openapi_contract.py` verifica que cada endpoint implementado está documentado y que la petición y la respuesta de éxito coinciden con la especificación (campos, obligatorios, tipos, enums y restricciones). Si un cambio de la API es intencionado, se actualiza primero `openapi.yaml` (el test falla: red) y después el código.

## Principios SOLID (obligatorio)

Todo el código, frontend y backend, respeta SOLID. Antes de dar un cambio por terminado, revisa que lo cumpla.

- **S — Responsabilidad única**: cada módulo, clase o componente tiene un único motivo de cambio.
  - Backend: los routers solo traducen HTTP; la lógica de negocio vive en los use cases (`app/domain/use_cases/`) y el acceso a datos en los repositories.
  - Frontend: los componentes muestran y capturan datos; no llaman a la API directamente. La lógica pura (validaciones, cálculos) va en funciones aparte con sus tests unitarios.
- **O — Abierto/cerrado**: el comportamiento nuevo se añade con nuevas implementaciones (p. ej. otro `LLMClient` o un nuevo tipo de actividad), no modificando el código existente.
- **L — Sustitución de Liskov**: cualquier implementación de una interfaz (servicio en memoria, cliente HTTP, LLM simulado o real) es intercambiable sin que el consumidor lo note.
- **I — Segregación de interfaces**: interfaces pequeñas y específicas por contexto (`AuthService`, `TeacherService`…), nunca una interfaz que lo mezcle todo.
- **D — Inversión de dependencias**: se depende de abstracciones inyectadas, no de implementaciones concretas.
  - Backend: los use cases dependen de puertos (`Protocol`), no de SQLAlchemy ni argon2; `app/composition.py` inyecta las implementaciones con `Depends`, sustituibles en tests.
  - Frontend: `app/composition.ts` crea los servicios y `App` los inyecta en las páginas por props (las features no leen el contexto de `app/`); los tipos de dominio viven en `src/domain/` y no dependen de componentes.

## Gestión de secretos (obligatorio)

**Nunca se exponen secretos**: ni en el código, ni en commits, ni en documentación, ni en logs, ni en las respuestas del chat.

- **Dónde viven**: solo en archivos `.env` locales (raíz para Docker Compose, `backend/.env` para la API) o en variables de entorno / secretos de GitHub Actions. `frontend/.env.local` solo contiene configuración pública (`VITE_API_URL`): todo lo que empieza por `VITE_` acaba en el bundle del navegador, así que nunca se usa para secretos. Los `.env` nunca se versionan; solo las plantillas `.env.example`, con marcadores vacíos y nunca con valores reales.
- **Sin valores por defecto**: los secretos (`DATABASE_URL`, `JWT_SECRET`, …) no tienen valor por defecto en el código; si faltan, la aplicación no arranca. `JWT_SECRET` exige un mínimo de 32 caracteres.
- **Tipado como secreto**: en el backend son `SecretStr`, de modo que no aparecen al imprimir la configuración ni en errores. Se leen con `.get_secret_value()` solo donde se usan.
- **Tests**: no contienen secretos escritos; la clave JWT se genera aleatoriamente en cada ejecución y la URL de la BD de test se lee de `TEST_DATABASE_URL`.
- **Documentación y ejemplos**: usan marcadores (`<token JWT>`, `<contraseña>`), nunca valores reales. Las credenciales de usuarios ficticios de prueba son la única excepción.
- **Detección automática**: Gitleaks se ejecuta antes de cada commit (`pre-commit`) y en GitHub Actions sobre todo el historial. Un hallazgo bloquea el cambio; un falso positivo se justifica en `.gitleaksignore`.
- **Si se filtra un secreto**: se considera comprometido. Se rota (se genera uno nuevo) de inmediato; borrarlo del repositorio no basta porque queda en el historial.

## Convenciones

- TypeScript sin `any` implícito; tipar props y respuestas de la API.
- Las páginas terminan en `Page` (`LessonDetailPage`) y viven en la raíz de su feature con su test.
- Textos de la interfaz en español; fechas y números con `Intl` en `es` (`shared/i18n`).
- Python con type hints y modelos Pydantic para request/response.
- Los tests viven junto al código (`*.test.ts(x)`) en frontend y en `tests/` en backend; E2E en `e2e/`.
- La BD de tests es independiente de la de desarrollo.

## Comandos

```bash
# Configuración inicial (una vez): copiar plantillas y rellenar secretos
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local   # VITE_API_URL=/api: el front usa el back real
uvx --python 3.13 pre-commit install   # hook de detección de secretos

# Base de datos (desde la raíz)
docker compose up -d
docker compose run --rm migrate   # aplica las migraciones
docker compose run --rm seed      # migra y carga los datos de prueba

# Frontend (desde frontend/)
npm run dev         # con VITE_API_URL vacía (o sin .env.local) usa los datos en memoria de src/dev
npm test            # Vitest en modo watch
npm run test:run    # Vitest una vez
npm run coverage
npm run lint
npm run build       # incluye tsc -b

# Backend (desde backend/)
uv run uvicorn app.main:app --reload --port 8001
uv run pytest
uv run mypy
uv run alembic upgrade head
uv run python -m app.persistence.seed   # datos de prueba (contraseña: SEED_USER_PASSWORD en backend/.env)
uv run alembic revision --autogenerate -m "descripción"
uv run python -m migrations.export_schema   # regenera migrations/001-esquema-base-de-datos.sql tras cada migración

# E2E
npx playwright test
```
