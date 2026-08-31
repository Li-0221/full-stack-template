import '@/styles/index.css'
import { afterEach, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { LongText } from './long-text'

afterEach(() => {
  vi.restoreAllMocks()
  document.documentElement.classList.remove('dark')
})

it('exposes truncated text through a keyboard-focusable tooltip', async () => {
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(100)
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(200)

  const screen = await render(<LongText>Complete product name</LongText>)
  const trigger = screen.getByText('Complete product name').first()

  await userEvent.tab()

  await expect.element(trigger).toHaveFocus()
  await expect.element(screen.getByRole('tooltip')).toBeVisible()
})

it.each(['light', 'dark'] as const)(
  'constrains and wraps uninterrupted text in %s mode',
  async (theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(100)
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(1200)
    const longName = `LONG-NAME-${'X'.repeat(300)}`

    await render(<LongText>{longName}</LongText>)
    await userEvent.tab()

    const tooltip = document.querySelector<HTMLElement>(
      '[data-slot="tooltip-content"]'
    )
    expect(tooltip).not.toBeNull()
    await expect.element(tooltip!).toBeVisible()
    expect(tooltip!.getBoundingClientRect().width).toBeLessThanOrEqual(320)
    expect(getComputedStyle(tooltip!).overflowWrap).toBe('anywhere')
  }
)

it('supports clamping long text to two lines', async () => {
  const screen = await render(
    <LongText lines={2}>A product name that can wrap onto two lines</LongText>
  )

  await expect
    .element(screen.getByText('A product name that can wrap onto two lines'))
    .toHaveClass('line-clamp-2')
})
