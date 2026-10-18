# Práctica IA

Plataforma de refuerzo para **extranjeros que aprenden español**. El docente genera, a partir de cada clase, una actividad de refuerzo con un LLM (simulado en este proyecto); el estudiante la resuelve **una única vez** y recibe su corrección con recomendaciones personalizadas.

## Cómo funciona

```
Docente                                         Estudiante
───────                                         ──────────
1. Inicia sesión: panel con sus estudiantes,
   indicadores, actividad reciente y calendario
2. Entra a un estudiante → línea de tiempo de
   sus clases (filtros, búsqueda, notas)
3. Abre una clase (tema, contexto, palabras
   clave, notas, PDF)
4. Revisa las palabras clave y genera el
   material una única vez: actividad de
   completar frases (1–15 ejercicios)     ──────►  5. Panel con refuerzos pendientes, evolución
                                                   de su nota y actividad reciente
                                                6. Ve sus clases y el PDF de cada una
                                                7. Resuelve el material pregunta a pregunta
                                                   (sin ver las respuestas), una única vez
8. Ve el resultado del estudiante        ◄──────  → corrección, nota y recomendaciones
```

- **Generación de material**: el backend envía al LLM el nivel MCER y el idioma natal del estudiante, el tema, el contexto, las palabras clave, las notas y el PDF de la clase. La respuesta se **valida** (cantidad de ejercicios, un hueco `___` por frase, 2–4 opciones distintas, respuesta correcta entre las opciones y coherente con las palabras clave) antes de guardarse; si no es válida, no se guarda nada.
- **Corrección**: siempre en el backend. Las respuestas correctas nunca se envían al estudiante antes de resolver.
- **LLM simulado**: los ejercicios se construyen con las palabras clave de la clase y frases de ejemplo para practicarlas (`backend/app/llm/fixtures/example_sentences.json`), y las recomendaciones, con el tema y los ejercicios fallados. Todo va detrás de la interfaz `LLMClient`: un LLM real se conecta sin tocar el dominio.

## Stack

| Parte | Tecnologías |
|---|---|
| Frontend | React · TypeScript · Vite · React Router · Tailwind CSS v4 · Vitest + React Testing Library |
| Backend | Python 3.13 · FastAPI · SQLAlchemy 2 · Alembic · Pydantic · uv |
| Base de datos | PostgreSQL 16 (Docker Compose) |
| Seguridad | JWT (60 min) · argon2 · identificadores públicos UUID · Gitleaks |
| Calidad | TDD · mypy estricto · test de contrato OpenAPI · test de arquitectura · GitHub Actions |
| E2E | Playwright |

## Estructura

```
practica-ia/
├── backend/
│   ├── app/
│   │   ├── transport/http/   Capa de transporte: routers FastAPI, schemas, errores HTTP
│   │   ├── domain/           Capa de dominio: entidades, puertos y use cases (Python puro)
│   │   ├── persistence/      Capa de persistencia: modelos SQLAlchemy y repositories
│   │   ├── llm/              Adaptador del LLM (simulado)
│   │   ├── core/             Configuración, argon2, JWT, reloj
│   │   └── composition.py    Inyección de dependencias
│   ├── migrations/           Migraciones de Alembic y esquema SQL generado
│   ├── Dockerfile            Imagen para migrar y cargar datos con Docker
│   └── tests/                Por capa + contrato, arquitectura y migraciones
├── frontend/src/
│   ├── app/                  Rutas, composición de servicios y layout
│   ├── domain/               Tipos del dominio
│   ├── features/             auth, teacher y student: páginas, componentes y servicios
│   ├── shared/               Componentes, cliente HTTP, i18n y utilidades compartidas
│   ├── dev/                  Datos y simulaciones para desarrollar sin backend
│   └── test/                 Helpers y tests de contrato de los servicios
├── e2e/                      Tests E2E con Playwright (flujos completos front ↔ back)
├── .github/workflows/        CI: backend, frontend, E2E y detección de secretos
├── docs/
│   ├── 001-backend-requirements.md   Requerimientos del backend
│   ├── 002-frontend-requirements.md  Requerimientos del frontend
│   └── openapi.yaml                  Contrato de la API (fuente de verdad)
├── infra/postgres/           Inicialización de PostgreSQL
├── docker-compose.yml        PostgreSQL y utilidades migrate / seed
└── CLAUDE.md                 Normas de desarrollo del proyecto
```

El backend sigue una arquitectura en **tres capas** (`transport → domain ← persistence`): el dominio no depende de ningún framework y un test falla si una capa importa en la dirección prohibida. El frontend se organiza por **features** que no se importan entre sí; cada servicio es una interfaz con una implementación HTTP y otra en memoria que cumplen el mismo test de contrato.

## Puesta en marcha

### Requisitos

- [Docker](https://www.docker.com/) (PostgreSQL)
- [uv](https://docs.astral.sh/uv/) (descarga Python 3.13 automáticamente)
- [Node.js](https://nodejs.org/) 24

### 1. Configuración y secretos

Los secretos **nunca se versionan**: viven en archivos `.env` locales creados a partir de las plantillas.

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

- `.env` (raíz): credenciales de PostgreSQL para Docker Compose.
- `backend/.env`: `DATABASE_URL` y `TEST_DATABASE_URL` (con la misma contraseña), `JWT_SECRET` (mínimo 32 caracteres) y `SEED_USER_PASSWORD` (contraseña de los usuarios de prueba, también la usan los tests E2E).
- `frontend/.env.local`: solo `VITE_API_URL=/api` (configuración pública, nunca secretos: todo lo que empieza por `VITE_` llega al navegador).

Para generar valores aleatorios:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2. Base de datos

Levanta PostgreSQL:

```bash
docker compose up -d
```

PostgreSQL queda en `127.0.0.1:5433` con las bases `practica_ia` (desarrollo) y `practica_ia_test` (tests). Los tests E2E crean y gestionan la suya, `practica_ia_e2e`.

Aplica todas las migraciones:

```bash
docker compose run --rm migrate
```

Carga los datos de prueba (aplica antes las migraciones si faltan):

```bash
docker compose run --rm seed
```

- El seed crea 2 docentes (`docente@colegio.edu`, `carlos.ruiz@colegio.edu`) y 4 estudiantes (`emma@correo.com`, `john@correo.com`, `pierre@correo.com`, `yuki@correo.com`) con 6–7 clases pasadas y alguna futura cada uno, y un PDF de ejemplo por clase (en `backend/storage/`). La contraseña de todos es `SEED_USER_PASSWORD` de `backend/.env`.
- Ambos comandos son idempotentes: `migrate` no hace nada si la base está al día, y `seed` solo añade lo que falta (por ejemplo, clases nuevas del seed), sin duplicar ni tocar los materiales y entregas existentes.
- `migrate` y `seed` usan la imagen de `backend/Dockerfile` (la primera vez se construye sola) y leen los secretos de `.env` y `backend/.env`; nunca se guardan en la imagen. Para reconstruirla tras cambiar el backend: `docker compose --profile tools build`.

### 3. Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8001
```

- API en <http://localhost:8001> y documentación interactiva (Swagger) en <http://localhost:8001/docs>.
- Sin Docker, las migraciones y el seed también se ejecutan en local: `uv run alembic upgrade head` y `uv run python -m app.persistence.seed`.

### 4. Frontend

```bash
cd frontend
npm ci
npm run dev
```

- Aplicación en <http://localhost:5173>. Vite reenvía `/api` al backend (`localhost:8001`), así que no hace falta CORS.
- Sin `frontend/.env.local` (o con `VITE_API_URL` vacía) el front funciona **sin backend**, con datos en memoria de `src/dev`. Usuarios ficticios de ese modo: `docente@colegio.edu` / `Docente#2026` y `estudiante@colegio.edu` / `Estudiante#2026`.

### 5. Hook de detección de secretos (recomendado)

```bash
uvx --python 3.13 pre-commit install
```

Ejecuta Gitleaks antes de cada commit y bloquea cualquier secreto.

## API

El contrato completo está en [`docs/openapi.yaml`](docs/openapi.yaml). Todos los endpoints protegidos usan `Authorization: Bearer <token>`.

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/health` | — | Estado del servicio |
| POST | `/auth/login` | — | Inicio de sesión |
| GET | `/auth/me` | Autenticado | Usuario actual |
| GET | `/teachers/me/students` | Docente | Sus estudiantes |
| GET | `/teachers/me/students/{student_id}` | Docente | Detalle de un estudiante |
| GET | `/teachers/me/students/{student_id}/lessons` | Docente | Historial de clases del estudiante |
| GET | `/teachers/me/lessons/{lesson_id}` | Docente | Detalle de una clase con material y resultado |
| GET | `/teachers/me/lessons/{lesson_id}/pdf` | Docente | PDF de la clase |
| GET | `/teachers/me/insights` | Docente | Indicadores de su panel |
| POST | `/teachers/me/lessons/{lesson_id}/material` | Docente | Genera el material de refuerzo |
| GET | `/students/me/insights` | Estudiante | Indicadores de su panel |
| GET | `/students/me/lessons` | Estudiante | Su historial de clases |
| GET | `/students/me/lessons/{lesson_id}` | Estudiante | Detalle de su clase (sin las notas del docente) |
| GET | `/students/me/lessons/{lesson_id}/pdf` | Estudiante | PDF de su clase |
| GET | `/students/me/lessons/{lesson_id}/material` | Estudiante | Material sin respuestas (y su resultado si ya lo resolvió) |
| POST | `/students/me/lessons/{lesson_id}/material/submission` | Estudiante | Resuelve el material (una única vez) |
| GET | `/students/me/lessons/{lesson_id}/material/submission` | Estudiante | Su resultado y recomendaciones |

## Base de datos

- Esquema completo como SQL: [`backend/migrations/001-esquema-base-de-datos.sql`](backend/migrations/001-esquema-base-de-datos.sql), generado desde las migraciones de Alembic y verificado por un test.
- Tras crear una migración, regenera el esquema (desde `backend/`):

```bash
uv run alembic revision --autogenerate -m "descripción"
uv run python -m migrations.export_schema
```

## Tests y calidad

```bash
# Backend (desde backend/; requiere PostgreSQL en marcha)
uv run pytest
uv run mypy

# Frontend (desde frontend/)
npm test
npm run lint
npm run build

# E2E (desde e2e/; requiere PostgreSQL en marcha)
npm install
npx playwright install chromium   # solo la primera vez
npm run test:e2e                  # también desde frontend/ con el mismo script
npm run report                    # abre el informe HTML
```

El backend se prueba por capas: use cases con fakes en memoria (sin BD), repositories contra la BD de test, endpoints con `TestClient`. Además:

- **Test de contrato**: la API implementada coincide con `docs/openapi.yaml`, en los dos sentidos.
- **Test de arquitectura**: cada capa solo depende en la dirección permitida.
- **Test de migraciones**: el esquema SQL está sincronizado con Alembic.

El frontend se prueba con React Testing Library y **tests de contrato** (`src/test/contracts/`): cada servicio cumple el mismo comportamiento en su versión HTTP (contra un back falso según `docs/openapi.yaml`) y en memoria.

Los **tests E2E** (`e2e/`) arrancan su propia API (puerto 8011) y su propio front (5180) sobre `practica_ia_e2e`, que se vacía, migra y llena con el seed en cada ejecución. Cubren el inicio de sesión por rol y la sesión caducada, la descarga del PDF, la búsqueda y los filtros del historial, y el material de refuerzo de principio a fin: el docente lo genera (una sola vez), el estudiante lo resuelve (una sola vez, también comprobado contra la API) y el docente ve el resultado. Generan siempre un informe HTML (`e2e/playwright-report/`) y guardan capturas solo de los tests que fallan (`e2e/test-results/`). Los tests unitarios (Vitest, configurados en `frontend/vitest.config.ts`) excluyen `e2e/`.

### Integración continua

| Workflow | Qué ejecuta |
|---|---|
| Backend CI | mypy, pytest (con PostgreSQL de servicio) y `alembic check` |
| Frontend CI | lint, tests con cobertura y build |
| E2E | Playwright con PostgreSQL de servicio y contraseña del seed aleatoria; si falla, publica el informe HTML y las capturas |
| Detección de secretos | Gitleaks sobre todo el historial |

## Forma de trabajo

- **TDD obligatorio**: test que falla → código mínimo → refactor.
- **SOLID** y arquitectura en tres capas con use cases y repositories.
- **Contrato primero**: los cambios de la API empiezan en `docs/openapi.yaml`.
- **Secretos**: nunca en el código, la documentación ni los commits.

Las normas completas están en [`CLAUDE.md`](CLAUDE.md) y los requerimientos en [`docs/001-backend-requirements.md`](docs/001-backend-requirements.md) (backend) y [`docs/002-frontend-requirements.md`](docs/002-frontend-requirements.md) (frontend).

## Estado

- ✅ Backend: los 17 endpoints del contrato.
- ✅ Frontend conectado a la API: paneles del docente y del estudiante, historial de clases, detalle de clase, generación del material y resolución pregunta a pregunta.
- ✅ Tests E2E con Playwright: inicio de sesión por rol y material de refuerzo de principio a fin (`e2e/`).
- ⏳ Conectar un LLM real (basta con otra implementación de `LLMClient` en `backend/app/composition.py`).
