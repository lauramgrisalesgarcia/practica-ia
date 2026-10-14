import { createSessionExpiry } from './sessionExpiry'

describe('sessionExpiry', () => {
  it('avisa a todos los que escuchan', () => {
    const expiry = createSessionExpiry()
    const first = vi.fn()
    const second = vi.fn()
    expiry.subscribe(first)
    expiry.subscribe(second)

    expiry.notify()

    expect(first).toHaveBeenCalledOnce()
    expect(second).toHaveBeenCalledOnce()
  })

  it('deja de avisar a quien se da de baja', () => {
    const expiry = createSessionExpiry()
    const listener = vi.fn()
    const unsubscribe = expiry.subscribe(listener)

    unsubscribe()
    expiry.notify()

    expect(listener).not.toHaveBeenCalled()
  })
})
