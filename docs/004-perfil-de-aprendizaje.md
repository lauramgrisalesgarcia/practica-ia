# 004 · Perfil de aprendizaje del estudiante

**Estado:** planificado, pendiente de implementar.
**Rama de trabajo:** `feature/perfil-aprendizaje` (desde `main`).

## 1. Objetivo

Mostrar al **docente**, en el perfil de cada estudiante, su porcentaje de dominio por skill (habilidad lingüística) del nivel MCER del alumno, como **barras de progreso**. Se calcula solo con los resultados de los materiales de refuerzo que ya se guardan, sin llamadas a ningún LLM, así que no tiene coste.

## 2. Decisiones

| Tema | Decisión |
|---|---|
| Visibilidad | Solo el docente, en el detalle del estudiante. El estudiante **no** ve su perfil por ahora. |
| Catálogo | Skills agrupadas por nivel MCER, en datos versionados (JSON por nivel). A1 completo, A2 parcial. Añadir un nivel no requiere cambiar código. |
| Etiquetado | Cada ejercicio tiene una **skill principal** y, opcionalmente, **skills secundarias**. Se guarda como relación muchos a muchos. |
| Cálculo | Por skill: aciertos / respuestas. Una pregunta con varias skills **cuenta completa** para cada una. |
| Fiabilidad | Menos de 3 respuestas: «sin datos suficientes» (no se muestra el %). De 3 a 5: «preliminar». 6 o más: «orientativo». Los umbrales viven en `businessRules.ts` y en el backend, con los mismos valores. |
| Materiales antiguos | Sin etiquetas: no entran en el perfil (aparecen como «sin clasificar»). Pendiente de decidir si se regeneran en el seed. |
| Presentación | Barras de progreso accesibles (`role="progressbar"`, `aria-valuenow`, texto con el número de respuestas y la fiabilidad), más una tabla equivalente. El color nunca es la única pista. Solo tokens de la paleta. |

## 3. Modelo de datos (propuesta)

- **Catálogo de skills**: `backend/app/domain/skills/<nivel>.json` con `id`, `nombre`, `nivel` y palabras de referencia para la asignación. Validación al cargar: ids únicos y nivel válido.
- **Relación ejercicio ↔ skill**: tabla `exercise_skills` (ejercicio, skill, papel `principal` | `secundaria`). Migración de Alembic y regeneración de `migrations/001-esquema-base-de-datos.sql`.
- El nivel del estudiante ya existe en el dominio (nivel MCER).

## 4. API (contrato primero, en `docs/openapi.yaml`)

`GET /teachers/me/students/{student_id}/profile`

```json
{
  "level": "A1",
  "skills": [
    {
      "id": "pronombres-sujeto",
      "name": "Pronombres personales de sujeto",
      "answered": 7,
      "correct": 5,
      "percent": 71,
      "reliability": "indicative",
      "shared_questions": 2
    }
  ]
}
```

- `percent` es `null` si la fiabilidad es «sin datos suficientes».
- `reliability`: `insufficient` | `preliminary` | `indicative`.
- Solo accesible por el docente propietario del estudiante. Un recurso ajeno responde `404`.

## 5. Orden de implementación (TDD)

1. **OpenAPI**: añadir el endpoint. El test de contrato falla (rojo).
2. **Dominio**: función pura `build_profile(nivel, catálogo, respuestas)` con sus tests unitarios: acierto, fallo, pregunta compartida, sin datos, cada umbral de fiabilidad.
3. **Catálogo**: cargador del JSON con validación, y tests.
4. **Persistencia**: migración, repository que devuelve entidades, tests contra la BD de test.
5. **Generación simulada**: asignar skills a cada ejercicio a partir de las palabras de referencia, con tests.
6. **Use case** `GetStudentProfile`: solo docente propietario, con fakes y sin BD.
7. **Transporte**: router, schemas y tests con `TestClient`.
8. **Frontend**: interfaz del servicio + implementación mock + HTTP + test de contrato. Componente de barras como función pura de props, con tests de React Testing Library. Integración en el detalle de estudiante del docente.
9. **E2E**: el docente ve el perfil; el estudiante no tiene acceso.

## 6. Preguntas abiertas

1. ¿Quién define la lista definitiva de skills de A1 y A2?
2. ¿Los materiales ya generados se regeneran en el seed o se muestran como «sin clasificar»?
3. ¿Se aceptan los umbrales de fiabilidad (3 y 6)?
4. ¿Quién escribe las palabras de referencia de cada skill, que sirven para asignar los ejercicios?
5. ¿El estudiante verá su perfil en el futuro? (Por ahora, no.)

## 7. Riesgos

- Asignar la skill por palabra puede equivocarse: una palabra no siempre identifica lo que se evalúa.
- Con pocas respuestas, el porcentaje es poco fiable; por eso se muestra la fiabilidad junto a cada barra.
