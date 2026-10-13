// Nivel del Marco Común Europeo de Referencia (MCER)
export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export interface Student {
  id: string
  name: string
  email: string
  // Código ISO 639-1 del idioma natal (p. ej. "en")
  nativeLanguage: string
  level: Level
}
