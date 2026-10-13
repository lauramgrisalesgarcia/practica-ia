import { languageName } from './languageName'

describe('languageName', () => {
  it.each([
    ['en', 'inglés'],
    ['de', 'alemán'],
    ['fr', 'francés'],
  ])('traduce %s a %s', (code, name) => {
    expect(languageName(code)).toBe(name)
  })
})
