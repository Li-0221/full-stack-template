import '@/styles/index.css'
import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { DataTableRowActionsMenu } from './row-actions-menu'

describe('DataTableRowActionsMenu', () => {
  it('opens on mouse hover and retains the standard click interaction', async () => {
    const screen = await render(
      <>
        <input aria-label='Current field' />
        <DataTableRowActionsMenu label='Open actions for Example'>
          <DropdownMenuItem>Edit</DropdownMenuItem>
        </DataTableRowActionsMenu>
      </>
    )
    const trigger = screen.getByRole('button', {
      name: 'Open actions for Example',
    })

    await expect.element(screen.getByText('Edit')).not.toBeInTheDocument()
    const currentField = screen.getByRole('textbox', { name: 'Current field' })
    await userEvent.click(currentField)
    await userEvent.hover(trigger)
    await expect.element(screen.getByText('Edit')).toBeVisible()
    await expect.element(currentField).toHaveFocus()
    await userEvent.click(trigger)
    await expect.element(screen.getByText('Edit')).toBeVisible()

    await userEvent.keyboard('{Escape}')
    await expect.element(screen.getByText('Edit')).not.toBeInTheDocument()
    await userEvent.click(trigger)
    await expect.element(screen.getByText('Edit')).toBeVisible()
  })
})
