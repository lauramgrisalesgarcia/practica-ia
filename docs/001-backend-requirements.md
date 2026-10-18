# Requerimientos del backend

Estado: **validado** · Última actualización: 2026-10-12

## Alcance

Plataforma para **extranjeros que aprenden español**. API REST que da servicio al frontend. Durante el proyecto **no se crean usuarios** desde la aplicación: los datos se cargan con un script de semillas (seed).

**Núcleo del proyecto:**
1. El docente entra a una clase de uno de sus alumnos y **genera material de refuerzo**. Elige el tipo de actividad (en este proyecto, solo *completar frases*) y la cantidad de ejercicios (1–15). El backend envía al LLM el contexto completo de la clase: nivel del estudiante, PDF visto, palabras clave y situación comunicativa.
2. El estudiante **resuelve la actividad una única vez**.
3. El backend **corrige** las respuestas, calcula el porcentaje de aciertos y devuelve **recomendaciones**.

Tanto el material como las recomendaciones los generaría un LLM; en este proyecto se **simulan**: el material se construye a partir de las palabras clave de la clase y las recomendaciones salen de un JSON fijo que imita la respuesta del modelo.

Roles:
- **Docente**: consulta sus estudiantes, el detalle de cada uno, su historial de clases y el detalle de una clase; genera el material de refuerzo y ve el resultado del estudiante.
- **Estudiante**: consulta su historial de clases, abre el material de una clase, lo resuelve una vez y ve su resultado con recomendaciones.

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
- Datos por clase: `id`, `date`, `duration_minutes`, `topic`, `context`, `material_status`.

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
- En este proyecto el cliente LLM es un **simulador** (`backend/app/llm/simulated.py`) que construye los ejercicios con las palabras clave de la petición: la respuesta correcta de cada ejercicio es una palabra clave, por turnos, con otras palabras clave o expresiones comunes como distractores. El cliente se define como una interfaz para poder sustituirlo por un LLM real sin tocar el resto del código.
- La respuesta del LLM **se valida** contra el esquema del material y contra la petición: mismo tipo de actividad, **exactamente** `exercise_count` ejercicios y **coherencia con las palabras clave** (ver reglas de validación). Si no es válida → `502` con `"No se pudo generar el material de refuerzo"`, y no se guarda nada.
- El material válido se **guarda** asociado a la clase, junto con la petición enviada al LLM (para trazabilidad). El material se genera **una única vez**: si la clase ya tiene material → `409`.

### RF9 · Historial de clases (estudiante)
- El estudiante ve las clases tomadas con su docente, de la más reciente a la más antigua.
- Datos por clase: `id`, `date`, `duration_minutes`, `topic`, `context`, `pdf` (nombre y URL de descarga), `material_status`.
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
- Con el resultado se piden **recomendaciones al cliente LLM** (nivel, idioma natal, contexto, palabras clave y ejercicios fallados), simulado con `backend/app/llm/fixtures/recommendations.json`.
- La respuesta de recomendaciones se valida. Si no es válida → `502` con `"No se pudieron generar las recomendaciones"`, **no se guarda el intento** y el estudiante puede volver a enviarlo.
- Si todo es válido se guarda el intento (respuestas, resultado y recomendaciones) y se devuelve.

### RF12 · Ver el resultado (estudiante y docente)
- El estudiante puede consultar su resultado y recomendaciones en cualquier momento después de resolver.
- El docente ve ese mismo resultado en el detalle de la clase (RF7).

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
  lesson_id          FK → lessons.id, único
  activity_type      'complete_sentence'
  exercise_count     entero 1–15
  llm_request        JSONB (petición enviada al LLM, para trazabilidad)
  content            JSONB (actividad validada, incluye respuestas correctas)
  generated_at       timestamp

material_submissions
  id                 PK
  material_id        FK → reinforcement_materials.id, único (un intento por material)
  student_id         FK → users.id
  answers            JSONB  [{ exercise_id, selected_option }]
  correct_count      entero
  incorrect_count    entero
  score              numérico (0–100, 2 decimales)
  recommendations    JSONB (respuesta validada del LLM)
  submitted_at       timestamp
```

Los PDF se guardan como archivos en el almacenamiento del backend (`backend/storage/lessons/`) y la base de datos solo guarda su ruta. El seed incluye PDF de ejemplo.

## Integración con el LLM (simulada)

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
      "path": "storage/lessons/15/restaurante-a2.pdf"
    }
  },
  "output_language": "es"
}
```

> El PDF se envía como referencia al archivo. La extracción de su contenido (texto o adjunto al modelo) queda para la integración con un LLM real.

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

### Respuesta: recomendaciones (`recommendations.json`)

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
| POST | `/teachers/me/lessons/{lesson_id}/material` | Docente | Genera el material (una única vez) |
| GET | `/students/me/lessons` | Estudiante | Su historial de clases |
| GET | `/students/me/lessons/{lesson_id}/pdf` | Estudiante | Descarga el PDF de su clase |
| GET | `/students/me/lessons/{lesson_id}/material` | Estudiante | Material sin respuestas (y su resultado si ya lo resolvió) |
| POST | `/students/me/lessons/{lesson_id}/material/submission` | Estudiante | Envía sus respuestas (una única vez) |
| GET | `/students/me/lessons/{lesson_id}/material/submission` | Estudiante | Su resultado y recomendaciones |

Todos los endpoints protegidos requieren la cabecera `Authorization: Bearer <token>`.

## Ejemplos de la API

### `GET /health`

```http
GET /health
```
```json
200 OK
{ "status": "ok" }
```

### `POST /auth/login`

```http
POST /auth/login
Content-Type: application/json

{ "email": "docente@colegio.edu", "password": "Docente#2026" }
```
```json
200 OK
{
  "access_token": "<token JWT>",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "first_name": "María",
    "last_name": "López",
    "email": "docente@colegio.edu",
    "role": "docente"
  }
}
```

Credenciales incorrectas:
```json
401 Unauthorized
{ "detail": "Credenciales incorrectas" }
```

Datos mal formados (correo inválido, campos vacíos):
```json
422 Unprocessable Entity
{ "detail": [ { "loc": ["body", "email"], "msg": "value is not a valid email address", "type": "value_error" } ] }
```

### `GET /auth/me`

```http
GET /auth/me
Authorization: Bearer <token JWT>
```
```json
200 OK
{
  "id": 1,
  "first_name": "María",
  "last_name": "López",
  "email": "docente@colegio.edu",
  "role": "docente"
}
```

Sin token o token caducado:
```json
401 Unauthorized
{ "detail": "No autenticado" }
```

### `GET /teachers/me/students`

```http
GET /teachers/me/students
Authorization: Bearer <token de docente>
```
```json
200 OK
[
  {
    "id": 3,
    "first_name": "John",
    "last_name": "Miller",
    "email": "john@correo.com",
    "native_language": "en",
    "level": "B1"
  },
  {
    "id": 2,
    "first_name": "Emma",
    "last_name": "Schmidt",
    "email": "emma@correo.com",
    "native_language": "de",
    "level": "A2"
  }
]
```

Con token de estudiante:
```json
403 Forbidden
{ "detail": "No tienes permiso para acceder a este recurso" }
```

### `GET /teachers/me/students/{student_id}`

```http
GET /teachers/me/students/2
Authorization: Bearer <token de docente>
```
```json
200 OK
{
  "id": 2,
  "first_name": "Emma",
  "last_name": "Schmidt",
  "email": "emma@correo.com",
  "native_language": "de",
  "level": "A2",
  "lessons_count": 12
}
```

Estudiante inexistente o de otro docente:
```json
404 Not Found
{ "detail": "Estudiante no encontrado" }
```

### `GET /teachers/me/students/{student_id}/lessons`

```http
GET /teachers/me/students/2/lessons
Authorization: Bearer <token de docente>
```
```json
200 OK
[
  {
    "id": 15,
    "date": "2026-10-08T16:00:00Z",
    "duration_minutes": 60,
    "topic": "Pedir en un restaurante",
    "context": "Pedir comida y bebida en un restaurante y pedir la cuenta",
    "material_status": "completed"
  },
  {
    "id": 11,
    "date": "2026-10-01T16:00:00Z",
    "duration_minutes": 60,
    "topic": "Presentarse",
    "context": "Presentarse y hablar de la familia en una reunión",
    "material_status": "none"
  }
]
```

### `GET /teachers/me/lessons/{lesson_id}`

El docente ve el material **con** las respuestas correctas y, si existe, el resultado del estudiante.

```http
GET /teachers/me/lessons/15
Authorization: Bearer <token de docente>
```
```json
200 OK
{
  "id": 15,
  "date": "2026-10-08T16:00:00Z",
  "duration_minutes": 60,
  "topic": "Pedir en un restaurante",
  "context": "Pedir comida y bebida en un restaurante y pedir la cuenta",
  "keywords": ["la carta", "quisiera", "de primero", "la cuenta", "para beber"],
  "notes": "Confunde 'quiero' y 'quisiera'. Le cuesta el orden primero/segundo/postre.",
  "pdf": { "filename": "restaurante-a2.pdf", "url": "/teachers/me/lessons/15/pdf" },
  "material_status": "completed",
  "student": {
    "id": 2,
    "first_name": "Emma",
    "last_name": "Schmidt",
    "native_language": "de",
    "level": "A2"
  },
  "material": {
    "generated_at": "2026-10-12T10:30:00Z",
    "activity_type": "complete_sentence",
    "exercise_count": 3,
    "title": "En el restaurante",
    "instructions": "Completa cada frase con la opción correcta.",
    "exercises": [
      {
        "id": 1,
        "sentence": "Camarero, ¿nos trae ___, por favor? Queremos ver los platos.",
        "options": ["la carta", "la cuenta", "la mesa"],
        "correct_option": "la carta"
      }
    ]
  },
  "submission": {
    "submitted_at": "2026-10-12T18:05:00Z",
    "correct_count": 2,
    "incorrect_count": 1,
    "score": 66.67
  }
}
```

Clase inexistente o de un estudiante de otro docente:
```json
404 Not Found
{ "detail": "Clase no encontrada" }
```

### `GET /teachers/me/lessons/{lesson_id}/pdf`

```http
GET /teachers/me/lessons/15/pdf
Authorization: Bearer <token de docente>
```
```http
200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="restaurante-a2.pdf"

<contenido binario del PDF>
```

### `POST /teachers/me/lessons/{lesson_id}/material`

```http
POST /teachers/me/lessons/15/material
Authorization: Bearer <token de docente>
Content-Type: application/json

{
  "activity_type": "complete_sentence",
  "exercise_count": 3,
  "keywords": ["la carta", "quisiera", "de primero", "de segundo", "la cuenta"]
}
```

En este ejemplo el docente quitó "para beber" y añadió "de segundo" respecto a las palabras clave de la clase. Si omite `keywords`, se usan las de la clase.
```json
201 Created
{
  "lesson_id": 15,
  "generated_at": "2026-10-12T10:30:00Z",
  "activity_type": "complete_sentence",
  "exercise_count": 3,
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

Cantidad fuera de rango o tipo de actividad no soportado:
```json
422 Unprocessable Entity
{ "detail": [ { "loc": ["body", "exercise_count"], "msg": "Input should be less than or equal to 15", "type": "less_than_equal" } ] }
```

Clase futura o material ya resuelto por el estudiante:
```json
409 Conflict
{ "detail": "Solo se puede generar material para clases ya realizadas" }
```
```json
409 Conflict
{ "detail": "El material de refuerzo de esta clase ya se generó y no se puede volver a generar" }
```

Respuesta del LLM inválida:
```json
502 Bad Gateway
{ "detail": "No se pudo generar el material de refuerzo" }
```

### `GET /students/me/lessons`

```http
GET /students/me/lessons
Authorization: Bearer <token de estudiante>
```
```json
200 OK
[
  {
    "id": 15,
    "date": "2026-10-08T16:00:00Z",
    "duration_minutes": 60,
    "topic": "Pedir en un restaurante",
    "context": "Pedir comida y bebida en un restaurante y pedir la cuenta",
    "pdf": { "filename": "restaurante-a2.pdf", "url": "/students/me/lessons/15/pdf" },
    "material_status": "pending"
  }
]
```

### `GET /students/me/lessons/{lesson_id}/pdf`

```http
GET /students/me/lessons/15/pdf
Authorization: Bearer <token de estudiante>
```
```http
200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="restaurante-a2.pdf"

<contenido binario del PDF>
```

Clase inexistente o de otro estudiante:
```json
404 Not Found
{ "detail": "Clase no encontrada" }
```

### `GET /students/me/lessons/{lesson_id}/material`

Antes de resolverlo (sin respuestas correctas):

```http
GET /students/me/lessons/15/material
Authorization: Bearer <token de estudiante>
```
```json
200 OK
{
  "lesson_id": 15,
  "activity_type": "complete_sentence",
  "title": "En el restaurante",
  "instructions": "Completa cada frase con la opción correcta.",
  "exercises": [
    {
      "id": 1,
      "sentence": "Camarero, ¿nos trae ___, por favor? Queremos ver los platos.",
      "options": ["la carta", "la cuenta", "la mesa"]
    },
    {
      "id": 2,
      "sentence": "Buenas noches. ___ una mesa para dos personas.",
      "options": ["Quisiera", "Quiero que", "Quería que"]
    },
    {
      "id": 3,
      "sentence": "___ voy a tomar una sopa de verduras y de segundo, pescado.",
      "options": ["De primero", "Para primero", "En primero"]
    }
  ],
  "submission": null
}
```

Después de resolverlo, `submission` contiene el mismo objeto que devuelve `GET .../submission`.

Clase sin material:
```json
404 Not Found
{ "detail": "La clase no tiene material de refuerzo" }
```

### `POST /students/me/lessons/{lesson_id}/material/submission`

```http
POST /students/me/lessons/15/material/submission
Authorization: Bearer <token de estudiante>
Content-Type: application/json

{
  "answers": [
    { "exercise_id": 1, "selected_option": "la carta" },
    { "exercise_id": 2, "selected_option": "Quisiera" },
    { "exercise_id": 3, "selected_option": "Para primero" }
  ]
}
```
```json
201 Created
{
  "lesson_id": 15,
  "submitted_at": "2026-10-12T18:05:00Z",
  "correct_count": 2,
  "incorrect_count": 1,
  "score": 66.67,
  "results": [
    { "exercise_id": 1, "selected_option": "la carta", "correct_option": "la carta", "is_correct": true },
    { "exercise_id": 2, "selected_option": "Quisiera", "correct_option": "Quisiera", "is_correct": true },
    { "exercise_id": 3, "selected_option": "Para primero", "correct_option": "De primero", "is_correct": false }
  ],
  "feedback": "¡Muy bien! Ya sabes pedir la carta y usar 'quisiera' para ser cortés.",
  "recommendations": [
    "Para ordenar los platos se dice 'de primero', 'de segundo' y 'de postre'.",
    "Practica en voz alta un pedido completo: primero, segundo, bebida y postre."
  ]
}
```

Segundo intento:
```json
409 Conflict
{ "detail": "El material ya fue resuelto" }
```

Faltan ejercicios, ejercicio repetido u opción inexistente:
```json
422 Unprocessable Entity
{ "detail": "Debes responder todos los ejercicios con una opción válida" }
```

Respuesta de recomendaciones del LLM inválida (el intento no se guarda):
```json
502 Bad Gateway
{ "detail": "No se pudieron generar las recomendaciones" }
```

### `GET /students/me/lessons/{lesson_id}/material/submission`

```http
GET /students/me/lessons/15/material/submission
Authorization: Bearer <token de estudiante>
```
```json
200 OK
{ "lesson_id": 15, "submitted_at": "2026-10-12T18:05:00Z", "correct_count": 2, "...": "igual que la respuesta del POST" }
```

Aún no resuelto:
```json
404 Not Found
{ "detail": "Aún no has resuelto este material" }
```

## Sesión (decisión)
- **JWT de acceso** firmado (HS256), enviado como `Authorization: Bearer <token>`.
- **Caducidad: 60 minutos**. Al caducar, el frontend vuelve al login.
- **Cierre de sesión en el cliente**: el frontend descarta el token. No hay lista de revocación ni refresh tokens.

Motivo: sin creación de usuarios ni cambios de contraseña, una sesión sin estado es lo más sencillo y suficiente para el alcance del proyecto. Si más adelante se necesita, se añaden refresh tokens.

## Requerimientos no funcionales
- **Stack**: Python + FastAPI, SQLAlchemy 2, PostgreSQL 16, Pydantic para validar entrada y salida.
- **Migraciones**: Alembic desde el primer modelo; el esquema nunca se crea con `create_all` en entornos reales.
- **LLM desacoplado**: la generación de material y de recomendaciones depende de una interfaz (`LLMClient`) que recibe las peticiones descritas arriba. La implementación simulada lee los JSON de fixtures; en los tests se inyectan clientes falsos (respuesta válida, inválida, error) y se verifica la petición que se les envía.
- **Corrección en el servidor**: la calificación se calcula siempre en el backend; las respuestas correctas nunca se envían al estudiante antes de resolver.
- **Concurrencia**: la restricción de unicidad en `material_submissions.material_id` garantiza un único intento aunque lleguen dos envíos a la vez.
- **Archivos**: los PDF se sirven solo a usuarios autorizados; nunca se exponen rutas del sistema de archivos.
- **Seguridad**: contraseñas con hash argon2; CORS restringido al origen del frontend; secretos y configuración por variables de entorno.
- **Testing**: TDD con pytest + `TestClient`, contra una base de datos PostgreSQL de test separada de la de desarrollo.
- **Datos de prueba**: script de seed con al menos un docente, varios estudiantes de distintos niveles e idiomas natales, clases pasadas (con y sin material, con PDF de ejemplo) y una clase futura.
- **Errores**: respuestas JSON con `detail`, en español para los mensajes que ve el usuario.

## Fuera de alcance
- Registro y creación de usuarios, cambio y recuperación de contraseña.
- Gestión (crear/editar) de clases y subida de PDF desde la API.
- Integración con un LLM real y extracción del contenido de los PDF.
- Tipos de actividad distintos de `complete_sentence`.
- Edición manual del material por el docente.
- Reintentos o reinicio del material por el estudiante.
- Rol administrador.
