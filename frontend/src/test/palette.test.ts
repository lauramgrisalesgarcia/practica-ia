import { readFileSync } from 'node:fs'

// Los colores salen siempre de la paleta de PractIcA (tokens de src/index.css), nunca escritos a mano
const sources = import.meta.glob(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

// Clases de Tailwind con un color arbitrario: bg-[#85a4af], text-[rgb(…)], border-[hsl(…)]…
const ARBITRARY_COLOR = /\b[a-z-]+-\[(?:#[0-9a-f]{3,8}|rgba?\(|hsla?\()/gi

// Tokens de la marca (@theme de index.css) con sus colores aprobados
const BRAND_TOKENS: Record<string, string> = {
  ink: '#852e5f',
  ocean: '#225d91',
  teal: '#3f84b0',
  mint: '#e3b7d7',
  mist: '#edccdd',
}

describe('paleta de colores', () => {
  it('los tokens de la marca usan la paleta aprobada', () => {
    // Vitest no procesa el CSS (css: false), así que se lee el fichero tal cual desde frontend/
    const indexCss = readFileSync('src/index.css', 'utf8')
    const tokens = Object.fromEntries(
      [...indexCss.matchAll(/--color-([a-z]+):\s*(#[0-9a-f]{6});/gi)].map((match) => [match[1], match[2].toLowerCase()]),
    )

    expect(tokens).toEqual(BRAND_TOKENS)
  })

  it('no hay colores escritos a mano en el código', () => {
    const found = Object.entries(sources).flatMap(([file, code]) =>
      [...code.matchAll(ARBITRARY_COLOR)].map((match) => `${file}: ${match[0]}`),
    )

    expect(found).toEqual([])
  })
})
