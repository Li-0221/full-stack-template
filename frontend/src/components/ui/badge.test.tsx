import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { Badge } from './badge'

describe('Badge', () => {
  it.each([
    ['primary', 'bg-primary/10', 'text-foreground'],
    ['success', 'bg-success/10', 'text-success'],
    ['warning', 'bg-warning/15', 'text-warning'],
    ['destructive', 'bg-destructive/10', 'text-destructive'],
    ['neutral', 'bg-muted', 'text-muted-foreground'],
  ] as const)(
    'provides the %s status tone',
    async (variant, background, text) => {
      const screen = await render(<Badge variant={variant}>{variant}</Badge>)

      await expect
        .element(screen.getByText(variant, { exact: true }))
        .toHaveClass(background, text)
    }
  )
})
