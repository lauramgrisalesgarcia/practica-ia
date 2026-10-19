// Los colores salen siempre de la paleta de PractIcA (tokens de src/index.css), nunca escritos a mano
const sources = import.meta.glob(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

// Clases de Tailwind con un color arbitrario: bg-[#85a4af], text-[rgb(…)], border-[hsl(…)]…
const ARBITRARY_COLOR = /\b[a-z-]+-\[(?:#[0-9a-f]{3,8}|rgba?\(|hsla?\()/gi

describe('paleta de colores', () => {
  it('no hay colores escritos a mano en el código', () => {
    const found = Object.entries(sources).flatMap(([file, code]) =>
      [...code.matchAll(ARBITRARY_COLOR)].map((match) => `${file}: ${match[0]}`),
    )

    expect(found).toEqual([])
  })
})
