import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { handleServerError } from '@/lib/handle-server-error'
import { createUser, updateUser, type User } from '../data/users-api'
import { UsersActionDialog } from './users-action-dialog'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/handle-server-error', () => ({
  handleServerError: vi.fn(),
}))

vi.mock('../data/users-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/users-api')>()
  return {
    ...actual,
    createUser: vi.fn(),
    updateUser: vi.fn(),
  }
})

const user: User = {
  id: '57cc5265-a519-4bee-94de-52e440a6e4ca',
  email: 'admin@example.com',
  fullName: 'Admin User',
  isActive: true,
  isSuperuser: true,
  createdAt: '2026-08-31T02:00:00+00:00',
  updatedAt: '2026-08-31T02:00:00+00:00',
}

function renderDialog(props: React.ComponentProps<typeof UsersActionDialog>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <UsersActionDialog {...props} />
    </QueryClientProvider>
  )
}

describe('UsersActionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createUser).mockResolvedValue(user)
    vi.mocked(updateUser).mockResolvedValue(user)
  })

  it('requires the fields needed to create a user', async () => {
    const screen = await renderDialog({ open: true, onOpenChange: vi.fn() })

    await userEvent.click(screen.getByRole('button', { name: 'Save user' }))

    await expect.element(screen.getByText('Email is required.')).toBeVisible()
    await expect
      .element(screen.getByText('Password must be at least 8 characters long.'))
      .toBeVisible()
    expect(createUser).not.toHaveBeenCalled()
  })

  it('maps and creates a user through the API data layer', async () => {
    const onOpenChange = vi.fn()
    const screen = await renderDialog({ open: true, onOpenChange })

    await userEvent.fill(screen.getByLabelText('Full name'), '  Alex Morgan  ')
    await userEvent.fill(screen.getByLabelText('Email'), 'alex@example.com')
    await userEvent.fill(
      screen.getByRole('textbox', { name: 'Password', exact: true }),
      'password123'
    )
    await userEvent.fill(
      screen.getByLabelText('Confirm password'),
      'password123'
    )
    await userEvent.click(
      screen.getByRole('switch', { name: 'Administrator access' })
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save user' }))

    await vi.waitFor(() => {
      expect(createUser).toHaveBeenCalledWith({
        email: 'alex@example.com',
        fullName: 'Alex Morgan',
        password: 'password123',
        isActive: true,
        isSuperuser: true,
      })
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('fully updates a user and omits an unchanged password', async () => {
    const onOpenChange = vi.fn()
    const screen = await renderDialog({
      open: true,
      onOpenChange,
      currentRow: user,
    })

    await userEvent.fill(screen.getByLabelText('Full name'), '   ')
    await userEvent.click(
      screen.getByRole('switch', { name: 'Active account' })
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save user' }))

    await vi.waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith(user.id, {
        email: user.email,
        fullName: null,
        isActive: false,
        isSuperuser: true,
      })
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('requires password confirmation before an update', async () => {
    const screen = await renderDialog({
      open: true,
      onOpenChange: vi.fn(),
      currentRow: user,
    })

    await userEvent.fill(
      screen.getByRole('textbox', { name: 'Password', exact: true }),
      'newpassword'
    )
    await userEvent.fill(screen.getByLabelText('Confirm password'), 'different')
    await userEvent.click(screen.getByRole('button', { name: 'Save user' }))

    await expect
      .element(screen.getByText("Passwords don't match."))
      .toBeVisible()
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('keeps the dialog open when saving fails', async () => {
    const error = new Error('save failed')
    vi.mocked(updateUser).mockRejectedValue(error)
    const onOpenChange = vi.fn()
    const screen = await renderDialog({
      open: true,
      onOpenChange,
      currentRow: user,
    })

    await userEvent.click(screen.getByRole('button', { name: 'Save user' }))

    await vi.waitFor(() =>
      expect(handleServerError).toHaveBeenCalledWith(error)
    )
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
