# Requerimientos del frontend

Estado: **implementado** · Última actualización: 2026-10-18

## Alcance

Aplicación web (React + TypeScript) para los dos roles de PractIcA. Consume la API descrita en [`001-backend-requirements.md`](001-backend-requirements.md) y [`openapi.yaml`](openapi.yaml), y también funciona **sin backend** con datos en memoria para desarrollar y hacer demostraciones.

- **Docente**: sigue la actividad de sus alumnos, revisa sus clases y genera el material de refuerzo de cada una.
- **Estudiante**: sigue su progreso, revisa sus clases y resuelve el material de refuerzo, pregunta a pregunta y una única vez.

Toda la interfaz está en **español**; fechas y números se formatean con `Intl` en `es`.

## Rutas y acceso

| Ruta | Rol | Pantalla |
|---|---|---|
| `/login` | Público | Inicio de sesión (RF-F1) |
| `/docente` | Docente | Panel del docente (RF-F3) |
| `/docente/alumnos/:studentId` | Docente | Detalle del alumno con su historial (RF-F4) |
| `/docente/clases/:lessonId` | Docente | Detalle de la clase y material (RF-F5, RF-F6) |
| `/estudiante` | Estudiante | Panel del estudiante (RF-F7) |
| `/estudiante/clases` | Estudiante | Historial de sus clases (RF-F8) |
| `/estudiante/clases/:lessonId` | Estudiante | Detalle de su clase y material (RF-F9, RF-F10) |
| Cualquier otra | — | Redirige al inicio del rol, o a `/login` sin sesión |

- Sin sesión, una ruta privada lleva a `/login`. Con sesión pero otro rol, lleva al inicio de su rol (`RequireRole`).
- Todas las páginas privadas comparten una cabecera con el logo, el nombre y rol del usuario y **Cerrar sesión**.

## Requerimientos funcionales

### RF-F1 · Inicio de sesión
- Formulario con correo y contraseña. Valida en el cliente que no estén vacíos y que el correo tenga formato válido; cada error se asocia a su campo.
- Credenciales incorrectas → mensaje del back («Credenciales incorrectas») sin revelar qué dato falla.
- Al entrar, cada rol va a su panel (`/docente` o `/estudiante`).

### RF-F2 · Sesión
- El token se guarda en `sessionStorage` (se pierde al cerrar la pestaña) y se envía como `Authorization: Bearer`.
- Al recargar, la sesión se recupera con `GET /auth/me`; si el token no es válido, se cierra la sesión.
- Si una petición recibe `401` con la sesión activa (token caducado), se cierra la sesión y el login muestra «Tu sesión ha caducado. Vuelve a iniciar sesión.».
- **Cerrar sesión** descarta el token y vuelve a `/login`.

### RF-F3 · Panel del docente
- Saludo y **resumen de actividad** (`GET /teachers/me/insights`):
  - Tarjetas: clases este mes y materiales pendientes.
  - Estado del material (resuelto, pendiente, sin material) como barra de proporciones.
  - Gráfico de barras de clases por semana (últimas 8).
  - **Actividad reciente** (clase realizada, material generado, material resuelto con su nota), con el alumno y el tema. Es una columna lateral que se queda fija al desplazarse.
  - **Calendario de clases** por mes, con navegación entre meses; cada día marca cuántas clases tiene y, al elegirlo, se listan sus clases con la hora.
- **Mis alumnos** (`GET /teachers/me/students`): lista con iniciales, nombre, nivel e idioma natal, con enlace al detalle; gráficos de alumnos por nivel e idiomas natales.

### RF-F4 · Detalle del alumno (docente)
- Datos del alumno (nombre, correo, nivel, idioma natal, número de clases) y enlace para volver al panel.
- **Historial de clases** como línea de tiempo (RF-F11), con dos acciones por clase: **Ver clase** y, si no tiene material, **Generar material** (abre el detalle de la clase con el formulario desplegado).

### RF-F5 · Detalle de la clase (docente)
- Información de la clase: tema, fecha, duración, contexto, palabras clave, notas del docente, alumno (con enlace) y botón compacto para **descargar el PDF**.
- Si el material está resuelto, **Resultado del alumno** en una tarjeta lateral: nota, aciertos, fallos y fecha.
- **Material de refuerzo** generado: título, instrucciones y cada pregunta en su tarjeta, con las opciones y la correcta marcada.

### RF-F6 · Generar material (docente) — **CORE**
- Solo en clases realizadas sin material. El formulario aparece al pulsar **Generar material de refuerzo**, debajo de la información de la clase.
- Campos: tipo de actividad (*completar la frase*), número de ejercicios (1–15, 5 por defecto) y **palabras clave**, precargadas con las de la clase para que el docente las revise.
- Validación en el cliente con las mismas reglas que el back: 1–20 palabras clave de máximo 50 caracteres; se eliminan espacios sobrantes y duplicados (sin distinguir mayúsculas).
- Mientras genera, el botón muestra «Generando…» y no se puede reenviar. Si falla, se muestra el mensaje del back y se puede reintentar.
- El material se genera **una única vez**: una vez generado, el formulario y el botón desaparecen y se muestra el material.

### RF-F7 · Panel del estudiante
- Saludo y botón destacado **Ver mis clases**.
- Resumen (`GET /students/me/insights`): clases, refuerzos resueltos y nota media; **refuerzos pendientes** con enlace para resolverlos; gráfico de **evolución de la nota** (últimas 10); calendario de sus clases; y **actividad reciente** en columna lateral fija.

### RF-F8 · Historial de clases (estudiante)
- La misma línea de tiempo que ve el docente (RF-F11) con sus clases; acciones por clase: **Ver clase** y **PDF**.

### RF-F9 · Detalle de la clase (estudiante)
- Tema, fecha, duración, contexto, palabras clave y PDF. **No** muestra las notas del docente.
- Si ya resolvió el material, la tarjeta **Tu nota** muestra la nota y la fecha en que lo resolvió.

### RF-F10 · Resolver el material (estudiante) — **CORE**
- Sin resolver: título, instrucciones, número de preguntas y botón **Resolver refuerzo**.
- Al pulsarlo, las preguntas aparecen **de una en una** (`ExerciseStepper`):
  - Barra de progreso «Pregunta N de M».
  - La frase con el hueco, que se rellena con la opción elegida.
  - **Rueda de opciones**: se elige deslizando (queda la opción centrada), tocando una opción o con las flechas del teclado. Se ven las 3 opciones y una mano animada invita a arrastrar hasta que el estudiante la usa; la rueda nunca elige sola.
  - **Anterior** / **Siguiente**; **Siguiente** se activa al elegir una opción.
- Las respuestas se envían **todas juntas al final** (**Enviar respuestas**), en un único intento.
- Resuelto: resumen del resultado (aciertos, fallos, comentario y recomendaciones) **antes** de las preguntas corregidas, cada una en su tarjeta con su respuesta y la correcta.

### RF-F11 · Línea de tiempo de clases (componente compartido)
- Tarjetas de resumen: clases realizadas (con horas totales), última clase (hace cuántos días), material resuelto (X de Y con barra) y nota media.
- Clases agrupadas por mes, de la más reciente a la más antigua, con tema, fecha, duración, contexto, palabras clave y estado del material (con su nota si está resuelto).
- **Filtros** por estado del material (Todas, Sin material, Pendiente, Resuelto) con su recuento, y **búsqueda por tema**; aviso si nada coincide.
- Las acciones de cada clase dependen de quién mira (`renderActions`).

### RF-F12 · Estados de cada pantalla
Toda pantalla que carga datos tiene tres estados además del normal:
- **Cargando**: texto «Cargando …» con el recurso concreto.
- **Error**: mensaje del back (o uno genérico en español) en un `role="alert"`.
- **Vacío**: mensaje propio («Aún no tienes clases realizadas.», «Aún no hay actividad.», …).

## Reglas de negocio en el cliente
- Los límites de negocio están en `src/domain/businessRules.ts`, con los mismos nombres y valores que el back: 1–15 ejercicios (5 por defecto), 1–20 palabras clave de máximo 50 caracteres, nota de 0 a 100 con 2 decimales, 10 actividades recientes y 10 notas en la evolución.
- La corrección es **siempre** del back: el estudiante nunca recibe las respuestas correctas antes de resolver.
- Generar y resolver material son acciones **de una sola vez**; la interfaz no las ofrece de nuevo y el back responde `409` si se intentan.

## Diseño
- Paleta de PractIcA como tokens de Tailwind (`ink`, `ocean`, `teal`, `mint`, `mist`); no se usan los colores por defecto salvo el rojo para errores.
- El texto pequeño sobre blanco usa `ink` u `ocean` (`teal` y `mint` no tienen contraste suficiente).
- Puntero de mano en todos los elementos interactivos. El logo es el componente `Brand`.
- Diseño adaptable: columnas laterales en pantallas anchas y una sola columna en móvil.

## Accesibilidad
- Formularios con errores asociados a cada campo (`aria-invalid`, `aria-describedby`).
- El color nunca es la única pista: los estados llevan etiqueta de texto y las respuestas corregidas, icono y descripción accesible («Tu respuesta, incorrecta»).
- Gráficos como `role="img"` con descripción y una tabla de datos para lectores de pantalla.
- La rueda de opciones es un `listbox` accesible con teclado (flechas) y `aria-activedescendant`; la animación respeta `prefers-reduced-motion`.
- Regiones con nombre (`aria-label`) para que lectores de pantalla y tests encuentren cada sección.

## Requerimientos no funcionales
- **Stack**: React 19, TypeScript estricto, Vite, React Router 8 (modo declarativo), Tailwind CSS v4.
- **Arquitectura**: por features (`auth`, `teacher`, `student`) que no se importan entre sí; lo compartido en `shared/` y los tipos y reglas en `domain/`. Ver [`CLAUDE.md`](../CLAUDE.md).
- **Servicios intercambiables**: cada servicio es una interfaz con implementación HTTP y en memoria; ambas cumplen el mismo **test de contrato**. `app/composition.ts` elige la implementación según `VITE_API_URL`.
- **Modo sin backend**: sin `VITE_API_URL`, el front usa los datos de `src/dev` (con LLM y corrección simulados y un retardo para ver los estados de carga). Usuarios ficticios: `docente@colegio.edu` / `Docente#2026` y `estudiante@colegio.edu` / `Estudiante#2026`.
- **API**: en desarrollo, Vite reenvía `/api` al back (mismo origen, sin CORS). Los componentes nunca llaman a la API directamente ni ven su formato (snake_case): los servicios HTTP convierten al dominio.
- **Seguridad**: `frontend/.env.local` solo tiene configuración pública (`VITE_*` llega al navegador); el token vive en `sessionStorage`.
- **Calidad**: TDD con Vitest y React Testing Library; ESLint con SonarJS (complejidad ≤ 15, sin literales repetidos, sin funciones idénticas, sin ternarios anidados); sin números mágicos; `tsc` estricto en el build. Flujos completos con Playwright (`e2e/`).

## Fuera de alcance
- Registro, recuperación de contraseña y perfil de usuario.
- Crear o editar clases, alumnos o el material generado.
- Otros tipos de actividad además de *completar la frase*.
- Reintentar un material ya resuelto.
- Internacionalización a otros idiomas de la interfaz.
- Modo oscuro.
