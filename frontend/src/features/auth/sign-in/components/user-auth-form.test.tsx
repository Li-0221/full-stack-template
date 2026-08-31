import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import { UserAuthForm } from './user-auth-form'

const FORM_MESSAGES = {
  emailEmpty: 'Please enter your email.',
  passwordEmpty: 'Please enter your password.',
  passwordShort: 'Password must be at least 7 characters long.',
} as const

const { createSessionMock, establishSessionMock, navigate } = vi.hoisted(
  () => ({
    createSessionMock: vi.fn(),
    establishSessionMock: vi.fn(),
    navigate: vi.fn(),
  })
)
const tokens = {
  accessToken: 'server-access-token',
  accessExpiresAt: Date.now() + 15 * 60 * 1000,
  refreshToken: 'server-refresh-token',
  refreshExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
}

vi.mock('@/features/auth/data/session', () => ({
  createSession: createSessionMock,
}))

vi.mock('@/stores/auth-store', () => ({
  getPersistedAccessToken: () => '',
  getPersistedRefreshToken: () => '',
  isPersistedAuthSessionCurrent: () => true,
  useAuthStore: Object.assign(
    () => ({ auth: { establishSession: establishSessionMock } }),
    {
      getState: () => ({
        auth: {
          accessToken: '',
          expire: vi.fn(),
          refreshSession: vi.fn(),
          refreshToken: '',
          sessionEpoch: 0,
        },
      }),
    }
  ),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
    Link: ({
      children,
      to,
      className,
      ...rest
    }: {
      children?: React.ReactNode
      to: string
      className?: string
    }) => (
      <a href={to} className={className} {...rest}>
        {children}
      </a>
    ),
  }
})

describe('UserAuthForm', () => {
  describe('Rendering without redirectTo', () => {
    let screen: RenderResult
    let emailInput: Locator
    let passwordInput: Locator
    let signInButton: Locator

    beforeEach(async () => {
      vi.clearAllMocks()
      createSessionMock.mockResolvedValue(tokens)
      screen = await render(<UserAuthForm />)
      emailInput = screen.getByRole('textbox', { name: /^Email$/i })
      passwordInput = screen.getByLabelText(/^Password$/i)
      signInButton = screen.getByRole('button', { name: /^Sign in$/i })
    })

    it('shows validation messages when submitting empty form', async () => {
      await userEvent.click(signInButton)

      await expect
        .element(screen.getByText(FORM_MESSAGES.emailEmpty))
        .toBeInTheDocument()
      await expect
        .element(screen.getByText(FORM_MESSAGES.passwordEmpty))
        .toBeInTheDocument()
    })

    it('authenticates and navigates to default route on success', async () => {
      await userEvent.fill(emailInput, 'a@b.com')
      await userEvent.fill(passwordInput, '1234567')

      await userEvent.click(signInButton)

      await vi.waitFor(() =>
        expect(establishSessionMock).toHaveBeenCalledOnce()
      )
      expect(createSessionMock).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: '1234567',
      })
      expect(establishSessionMock).toHaveBeenCalledWith(tokens)

      await vi.waitFor(() =>
        expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true })
      )
    })
  })

  it('navigates to redirectTo when provided', async () => {
    vi.clearAllMocks()
    createSessionMock.mockResolvedValue(tokens)

    const { getByRole, getByLabelText } = await render(
      <UserAuthForm redirectTo='/settings' />
    )

    await userEvent.fill(getByRole('textbox', { name: /Email/i }), 'a@b.com')
    await userEvent.fill(getByLabelText('Password'), '1234567')

    await userEvent.click(getByRole('button', { name: /Sign in/i }))

    await vi.waitFor(() => expect(establishSessionMock).toHaveBeenCalledOnce())

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/settings',
        replace: true,
      })
    )
  })
})
