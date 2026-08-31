import '@/styles/index.css'
import { Toaster, toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { setupAppVersionNotification } from './app-version-notification'

describe('app version notification layout', () => {
  it('uses the full first row for text and aligns actions at the bottom right', async () => {
    const screen = await render(<Toaster />)
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          '<html><head><meta name="app-build-id" content="build-latest"></head></html>'
        )
      )

    const cleanup = setupAppVersionNotification({
      currentBuildId: 'build-current',
      enabled: true,
      fetcher,
    })

    const title = screen.getByText('A new version is available')
    await expect.element(title).toBeVisible()

    const toastElement = title.element().closest('[data-sonner-toast]')
    const contentElement = title.element().closest('[data-content]')
    const laterButton = screen.getByRole('button', { name: 'Later' }).element()
    const refreshButton = screen
      .getByRole('button', { name: 'Refresh' })
      .element()

    expect(toastElement).not.toBeNull()
    expect(contentElement).not.toBeNull()
    expect(toastElement).toHaveAttribute('data-x-position', 'right')
    expect(toastElement).toHaveAttribute('data-y-position', 'top')
    expect(getComputedStyle(toastElement!).display).toBe('grid')

    const toastRect = toastElement!.getBoundingClientRect()
    const contentRect = contentElement!.getBoundingClientRect()
    const laterRect = laterButton.getBoundingClientRect()
    const refreshRect = refreshButton.getBoundingClientRect()

    expect(contentRect.right).toBeCloseTo(toastRect.right - 17, 0)
    expect(laterRect.top).toBeGreaterThan(contentRect.bottom)
    expect(refreshRect.top).toBeGreaterThan(contentRect.bottom)
    expect(refreshRect.right).toBeCloseTo(toastRect.right - 17, 0)

    cleanup()
    toast.dismiss()
  })
})
