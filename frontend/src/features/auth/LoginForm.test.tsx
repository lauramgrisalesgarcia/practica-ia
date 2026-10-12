import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'

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

    await user.type(emailInput, 'docente@colegio.edu')
    await user.type(passwordInput, VALID_PASSWORD)
    await user.click(submitButton)

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith({ email: 'docente@colegio.edu', password: VALID_PASSWORD })
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

  describe('requisitos de la contraseña', () => {
    it.each([
      ['Sec#1ab', /al menos 8 caracteres/i],
      ['secreto#123', /una letra mayúscula/i],
      ['SECRETO#123', /una letra minúscula/i],
      ['Secreto#abc', /un número/i],
      ['Secreto1234', /un carácter especial/i],
    ])('rechaza %s indicando el requisito incumplido', async (password, requirement) => {
      const { user, onSubmit, emailInput, passwordInput, submitButton } = setup()

      await user.type(emailInput, 'docente@colegio.edu')
      await user.type(passwordInput, password)
      await user.click(submitButton)

      expect(screen.getByText(requirement)).toBeInTheDocument()
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('indica todos los requisitos incumplidos a la vez', async () => {
      const { user, emailInput, passwordInput, submitButton } = setup()

      await user.type(emailInput, 'docente@colegio.edu')
      await user.type(passwordInput, 'abc')
      await user.click(submitButton)

      expect(screen.getByText(/al menos 8 caracteres/i)).toBeInTheDocument()
      expect(screen.getByText(/una letra mayúscula/i)).toBeInTheDocument()
      expect(screen.getByText(/un número/i)).toBeInTheDocument()
      expect(screen.getByText(/un carácter especial/i)).toBeInTheDocument()
      expect(screen.queryByText(/una letra minúscula/i)).not.toBeInTheDocument()
    })
  })
})
