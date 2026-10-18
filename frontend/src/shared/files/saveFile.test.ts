import { saveFile } from './saveFile'

const BLOB_URL = 'blob:http://localhost/123'

// jsdom no implementa URL.createObjectURL ni revokeObjectURL
const createObjectURL = vi.fn().mockReturnValue(BLOB_URL)
const revokeObjectURL = vi.fn()

describe('saveFile', () => {
  beforeEach(() => {
    Object.assign(URL, { createObjectURL, revokeObjectURL })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Reflect.deleteProperty(URL, 'createObjectURL')
    Reflect.deleteProperty(URL, 'revokeObjectURL')
  })

  it('descarga el archivo con su nombre y libera la URL temporal', () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.href).toBe(BLOB_URL)
      expect(this.download).toBe('restaurante-a2.pdf')
      expect(document.body.contains(this)).toBe(true)
    })

    saveFile({ blob, filename: 'restaurante-a2.pdf' })

    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith(BLOB_URL)
    expect(document.querySelector('a[download]')).toBeNull()
  })
})
