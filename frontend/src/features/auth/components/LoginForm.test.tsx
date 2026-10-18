import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'

const TEACHER_EMAIL = 'docente@colegio.edu'

const VALID_PASSWORD = 'Secreto#123'

function setup(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const user = userEvent.setup()
  render(<LoginForm onSubmit={onSubmit} />)
  return {
    user,
    onSubmit,
    emailInput: screen.getByLabelText(/correo electrónico/i),
    passwordInput: screen.getByLabelText(/contraseña/i),
    submitButton: screen.getByRole('button', { name: /iniciar sesión/i }),
  }
}

describe('LoginForm', () => {
  it('muestra los campos de correo y contraseña y el botón de iniciar sesión', () => {
    const { emailInput, passwordInput, submitButton } = setup()

    expect(emailInput).toHaveAttribute('type', 'email')
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(submitButton).toBeInTheDocument()
  })

  it('no ofrece opción de registro de nuevos usuarios', () => {
    setup()

    expect(screen.queryByText(/regístrate|registrarse|crear cuenta/i)).not.toBeInTheDocument()
  })

  it('muestra errores y no envía si los campos están vacíos', async () => {
    const { user, onSubmit, submitButton } = setup()

    await user.click(submitButton)

    expect(screen.getByText(/el correo es obligatorio/i)).toBeInTheDocument()
    expect(screen.getByText(/la contraseña es obligatoria/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('muestra un error si el correo no tiene un formato válido', async () => {
    const { user, onSubmit, emailInput, passwordInput, submitButton } = setup()

    await user.type(emailInput, 'correo-invalido')
    await user.type(passwordInput, VALID_PASSWORD)
    await user.click(submitButton)

    expect(screen.getByText(/correo no es válido/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envía el correo y la contraseña cuando los datos son válidos', async () => {
    const { user, onSubmit, emailInput, passwordInput, submitButton } = setup()

    await user.type(emailInput, TEACHER_EMAIL)
    await user.type(passwordInput, VALID_PASSWORD)
    await user.click(submitButton)

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith({ email: TEACHER_EMAIL, password: VALID_PASSWORD })
  })

  it('deshabilita el botón mientras se procesa el inicio de sesión', async () => {
    let resolve!: () => void
    const onSubmit = vi.fn(() => new Promise<void>((r) => (resolve = r)))
    const { user, emailInput, passwordInput, submitButton } = setup(onSubmit)

    await user.type(emailInput, 'estudiante@colegio.edu')
    await user.type(passwordInput, VALID_PASSWORD)
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
    resolve()
    expect(await screen.findByRole('button', { name: /iniciar sesión/i })).toBeEnabled()
  })

  it('muestra el mensaje de error si las credenciales son incorrectas', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Credenciales incorrectas'))
    const { user, emailInput, passwordInput, submitButton } = setup(onSubmit)

    await user.type(emailInput, 'estudiante@colegio.edu')
    await user.type(passwordInput, VALID_PASSWORD)
    await user.click(submitButton)

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales incorrectas')
  })

  it('no aplica reglas de complejidad a la contraseña al iniciar sesión', async () => {
    const { user, onSubmit, emailInput, passwordInput, submitButton } = setup()

    await user.type(emailInput, TEACHER_EMAIL)
    await user.type(passwordInput, 'abc')
    await user.click(submitButton)

    expect(onSubmit).toHaveBeenCalledWith({ email: TEACHER_EMAIL, password: 'abc' })
  })
})
