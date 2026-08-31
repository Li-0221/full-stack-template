import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { SecurityForm } from './security-form'

const { changePasswordMock, navigateMock, resetAuthMock } = vi.hoisted(() => ({
  changePasswordMock: vi.fn(),
  navigateMock: vi.fn(),
  resetAuthMock: vi.fn(),
}))

vi.mock('../data/current-user-api', () => ({
  changeCurrentUserPassword: changePasswordMock,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({ auth: { reset: resetAuthMock } }),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return { ...actual, useNavigate: () => navigateMock }
})

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <SecurityForm />
    </QueryClientProvider>
  )
}

describe('SecurityForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    changePasswordMock.mockResolvedValue(undefined)
  })

  it('changes the password and clears the revoked session', async () => {
    const screen = await renderForm()

    await userEvent.fill(
      screen.getByLabelText('Current password'),
      'current-password'
    )
    await userEvent.fill(
      screen.getByRole('textbox', { name: 'New password', exact: true }),
      'new-password'
    )
    await userEvent.fill(
      screen.getByLabelText('Confirm new password'),
      'new-password'
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Update password' })
    )

    await vi.waitFor(() => {
      expect(changePasswordMock.mock.calls[0]?.[0]).toEqual({
        currentPassword: 'current-password',
        newPassword: 'new-password',
      })
    })
    await vi.waitFor(() => expect(resetAuthMock).toHaveBeenCalledOnce())
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/sign-in',
      replace: true,
    })
  })

  it('rejects a mismatched confirmation before calling the API', async () => {
    const screen = await renderForm()

    await userEvent.fill(
      screen.getByLabelText('Current password'),
      'current-password'
    )
    await userEvent.fill(
      screen.getByRole('textbox', { name: 'New password', exact: true }),
      'new-password'
    )
    await userEvent.fill(
      screen.getByLabelText('Confirm new password'),
      'different-password'
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Update password' })
    )

    await expect
      .element(screen.getByText('Passwords do not match.'))
      .toBeInTheDocument()
    expect(changePasswordMock).not.toHaveBeenCalled()
  })
})
