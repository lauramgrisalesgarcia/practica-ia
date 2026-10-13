import { parseKeywords, validateMaterialForm } from './materialForm'

describe('parseKeywords', () => {
  it('separa por comas y quita los espacios sobrantes', () => {
    expect(parseKeywords('  la carta ,quisiera,  la   cuenta ')).toEqual(['la carta', 'quisiera', 'la cuenta'])
  })

  it('descarta las entradas vacías', () => {
    expect(parseKeywords('la carta,, ,quisiera,')).toEqual(['la carta', 'quisiera'])
  })

  it('quita los duplicados sin distinguir mayúsculas y conserva el primero', () => {
    expect(parseKeywords('Quisiera, la carta, quisiera')).toEqual(['Quisiera', 'la carta'])
  })
})

describe('validateMaterialForm', () => {
  const VALID = { exerciseCount: '5', keywords: 'la carta, quisiera' }

  it('acepta un formulario válido y devuelve la petición', () => {
    expect(validateMaterialForm(VALID)).toEqual({
      ok: true,
      request: { activityType: 'complete_sentence', exerciseCount: 5, keywords: ['la carta', 'quisiera'] },
    })
  })

  it.each(['0', '16', '2.5', '', 'abc'])('rechaza %j ejercicios', (exerciseCount) => {
    expect(validateMaterialForm({ ...VALID, exerciseCount })).toEqual({
      ok: false,
      errors: { exerciseCount: 'El número de ejercicios debe estar entre 1 y 15' },
    })
  })

  it.each(['1', '15'])('acepta %s ejercicios', (exerciseCount) => {
    expect(validateMaterialForm({ ...VALID, exerciseCount })).toMatchObject({ ok: true })
  })

  it('exige al menos una palabra clave', () => {
    expect(validateMaterialForm({ ...VALID, keywords: ' , ' })).toEqual({
      ok: false,
      errors: { keywords: 'Indica al menos una palabra clave' },
    })
  })

  it('admite como máximo 20 palabras clave', () => {
    const keywords = Array.from({ length: 21 }, (_, i) => `palabra ${i}`).join(',')

    expect(validateMaterialForm({ ...VALID, keywords })).toEqual({
      ok: false,
      errors: { keywords: 'Indica como máximo 20 palabras clave' },
    })
  })

  it('admite palabras clave de hasta 50 caracteres', () => {
    expect(validateMaterialForm({ ...VALID, keywords: 'a'.repeat(50) })).toMatchObject({ ok: true })
    expect(validateMaterialForm({ ...VALID, keywords: 'a'.repeat(51) })).toEqual({
      ok: false,
      errors: { keywords: 'Cada palabra clave puede tener como máximo 50 caracteres' },
    })
  })

  it('informa de todos los errores a la vez', () => {
    expect(validateMaterialForm({ exerciseCount: '0', keywords: '' })).toEqual({
      ok: false,
      errors: {
        exerciseCount: 'El número de ejercicios debe estar entre 1 y 15',
        keywords: 'Indica al menos una palabra clave',
      },
    })
  })
})
