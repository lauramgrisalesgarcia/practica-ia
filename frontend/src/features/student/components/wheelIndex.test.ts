import { indexAtScroll, stepIndex } from './wheelIndex'

describe('indexAtScroll', () => {
  it('devuelve la opción centrada según el desplazamiento', () => {
    expect(indexAtScroll(0, 56, 3)).toBe(0)
    expect(indexAtScroll(60, 56, 3)).toBe(1)
  })

  it('no se sale de las opciones', () => {
    expect(indexAtScroll(-20, 56, 3)).toBe(0)
    expect(indexAtScroll(500, 56, 3)).toBe(2)
  })
})

describe('stepIndex', () => {
  it('sin opción elegida empieza por la primera', () => {
    expect(stepIndex(-1, 1, 3)).toBe(0)
    expect(stepIndex(-1, -1, 3)).toBe(0)
  })

  it('avanza o retrocede sin salirse de las opciones', () => {
    expect(stepIndex(0, 1, 3)).toBe(1)
    expect(stepIndex(2, 1, 3)).toBe(2)
    expect(stepIndex(0, -1, 3)).toBe(0)
  })
})
