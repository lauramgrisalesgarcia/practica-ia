import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('muestra la pantalla de inicio de sesión', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: /iniciar sesión/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
  })
})
