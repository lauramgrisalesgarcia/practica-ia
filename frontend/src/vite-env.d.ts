/// <reference types="vite/client" />

interface ImportMetaEnv {
  // URL base de la API; si no se define, el front usa los servicios en memoria de src/dev
  readonly VITE_API_URL?: string
}
