// Mensaje para mostrar de un error capturado; si lo lanzado no es un Error, el texto alternativo
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}
