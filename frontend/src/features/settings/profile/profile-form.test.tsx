import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { ProfileForm } from './profile-form'

const { updateCurrentUserMock } = vi.hoisted(() => ({
  updateCurrentUserMock: vi.fn(),
}))

vi.mock('@/features/auth/data/current-user-api', () => ({
  currentUserQueryKey: ['current-user'],
  updateCurrentUser: updateCurrentUserMock,
}))

const user = {
  id: '57cc5265-a519-4bee-94de-52e440a6e4ca',
  email: 'admin@example.com',
  fullName: 'Admin User',
  isActive: true,
  isSuperuser: true,
  createdAt: '2026-08-31T02:00:00+00:00',
  updatedAt: '2026-08-31T02:00:00+00:00',
}

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileForm user={user} />
    </QueryClientProvider>
  )
}

describe('ProfileForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateCurrentUserMock.mockResolvedValue({ ...user, fullName: null })
  })

  it('sends an empty name as an explicit null', async () => {
    const screen = await renderForm()

    await userEvent.clear(screen.getByRole('textbox', { name: 'Name' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    await vi.waitFor(() => {
      expect(updateCurrentUserMock.mock.calls[0]?.[0]).toEqual({
        email: user.email,
        fullName: null,
      })
    })
  })
})
