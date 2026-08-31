import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { SignOutDialog } from './sign-out-dialog'

const { handleServerError, navigate, reset, revokeSession } = vi.hoisted(
  () => ({
    handleServerError: vi.fn(),
    navigate: vi.fn(),
    reset: vi.fn(),
    revokeSession: vi.fn(),
  })
)

const MOCK_HREF = 'https://app.test/dashboard?tab=1'

vi.mock('@/stores/auth-store', () => ({
  getPersistedAccessToken: () => '',
  getPersistedRefreshToken: () => 'refresh-token',
  isPersistedAuthSessionCurrent: () => true,
  useAuthStore: Object.assign(
    () => ({ auth: { refreshToken: 'refresh-token', reset } }),
    {
      getState: () => ({
        auth: {
          accessToken: '',
          expire: vi.fn(),
          refreshSession: vi.fn(),
          refreshToken: 'refresh-token',
          sessionEpoch: 0,
        },
      }),
    }
  ),
}))

vi.mock('@/features/auth/data/session', () => ({ revokeSession }))
vi.mock('@/lib/handle-server-error', () => ({ handleServerError }))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
    useLocation: () => ({ href: MOCK_HREF }),
  }
})

describe('SignOutDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    revokeSession.mockResolvedValue(undefined)
  })

  it('calls auth.reset and navigates to sign-in with current location as redirect', async () => {
    const { getByRole } = await render(
      <SignOutDialog open onOpenChange={vi.fn()} />
    )

    await userEvent.click(getByRole('button', { name: /^Sign out$/i }))

    await vi.waitFor(() => expect(revokeSession).toHaveBeenCalledOnce())
    expect(revokeSession).toHaveBeenCalledWith('refresh-token')
    await vi.waitFor(() => expect(reset).toHaveBeenCalledOnce())
    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/sign-in',
        search: { redirect: MOCK_HREF },
        replace: true,
      })
    )
  })

  it('does not call reset or navigate when Cancel is clicked', async () => {
    const { getByRole } = await render(
      <SignOutDialog open onOpenChange={vi.fn()} />
    )

    await userEvent.click(getByRole('button', { name: /^Cancel$/i }))

    expect(reset).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('clears the local session when server logout fails', async () => {
    const error = new Error('Network unavailable')
    revokeSession.mockRejectedValue(error)
    const { getByRole } = await render(
      <SignOutDialog open onOpenChange={vi.fn()} />
    )

    await userEvent.click(getByRole('button', { name: /^Sign out$/i }))

    await vi.waitFor(() =>
      expect(handleServerError).toHaveBeenCalledWith(error)
    )
    expect(reset).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledOnce()
  })
})
