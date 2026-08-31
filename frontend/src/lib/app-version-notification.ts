import { appConfig } from '@/config/app'
import { toast } from 'sonner'

const APP_BUILD_ID_META_NAME = 'app-build-id'
const APP_VERSION_TOAST_ID = 'app-version-update'
const DEFAULT_UPDATE_CHECK_INTERVAL = 60 * 1000

interface AppUpdateNotification {
  onDismiss: () => void
  onRefresh: () => void
}

interface AppVersionNotificationOptions {
  checkIntervalMs?: number
  currentBuildId?: string | null
  document?: Document
  enabled?: boolean
  fetcher?: typeof fetch
  notify?: (notification: AppUpdateNotification) => void
  reload?: () => void
}

export function getAppBuildId(documentObject: Document) {
  return (
    documentObject
      .querySelector<HTMLMetaElement>(`meta[name="${APP_BUILD_ID_META_NAME}"]`)
      ?.content.trim() || null
  )
}

export async function fetchLatestAppBuildId(
  indexUrl: string,
  fetcher: typeof fetch = window.fetch.bind(window)
) {
  try {
    const url = new URL(indexUrl)
    url.searchParams.set('_appVersion', Date.now().toString())

    const response = await fetcher(url, {
      cache: 'no-store',
      headers: { Accept: 'text/html' },
    })
    if (!response.ok) return null

    const html = await response.text()
    const parsedDocument = new DOMParser().parseFromString(html, 'text/html')
    return getAppBuildId(parsedDocument)
  } catch {
    return null
  }
}

function showAppUpdateNotification({
  onDismiss,
  onRefresh,
}: AppUpdateNotification) {
  toast.info('A new version is available', {
    id: APP_VERSION_TOAST_ID,
    description: `Refresh to use the latest ${appConfig.name} updates.`,
    duration: Number.POSITIVE_INFINITY,
    className: 'app-version-update-toast',
    position: 'top-right',
    action: { label: 'Refresh', onClick: onRefresh },
    cancel: { label: 'Later', onClick: onDismiss },
    onDismiss,
  })
}

export function setupAppVersionNotification(
  options: AppVersionNotificationOptions = {}
) {
  const enabled = options.enabled ?? import.meta.env.PROD
  if (!enabled) return () => undefined

  const documentObject = options.document ?? document
  const currentBuildId = options.currentBuildId ?? getAppBuildId(documentObject)
  if (!currentBuildId) return () => undefined

  const checkIntervalMs =
    options.checkIntervalMs ?? DEFAULT_UPDATE_CHECK_INTERVAL
  const fetcher = options.fetcher ?? window.fetch.bind(window)
  const notify = options.notify ?? showAppUpdateNotification
  const reload = options.reload ?? (() => window.location.reload())
  const indexUrl = new URL('index.html', documentObject.baseURI).toString()
  const browserWindow = documentObject.defaultView ?? window

  let disposed = false
  let isChecking = false
  let isNotificationVisible = false
  let updateInterval: number | undefined

  const stopUpdateInterval = () => {
    if (updateInterval === undefined) return
    browserWindow.clearInterval(updateInterval)
    updateInterval = undefined
  }

  const checkForUpdates = async () => {
    if (
      disposed ||
      isChecking ||
      isNotificationVisible ||
      documentObject.visibilityState !== 'visible'
    ) {
      return
    }

    isChecking = true
    const latestBuildId = await fetchLatestAppBuildId(indexUrl, fetcher)
    isChecking = false

    if (disposed || !latestBuildId || latestBuildId === currentBuildId) return

    isNotificationVisible = true
    notify({
      onDismiss: () => {
        isNotificationVisible = false
      },
      onRefresh: reload,
    })
  }

  const startUpdateInterval = () => {
    stopUpdateInterval()
    if (documentObject.visibilityState !== 'visible') return

    void checkForUpdates()
    updateInterval = browserWindow.setInterval(() => {
      void checkForUpdates()
    }, checkIntervalMs)
  }

  const handleVisibilityChange = () => {
    if (documentObject.visibilityState === 'visible') {
      startUpdateInterval()
    } else {
      stopUpdateInterval()
    }
  }

  documentObject.addEventListener('visibilitychange', handleVisibilityChange)
  startUpdateInterval()

  return () => {
    disposed = true
    stopUpdateInterval()
    documentObject.removeEventListener(
      'visibilitychange',
      handleVisibilityChange
    )
  }
}
