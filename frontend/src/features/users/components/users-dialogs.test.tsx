import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { User } from '../data/users-api'
import { UsersDialogs } from './users-dialogs'
import { UsersPrimaryButtons } from './users-primary-buttons'
import { UsersProvider, useUsers } from './users-provider'

const user: User = {
  id: '57cc5265-a519-4bee-94de-52e440a6e4ca',
  email: 'alex@example.com',
  fullName: 'Alex Morgan',
  isActive: true,
  isSuperuser: false,
  createdAt: '2026-08-31T02:00:00+00:00',
  updatedAt: '2026-08-31T02:00:00+00:00',
}

function Actions() {
  const { setDialog } = useUsers()
  return (
    <>
      <UsersPrimaryButtons />
      <button onClick={() => setDialog({ type: 'edit', user })}>
        Edit Alex
      </button>
      <button onClick={() => setDialog({ type: 'delete', user })}>
        Delete Alex
      </button>
    </>
  )
}

function renderDialogs() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <UsersProvider>
        <Actions />
        <UsersDialogs />
      </UsersProvider>
    </QueryClientProvider>
  )
}

describe('UsersDialogs', () => {
  it('discards edits on cancel and keeps the add form independent', async () => {
    const screen = await renderDialogs()
    await userEvent.click(screen.getByRole('button', { name: 'Edit Alex' }))
    await expect
      .element(screen.getByLabelText('Full name'))
      .toHaveValue(user.fullName)
    await userEvent.fill(screen.getByLabelText('Full name'), 'Unsaved change')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'Add user', exact: true })
    )
    await expect.element(screen.getByLabelText('Full name')).toHaveValue('')
    await expect.element(screen.getByLabelText('Email')).toHaveValue('')
    await userEvent.keyboard('{Escape}')
    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Edit Alex' }))
    await expect
      .element(screen.getByLabelText('Full name'))
      .toHaveValue(user.fullName)
  })

  it('clears deletion confirmation when the dialog is reopened', async () => {
    const screen = await renderDialogs()
    await userEvent.click(screen.getByRole('button', { name: 'Delete Alex' }))
    await userEvent.fill(
      screen.getByLabelText('Type the email to confirm'),
      user.email
    )
    await expect
      .element(screen.getByRole('button', { name: 'Delete user' }))
      .toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete Alex' }))
    await expect
      .element(screen.getByLabelText('Type the email to confirm'))
      .toHaveValue('')
    await expect
      .element(screen.getByRole('button', { name: 'Delete user' }))
      .toBeDisabled()
  })
})
