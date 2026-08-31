import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchLatestAppBuildId,
  getAppBuildId,
  setupAppVersionNotification,
} from './app-version-notification'

function createDocument(buildId: string, visibilityState = 'visible') {
  const documentObject = document.implementation.createHTMLDocument()
  const base = documentObject.createElement('base')
  base.href = 'https://admin.example.com/console/'
  const meta = documentObject.createElement('meta')
  meta.name = 'app-build-id'
  meta.content = buildId
  documentObject.head.append(base, meta)
  Object.defineProperty(documentObject, 'visibilityState', {
    configurable: true,
    value: visibilityState,
  })
  return documentObject
}

afterEach(() => {
  vi.useRealTimers()
})

describe('app version notification', () => {
  it('reads the injected build id from an HTML document', () => {
    expect(getAppBuildId(createDocument('build-current'))).toBe('build-current')
  })

  it('fetches the deployed index without using a cached response', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          '<html><head><meta name="app-build-id" content="build-latest"></head></html>'
        )
      )

    await expect(
      fetchLatestAppBuildId(
        'https://admin.example.com/console/index.html',
        fetcher
      )
    ).resolves.toBe('build-latest')

    const [requestUrl, requestInit] = fetcher.mock.calls[0]
    expect(String(requestUrl)).toMatch(
      /^https:\/\/admin\.example\.com\/console\/index\.html\?_appVersion=\d+$/
    )
    expect(requestInit).toMatchObject({
      cache: 'no-store',
      headers: { Accept: 'text/html' },
    })
  })

  it('notifies once when the deployed build changes', async () => {
    vi.useFakeTimers()
    const documentObject = createDocument('build-current')
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          '<html><head><meta name="app-build-id" content="build-latest"></head></html>'
        )
      )
    const notify = vi.fn()
    const reload = vi.fn()

    const cleanup = setupAppVersionNotification({
      checkIntervalMs: 1_000,
      document: documentObject,
      enabled: true,
      fetcher,
      notify,
      reload,
    })

    await vi.waitFor(() => expect(notify).toHaveBeenCalledOnce())
    await vi.advanceTimersByTimeAsync(3_000)
    expect(notify).toHaveBeenCalledOnce()

    const notification = notify.mock.calls[0][0]
    notification.onRefresh()
    expect(reload).toHaveBeenCalledOnce()

    cleanup()
  })

  it('pauses while hidden and checks immediately when visible again', async () => {
    vi.useFakeTimers()
    const documentObject = createDocument('build-current', 'hidden')
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          '<html><head><meta name="app-build-id" content="build-current"></head></html>'
        )
      )

    const cleanup = setupAppVersionNotification({
      checkIntervalMs: 1_000,
      document: documentObject,
      enabled: true,
      fetcher,
      notify: vi.fn(),
    })

    await vi.advanceTimersByTimeAsync(3_000)
    expect(fetcher).not.toHaveBeenCalled()

    Object.defineProperty(documentObject, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    documentObject.dispatchEvent(new Event('visibilitychange'))
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce())

    cleanup()
    await vi.advanceTimersByTimeAsync(3_000)
    expect(fetcher).toHaveBeenCalledOnce()
  })
})
