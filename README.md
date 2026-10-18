# Práctica IA

Plataforma de refuerzo para **extranjeros que aprenden español**. El docente genera, a partir de cada clase, una actividad de refuerzo con un LLM (simulado en este proyecto); el estudiante la resuelve **una única vez** y recibe su corrección con recomendaciones personalizadas.

## Cómo funciona

```
Docente                                         Estudiante
───────                                         ──────────
1. Inicia sesión y ve sus estudiantes
2. Entra a un estudiante → historial de clases
3. Abre una clase (tema, contexto, palabras
   clave, notas, PDF)
4. Revisa las palabras clave y genera el
   material: actividad de completar frases
   (1–15 ejercicios) creada por el LLM   ──────►  5. Ve sus clases y el PDF de cada una
                                                6. Abre el material (sin las respuestas)
                                                7. Lo resuelve una única vez
8. Ve el resultado del estudiante        ◄──────  → corrección, porcentaje y
                                                   recomendaciones del LLM
```

- **Generación de material**: el backend envía al LLM el nivel MCER y el idioma natal del estudiante, el tema, el contexto, las palabras clave, las notas y el PDF de la clase. La respuesta se **valida** (cantidad de ejercicios, un hueco `___` por frase, 2–4 opciones distintas, respuesta correcta entre las opciones) antes de guardarse.
- **Corrección**: siempre en el backend. Las respuestas correctas nunca se envían al estudiante antes de resolver.
- **LLM simulado**: el material se construye con las palabras clave de la clase y las recomendaciones salen de un fixture JSON, detrás de la interfaz `LLMClient`; un LLM real se conecta sin tocar el dominio.

## Stack

| Parte | Tecnologías |
|---|---|
| Frontend | React · TypeScript · Vite · Tailwind CSS v4 · Vitest + React Testing Library |
| Backend | Python 3.13 · FastAPI · SQLAlchemy 2 · Alembic · Pydantic · uv |
| Base de datos | PostgreSQL 16 (Docker Compose) |
| Seguridad | JWT (60 min) · argon2 · identificadores públicos UUID · Gitleaks |
| Calidad | TDD · mypy estricto · test de contrato OpenAPI · test de arquitectura · GitHub Actions |
| E2E | Playwright (pendiente) |

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
├── frontend/                 Aplicación React
├── docs/
│   ├── 001-backend-requirements.md   Requerimientos del backend
│   └── openapi.yaml                  Contrato de la API (fuente de verdad)
├── infra/postgres/           Inicialización de PostgreSQL
├── docker-compose.yml        PostgreSQL y utilidades migrate / seed
└── CLAUDE.md                 Normas de desarrollo del proyecto
```

El backend sigue una arquitectura en **tres capas** (`transport → domain ← persistence`): el dominio no depende de ningún framework y un test falla si una capa importa en la dirección prohibida.

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
```

- `.env` (raíz): credenciales de PostgreSQL para Docker Compose.
- `backend/.env`: `DATABASE_URL` y `TEST_DATABASE_URL` (con la misma contraseña), `JWT_SECRET` (mínimo 32 caracteres) y `SEED_USER_PASSWORD` (contraseña de los usuarios de prueba).

Para generar valores aleatorios:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2. Base de datos

Levanta PostgreSQL:

```bash
docker compose up -d
```

PostgreSQL queda en `127.0.0.1:5433` con dos bases: `practica_ia` (desarrollo) y `practica_ia_test` (tests).

Aplica todas las migraciones:

```bash
docker compose run --rm migrate
```

Carga los datos de prueba (aplica antes las migraciones si faltan):

```bash
docker compose run --rm seed
```

- El seed crea 2 docentes (`docente@colegio.edu`, `carlos.ruiz@colegio.edu`) y 4 estudiantes con clases y PDF de ejemplo (en `backend/storage/`). La contraseña de todos es `SEED_USER_PASSWORD` de `backend/.env`.
- Ambos comandos son idempotentes: si la base ya está al día o los datos ya existen, no cambian nada.
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

> El frontend todavía usa servicios en memoria; la conexión con la API está pendiente.

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
| POST | `/teachers/me/lessons/{lesson_id}/material` | Docente | Genera el material de refuerzo |
| GET | `/students/me/lessons` | Estudiante | Su historial de clases |
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
```

El backend se prueba por capas: use cases con fakes en memoria (sin BD), repositories contra la BD de test, endpoints con `TestClient`. Además:

- **Test de contrato**: la API implementada coincide con `docs/openapi.yaml`, en los dos sentidos.
- **Test de arquitectura**: cada capa solo depende en la dirección permitida.
- **Test de migraciones**: el esquema SQL está sincronizado con Alembic.

### Integración continua

| Workflow | Qué ejecuta |
|---|---|
| Backend CI | mypy, pytest (con PostgreSQL de servicio) y `alembic check` |
| Frontend CI | lint, tests con cobertura y build |
| Detección de secretos | Gitleaks sobre todo el historial |

## Forma de trabajo

- **TDD obligatorio**: test que falla → código mínimo → refactor.
- **SOLID** y arquitectura en tres capas con use cases y repositories.
- **Contrato primero**: los cambios de la API empiezan en `docs/openapi.yaml`.
- **Secretos**: nunca en el código, la documentación ni los commits.

Las normas completas están en [`CLAUDE.md`](CLAUDE.md) y los requerimientos en [`docs/001-backend-requirements.md`](docs/001-backend-requirements.md).

## Estado

- ✅ Backend: los 14 endpoints del contrato.
- 🚧 Frontend: login y panel del docente con datos en memoria; falta conectarlo a la API y construir las pantallas del estudiante.
- ⏳ Tests E2E con Playwright.
