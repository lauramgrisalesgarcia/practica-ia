# Requerimientos del backend

Estado: **implementado** · Última actualización: 2026-10-18

## Alcance

Plataforma para **extranjeros que aprenden español**. API REST que da servicio al frontend. Durante el proyecto **no se crean usuarios** desde la aplicación: los datos se cargan con un script de semillas (seed).

**Núcleo del proyecto:**
1. El docente entra a una clase de uno de sus alumnos y **genera material de refuerzo**. Elige el tipo de actividad (en este proyecto, solo *completar frases*) y la cantidad de ejercicios (1–15). El backend envía al LLM el contexto completo de la clase: nivel del estudiante, PDF visto, palabras clave y situación comunicativa.
2. El estudiante **resuelve la actividad una única vez**.
3. El backend **corrige** las respuestas, calcula el porcentaje de aciertos y devuelve **recomendaciones**.

Tanto el material como las recomendaciones los generaría un LLM; en este proyecto se **simulan**: el material se construye con las palabras clave de la clase y frases de ejemplo para practicarlas, y las recomendaciones, con el tema de la clase y los ejercicios fallados.

Roles:
- **Docente**: ve su panel de indicadores, sus estudiantes, el detalle de cada uno, su historial de clases y el detalle de una clase; genera el material de refuerzo y ve el resultado del estudiante.
- **Estudiante**: ve su panel de indicadores, su historial de clases y el detalle de cada una; abre el material de una clase, lo resuelve una vez y ve su resultado con recomendaciones.

## Requerimientos funcionales

### RF1 · Inicio de sesión
- El usuario accede con **correo y contraseña**. No hay registro.
- El correo no distingue mayúsculas/minúsculas.
- Éxito → devuelve un token de acceso y los datos del usuario (`id`, `first_name`, `last_name`, `email`, `role`).
- Fallo → `401` con el mensaje genérico `"Credenciales incorrectas"` (no revela si el correo existe).
- Solo se valida que correo y contraseña no estén vacíos y que el correo tenga formato válido. Las reglas de complejidad de contraseña no aplican en el login.

### RF2 · Usuario actual
- Con un token válido se obtienen los datos del usuario autenticado (permite recuperar la sesión al recargar).
- Token ausente, inválido o caducado → `401`.

### RF3 · Control de acceso por rol y propiedad
- Cada endpoint protegido valida el rol. Rol no permitido → `403`.
- Un docente solo accede a **sus** estudiantes y a las clases de ellos; un estudiante solo a **sus** clases. Un recurso que existe pero pertenece a otro usuario responde `404` (no se revela su existencia).

### RF4 · Estudiantes asignados (docente)
- El docente obtiene la lista de sus estudiantes, ordenada por apellido y nombre.
- Datos por estudiante: `id`, `first_name`, `last_name`, `email`, `native_language`, `level`.

### RF5 · Detalle de un estudiante (docente)
- El docente entra a un estudiante concreto y ve sus datos (los de RF4 más el número de clases tomadas).

### RF6 · Historial de clases de un estudiante (docente)
- El docente ve las clases realizadas por ese estudiante, de la más reciente a la más antigua.
- Datos por clase: `id`, `date`, `duration_minutes`, `topic`, `context`, `keywords`, `material_status` y `score` (nota si el material está resuelto; `null` si no).

### RF7 · Detalle de una clase (docente)
- El docente entra a una clase concreta y ve: fecha, duración, tema, contexto, palabras clave, notas, PDF de la clase, datos básicos del estudiante, el material (con las respuestas correctas) si existe y el resultado del estudiante si ya lo resolvió.

### RF8 · Generación de material de refuerzo (docente) — **CORE**
- Desde el detalle de una clase, el docente solicita generar el material indicando:
  - `activity_type`: tipo de actividad. En el alcance del proyecto solo existe `complete_sentence` (*completar la frase*).
  - `exercise_count`: cantidad de ejercicios, entre **1 y 15**.
  - `keywords` (opcional): palabras clave **revisadas** por el docente. El frontend muestra las palabras clave de la clase para que el docente las revise (quitar, añadir o corregir) antes de generar. Si no se envían, se usan las de la clase.
    - Entre 1 y 20 palabras clave, cada una no vacía y de máximo 50 caracteres; se eliminan espacios sobrantes y duplicados.
    - La revisión solo afecta a esta generación: queda registrada en `llm_request` y **no modifica** las palabras clave guardadas en la clase.
  - Valor fuera de rango, tipo desconocido o palabras clave inválidas → `422`.
- El backend construye la **petición al LLM** (ver más abajo) con:
  - Nivel MCER del estudiante (`A1`–`C2`) y su idioma natal.
  - PDF visto en la clase.
  - Palabras clave (las revisadas por el docente o, si no las envía, las de la clase).
  - Contexto de la clase (situación comunicativa, p. ej. *pedir comida en un restaurante*).
  - Tema y notas del docente.
  - Tipo de actividad y cantidad de ejercicios.
- El cliente LLM es una interfaz (`LLMClient`) con dos implementaciones, que se eligen en `composition.py`:
  - **Gemini** (`backend/app/llm/gemini.py`), si hay `GEMINI_API_KEY`. Envía la petición como prompt con las reglas del validador y, además: una sola opción correcta por ejercicio, tiempos verbales y vocabulario del nivel MCER del estudiante (`NEW_TENSES_BY_LEVEL`) y sujetos variados. Las palabras clave las elige el docente y se usan tal cual, aunque sean de otro nivel. Si el modelo está saturado (503) se reintenta una vez; si sigue saturado, sin cuota (429) o tarda más de 60 s, se prueba una vez el modelo de respaldo (`GEMINI_FALLBACK_MODEL`). La ruta del PDF no se envía al proveedor.
  - **Simulado** (`backend/app/llm/simulated.py`), si no hay clave: construye los ejercicios con las palabras clave de la petición. La respuesta correcta de cada ejercicio es una palabra clave, por turnos, con otras palabras clave o expresiones comunes como distractores, y una frase de ejemplo por palabra clave de un banco (`backend/app/llm/fixtures/example_sentences.json`, que cubre las palabras clave del seed; para otras palabras usa una frase de reserva). Los tests y los E2E usan siempre este.
- La respuesta del LLM **se valida** contra el esquema del material y contra la petición: mismo tipo de actividad, **exactamente** `exercise_count` ejercicios y **coherencia con las palabras clave** (ver reglas de validación). Si no es válida → `502` con `"No se pudo generar el material de refuerzo"`, y no se guarda nada.
- El material válido se **guarda** asociado a la clase, junto con la petición enviada al LLM (para trazabilidad). El material se genera **una única vez**: si la clase ya tiene material → `409`.

### RF9 · Historial de clases (estudiante)
- El estudiante ve las clases tomadas con su docente, de la más reciente a la más antigua.
- Datos por clase: `id`, `date`, `duration_minutes`, `topic`, `context`, `keywords`, `pdf` (nombre y URL de descarga), `material_status` y `score`.
- El estudiante puede **ver y descargar el PDF** de cada una de sus clases.

### RF10 · Ver el material (estudiante) — **CORE**
- El estudiante abre el material de una de sus clases.
- **Nunca** recibe las respuestas correctas antes de resolverlo: solo las frases con el hueco y las opciones.
- Si ya lo resolvió, recibe también su resultado (RF12).
- Clase sin material → `404`.

### RF11 · Resolver el material (estudiante) — **CORE**
- El estudiante envía una respuesta por cada ejercicio (la opción elegida para completar el hueco).
- Debe responder **todos** los ejercicios, una sola vez cada uno, con opciones que existan → si no, `422`.
- Solo puede resolverlo **una única vez**. Segundo intento → `409` con `"El material ya fue resuelto"`.
- El backend corrige y calcula:
  - `correct_count`: aciertos.
  - `incorrect_count`: desaciertos.
  - `score`: porcentaje de aciertos, con 2 decimales (`correct_count / total × 100`). Todos los ejercicios pesan lo mismo.
  - Por ejercicio: opción elegida, opción correcta y si acertó.
- Con el resultado se piden **recomendaciones al cliente LLM** (nivel, idioma natal, contexto, palabras clave y ejercicios fallados). Las genera siempre el LLM simulado, también cuando Gemini está configurado, a partir de esos datos: un comentario con los aciertos y el tema, una recomendación por palabra clave fallada (con la frase corregida) y una para seguir practicando las palabras clave.
- La respuesta de recomendaciones se valida. Si no es válida → `502` con `"No se pudieron generar las recomendaciones"`, **no se guarda el intento** y el estudiante puede volver a enviarlo.
- Si todo es válido se guarda el intento (respuestas, resultado y recomendaciones) y se devuelve.

### RF12 · Ver el resultado (estudiante y docente)
- El estudiante puede consultar su resultado y recomendaciones en cualquier momento después de resolver.
- El docente ve ese mismo resultado en el detalle de la clase (RF7).

### RF13 · Panel de indicadores (docente)
- Resumen de la actividad del docente con todos sus estudiantes, calculado solo con clases ya realizadas:
  - `lessons_this_month`: clases del mes en curso.
  - `pending_materials`: materiales generados que el estudiante aún no ha resuelto.
  - `material_status`: cuántas clases están `completed`, `pending` y `none`.
  - `weekly_lessons`: clases por semana de las **últimas 8 semanas** (las semanas empiezan en lunes), en orden cronológico.
  - `recent_activity`: las **10** actividades más recientes (clase realizada, material generado o material resuelto con su nota), con el estudiante y el tema.
  - `calendar`: clases de los **últimos 6 meses**, ordenadas por fecha.
- Meses y semanas se calculan en **UTC**.

### RF14 · Panel de indicadores (estudiante)
- Resumen de la actividad del estudiante, solo con sus clases ya realizadas:
  - `lessons_count`, `completed_materials` y `average_score` (media de sus notas con 2 decimales; `null` si no ha resuelto ninguno).
  - `pending_materials`: refuerzos generados que aún no ha resuelto, con su tema, fecha y número de ejercicios.
  - `recent_activity`: sus **10** actividades más recientes.
  - `calendar`: sus clases de los **últimos 6 meses**.
  - `score_history`: sus **últimas 10** notas en orden cronológico (evolución de la nota).

### RF15 · Detalle de una clase (estudiante)
- El estudiante entra a una de sus clases y ve: fecha, duración, tema, contexto, palabras clave, PDF, estado del material y nota.
- **No** incluye las notas del docente, que son solo para él.
- Clase inexistente, futura o de otro estudiante → `404`.

## Reglas de negocio
- Todos los recursos se identifican en la API con un **UUID v4 aleatorio** (`public_id`), no secuencial ni adivinable. Los ids numéricos internos de la BD nunca se exponen.
- Los estudiantes son extranjeros que aprenden **español**; el idioma de aprendizaje no se almacena porque siempre es `es`.
- El nivel del estudiante sigue el **MCER**: `A1`, `A2`, `B1`, `B2`, `C1`, `C2`.
- Un estudiante tiene **exactamente un** docente asignado. Un docente puede tener varios estudiantes.
- Una clase pertenece a un estudiante y a su docente, y tiene un PDF, palabras clave (al menos 1) y un contexto.
- Los historiales solo incluyen clases ya realizadas (fecha ≤ momento actual).
- Solo se puede generar material para clases ya realizadas. Clase futura → `409`.
- Una clase tiene como máximo **un** material vigente, y un material como máximo **un** intento de resolución.
- El material de una clase se genera **una única vez**: si ya tiene material → `409`.
- `material_status` de una clase: `none` (sin material), `pending` (generado, sin resolver), `completed` (resuelto).
- Los paneles (RF13, RF14) solo cuentan clases realizadas y calculan meses y semanas en UTC; límites: 8 semanas, 10 actividades recientes, 6 meses de calendario y 10 notas en la evolución.
- Los idiomas natales se guardan como códigos ISO 639-1 (`en`, `de`, `fr`, …).

## Modelo de datos

```
users
  id              PK (interno, nunca se expone)
  public_id       UUID v4, único (identificador en la API)
  first_name      texto, obligatorio
  last_name       texto, obligatorio
  email           texto, único (en minúsculas)
  password_hash   texto (argon2)
  role            'docente' | 'estudiante'
  created_at      timestamp

student_profiles                  (solo usuarios con rol estudiante)
  user_id            PK, FK → users.id
  teacher_id         FK → users.id (rol docente), obligatorio
  native_language    código ISO 639-1
  level              'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

lessons
  id                 PK (interno, nunca se expone)
  public_id          UUID v4, único (identificador en la API)
  student_id         FK → users.id
  teacher_id         FK → users.id
  date               timestamp con zona horaria
  duration_minutes   entero > 0
  topic              texto (p. ej. "Pedir en un restaurante")
  context            texto (situación comunicativa)
  keywords           lista de textos (≥ 1)
  notes              texto, opcional
  pdf_filename       texto (nombre visible del PDF)
  pdf_path           texto (ruta del archivo en el almacenamiento del backend)

reinforcement_materials
  id                 PK
  public_id          UUID v4, único
  lesson_id          FK → lessons.id, único
  activity_type      'complete_sentence'
  exercise_count     entero 1–15
  llm_request        JSONB (petición enviada al LLM, para trazabilidad)
  content            JSONB (actividad validada, incluye respuestas correctas)
  generated_at       timestamp

material_submissions
  id                 PK
  public_id          UUID v4, único
  material_id        FK → reinforcement_materials.id, único (un intento por material)
  student_id         FK → users.id
  answers            JSONB  [{ exercise_id, selected_option }]
  correct_count      entero
  incorrect_count    entero
  score              numérico (0–100, 2 decimales)
  recommendations    JSONB (respuesta validada del LLM)
  submitted_at       timestamp
```

Los PDF se guardan como archivos en el almacenamiento del backend (`backend/storage/lessons/<UUID del estudiante>/`) y la base de datos solo guarda su ruta, que nunca se expone en la API. El seed incluye PDF de ejemplo.

## Integración con el LLM

### Petición para generar material

Lo que el backend envía al `LLMClient` al generar material:

```json
{
  "task": "generate_reinforcement_material",
  "activity_type": "complete_sentence",
  "exercise_count": 5,
  "student": {
    "level": "A2",
    "native_language": "de"
  },
  "lesson": {
    "topic": "Pedir en un restaurante",
    "context": "Pedir comida y bebida en un restaurante y pedir la cuenta",
    "keywords": ["la carta", "quisiera", "de primero", "la cuenta", "para beber"],
    "notes": "Confunde 'quiero' y 'quisiera'. Le cuesta el orden primero/segundo/postre.",
    "pdf": {
      "filename": "restaurante-a2.pdf",
      "path": "lessons/3f2b8c1e-9a4d-4e7b-b6a2-1c9d0e5f7a83/restaurante-a2.pdf"
    }
  },
  "output_language": "es"
}
```

> La petición del dominio incluye una referencia al PDF, que se guarda con el material para trazabilidad. El adaptador de Gemini la quita antes de enviar la petición, porque la ruta es un dato interno del servidor: Gemini no recibe el PDF ni su contenido.

### Respuesta: material de refuerzo

Actividad de *completar la frase* eligiendo la opción que va en el hueco (`___`):

```json
{
  "activity_type": "complete_sentence",
  "title": "En el restaurante",
  "instructions": "Completa cada frase con la opción correcta.",
  "exercises": [
    {
      "id": 1,
      "sentence": "Camarero, ¿nos trae ___, por favor? Queremos ver los platos.",
      "options": ["la carta", "la cuenta", "la mesa"],
      "correct_option": "la carta"
    },
    {
      "id": 2,
      "sentence": "Buenas noches. ___ una mesa para dos personas.",
      "options": ["Quisiera", "Quiero que", "Quería que"],
      "correct_option": "Quisiera"
    },
    {
      "id": 3,
      "sentence": "___ voy a tomar una sopa de verduras y de segundo, pescado.",
      "options": ["De primero", "Para primero", "En primero"],
      "correct_option": "De primero"
    }
  ]
}
```

Reglas de validación:
- `activity_type` igual al pedido.
- `title` e `instructions`: texto no vacío.
- `exercises`: exactamente `exercise_count` elementos (entre 1 y 15).
- Cada ejercicio: `id` entero único; `sentence` no vacía y con **exactamente un** hueco `___`; `options` entre 2 y 4 textos distintos y no vacíos; `correct_option` debe ser una de las `options`.
- Coherencia con las palabras clave pedidas (sin distinguir mayúsculas ni espacios sobrantes): la `correct_option` de cada ejercicio es una de las palabras clave y todas se usan al menos una vez; si hay más palabras clave que ejercicios, cada ejercicio usa una distinta.

### Petición para recomendaciones

```json
{
  "task": "generate_recommendations",
  "student": { "level": "A2", "native_language": "de" },
  "lesson": {
    "topic": "Pedir en un restaurante",
    "context": "Pedir comida y bebida en un restaurante y pedir la cuenta",
    "keywords": ["la carta", "quisiera", "de primero", "la cuenta", "para beber"]
  },
  "result": {
    "correct_count": 2,
    "incorrect_count": 1,
    "score": 66.67,
    "failed_exercises": [
      {
        "sentence": "___ voy a tomar una sopa de verduras y de segundo, pescado.",
        "selected_option": "Para primero",
        "correct_option": "De primero"
      }
    ]
  },
  "output_language": "es"
}
```

### Respuesta: recomendaciones

```json
{
  "feedback": "¡Muy bien! Ya sabes pedir la carta y usar 'quisiera' para ser cortés.",
  "recommendations": [
    "Para ordenar los platos se dice 'de primero', 'de segundo' y 'de postre'.",
    "Practica en voz alta un pedido completo: primero, segundo, bebida y postre."
  ]
}
```

Reglas de validación:
- `feedback`: texto no vacío.
- `recommendations`: lista de 1 a 5 textos no vacíos.

## Endpoints

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/health` | Público | Estado del servicio |
| POST | `/auth/login` | Público | Inicio de sesión |
| GET | `/auth/me` | Autenticado | Usuario actual |
| GET | `/teachers/me/students` | Docente | Lista de sus estudiantes |
| GET | `/teachers/me/students/{student_id}` | Docente | Detalle de un estudiante |
| GET | `/teachers/me/students/{student_id}/lessons` | Docente | Historial de clases del estudiante |
| GET | `/teachers/me/lessons/{lesson_id}` | Docente | Detalle de una clase (material y resultado si existen) |
| GET | `/teachers/me/lessons/{lesson_id}/pdf` | Docente | Descarga el PDF de la clase |
| GET | `/teachers/me/insights` | Docente | Indicadores de su panel (RF13) |
| POST | `/teachers/me/lessons/{lesson_id}/material` | Docente | Genera el material (una única vez) |
| GET | `/students/me/insights` | Estudiante | Indicadores de su panel (RF14) |
| GET | `/students/me/lessons` | Estudiante | Su historial de clases |
| GET | `/students/me/lessons/{lesson_id}` | Estudiante | Detalle de su clase, sin las notas del docente (RF15) |
| GET | `/students/me/lessons/{lesson_id}/pdf` | Estudiante | Descarga el PDF de su clase |
| GET | `/students/me/lessons/{lesson_id}/material` | Estudiante | Material sin respuestas (y su resultado si ya lo resolvió) |
| POST | `/students/me/lessons/{lesson_id}/material/submission` | Estudiante | Envía sus respuestas (una única vez) |
| GET | `/students/me/lessons/{lesson_id}/material/submission` | Estudiante | Su resultado y recomendaciones |

Todos los endpoints protegidos requieren la cabecera `Authorization: Bearer <token>`.

## Ejemplos y errores

Los ejemplos de petición y respuesta de cada endpoint están en el contrato, [`openapi.yaml`](openapi.yaml), que es la fuente de verdad y se verifica con un test (`tests/contract/test_openapi_contract.py`). Swagger los muestra en <http://localhost:8001/docs> con el backend en marcha.

Errores de negocio (todas las respuestas de error son JSON con `detail`):

| Código | `detail` | Cuándo |
|---|---|---|
| 401 | `Credenciales incorrectas` | Login con correo o contraseña incorrectos |
| 401 | — | Token ausente, inválido o caducado |
| 403 | `No tienes permiso para acceder a este recurso` | Rol no permitido |
| 404 | `Estudiante no encontrado` | Estudiante inexistente o de otro docente |
| 404 | `Clase no encontrada` | Clase inexistente, futura o de otro usuario |
| 404 | `El PDF de la clase no está disponible` | El archivo del PDF no existe |
| 404 | `La clase no tiene material de refuerzo` | Ver o resolver material que no existe |
| 404 | `Aún no has resuelto este material` | Ver el resultado antes de resolver |
| 409 | `Solo se puede generar material para clases ya realizadas` | Generar material de una clase futura |
| 409 | `El material de refuerzo de esta clase ya se generó y no se puede volver a generar` | Segundo intento de generar |
| 409 | `El material ya fue resuelto` | Segundo intento de resolver |
| 422 | `Debes responder todos los ejercicios con una opción válida` | Respuestas incompletas, repetidas o con opciones que no existen |
| 422 | (validación) | Datos con formato o rango no válidos |
| 502 | `No se pudo generar el material de refuerzo` | Respuesta del LLM no válida o fallo del proveedor (no se guarda nada) |
| 502 | `No se pudieron generar las recomendaciones` | Respuesta de recomendaciones no válida (el intento no se consume) |

## Sesión (decisión)
- **JWT de acceso** firmado (HS256), enviado como `Authorization: Bearer <token>`.
- **Caducidad: 60 minutos**. Al caducar, el frontend vuelve al login.
- **Cierre de sesión en el cliente**: el frontend descarta el token. No hay lista de revocación ni refresh tokens.

Motivo: sin creación de usuarios ni cambios de contraseña, una sesión sin estado es lo más sencillo y suficiente para el alcance del proyecto.

## Requerimientos no funcionales
- **Stack**: Python + FastAPI, SQLAlchemy 2, PostgreSQL 16, Pydantic para validar entrada y salida.
- **Migraciones**: Alembic desde el primer modelo; el esquema nunca se crea con `create_all` en entornos reales.
- **LLM desacoplado**: la generación de material y de recomendaciones depende de una interfaz (`LLMClient`) que recibe las peticiones descritas arriba. Las implementaciones son Gemini (material) y la simulada (material sin clave y siempre recomendaciones); en los tests se inyectan clientes falsos (respuesta válida, inválida, error) y se verifica la petición que se les envía, y el cliente de Gemini se prueba con un HTTP falso, sin red.
- **Corrección en el servidor**: la calificación se calcula siempre en el backend; las respuestas correctas nunca se envían al estudiante antes de resolver.
- **Concurrencia**: la restricción de unicidad en `material_submissions.material_id` garantiza un único intento aunque lleguen dos envíos a la vez.
- **Archivos**: los PDF se sirven solo a usuarios autorizados; nunca se exponen rutas del sistema de archivos.
- **Seguridad**: contraseñas con hash argon2; sin CORS: en desarrollo el frontend llama a la API por el proxy de Vite (`/api`), desde el mismo origen; secretos y configuración por variables de entorno, sin valores por defecto (`SecretStr`).
- **Testing**: TDD con pytest + `TestClient`, contra una base de datos PostgreSQL de test separada de la de desarrollo.
- **Datos de prueba**: script de seed con 2 docentes y 4 estudiantes de distintos niveles (A1–B2) e idiomas natales, con 6–7 clases pasadas y alguna futura cada uno, y un PDF de ejemplo por clase. Es idempotente: al volver a ejecutarlo solo añade lo que falte.
- **Tests E2E**: Playwright sobre una BD propia (`practica_ia_e2e`) que se reinicia en cada ejecución (ver `e2e/`).
- **Errores**: respuestas JSON con `detail`, en español para los mensajes que ve el usuario.

## Fuera de alcance
- Registro y creación de usuarios, cambio y recuperación de contraseña.
- Gestión (crear/editar) de clases y subida de PDF desde la API.
- Extracción del contenido de los PDF y envío al LLM.
- Recomendaciones generadas con Gemini (se generan con el LLM simulado).
- Tipos de actividad distintos de `complete_sentence`.
- Edición manual del material por el docente.
- Reintentos o reinicio del material por el estudiante.
- Rol administrador.
