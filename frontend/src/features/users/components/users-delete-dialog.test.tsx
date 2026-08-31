import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { handleServerError } from '@/lib/handle-server-error'
import { deleteUser, type User } from '../data/users-api'
import { UsersDeleteDialog } from './users-delete-dialog'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/handle-server-error', () => ({
  handleServerError: vi.fn(),
}))

vi.mock('../data/users-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/users-api')>()
  return { ...actual, deleteUser: vi.fn() }
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

function renderDialog(onOpenChange = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <UsersDeleteDialog open onOpenChange={onOpenChange} currentRow={user} />
    </QueryClientProvider>
  )
}

describe('UsersDeleteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(deleteUser).mockResolvedValue()
  })

  it('requires the exact email before deletion', async () => {
    const screen = await renderDialog()
    const deleteButton = screen.getByRole('button', { name: 'Delete user' })

    await expect.element(deleteButton).toBeDisabled()
    await userEvent.fill(
      screen.getByRole('textbox', { name: 'Type the email to confirm' }),
      'wrong@example.com'
    )
    await expect.element(deleteButton).toBeDisabled()
  })

  it('deletes the user and closes after success', async () => {
    const onOpenChange = vi.fn()
    const screen = await renderDialog(onOpenChange)

    await userEvent.fill(
      screen.getByRole('textbox', { name: 'Type the email to confirm' }),
      user.email
    )
    await userEvent.click(screen.getByRole('button', { name: 'Delete user' }))

    await vi.waitFor(() => expect(deleteUser).toHaveBeenCalledWith(user.id))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('keeps the dialog open when deletion fails', async () => {
    const error = new Error('delete failed')
    vi.mocked(deleteUser).mockRejectedValue(error)
    const onOpenChange = vi.fn()
    const screen = await renderDialog(onOpenChange)

    await userEvent.fill(
      screen.getByRole('textbox', { name: 'Type the email to confirm' }),
      user.email
    )
    await userEvent.click(screen.getByRole('button', { name: 'Delete user' }))

    await vi.waitFor(() =>
      expect(handleServerError).toHaveBeenCalledWith(error)
    )
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
