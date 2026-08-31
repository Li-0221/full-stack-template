import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { TimePicker } from './time-picker'

describe('TimePicker', () => {
  it('uses a seconds-aware time input', async () => {
    const onValueChange = vi.fn<(value: string) => void>()
    const screen = await render(
      <TimePicker
        aria-label='Start time'
        value='09:00:00'
        onValueChange={onValueChange}
      />
    )
    const input = screen.getByLabelText('Start time')

    await expect.element(input).toHaveAttribute('type', 'time')
    await expect.element(input).toHaveAttribute('step', '1')
    await userEvent.fill(input, '10:30')

    expect(onValueChange).toHaveBeenLastCalledWith('10:30:00')
  })
})
