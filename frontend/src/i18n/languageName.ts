const languageNames = new Intl.DisplayNames(['es'], { type: 'language' })

// Nombre en español de un código de idioma ISO 639-1 (p. ej. "en" → "inglés")
export function languageName(code: string): string {
  return languageNames.of(code) ?? code
}
