# CLAUDE.md

Guía para Claude Code al trabajar en este repositorio.

## Stack tecnológico

### Frontend
- **React** + **TypeScript** (modo `strict`)
- **Vite** como bundler y dev server
- **Tailwind CSS v4** (configuración CSS-first con `@import "tailwindcss";` y `@theme`, sin `tailwind.config.js`; plugin `@tailwindcss/vite`)
- **Vitest** + **React Testing Library** para tests unitarios y de componentes

### Backend
- **Python** con **FastAPI**
- **PostgreSQL** como base de datos
- **pytest** (+ `httpx`/`TestClient`) para tests del backend

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

## Convenciones

- TypeScript sin `any` implícito; tipar props y respuestas de la API.
- Python con type hints y modelos Pydantic para request/response.
- Los tests viven junto al código (`*.test.ts(x)`) en frontend y en `tests/` en backend; E2E en `e2e/`.
- La BD de tests es independiente de la de desarrollo.

## Comandos

> Se completarán cuando se cree la estructura del proyecto.

```bash
# Frontend
npm run dev
npm run test        # Vitest
npm run build

# Backend
uvicorn app.main:app --reload
pytest

# E2E
npx playwright test
```
