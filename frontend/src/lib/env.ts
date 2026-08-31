export function getRuntimeEnv(key: keyof ImportMetaEnv) {
  const runtimeValue =
    typeof window === 'undefined' ? undefined : window.__ENV__?.[key]

  return runtimeValue ?? import.meta.env[key] ?? ''
}

export function normalizeAppBasePath(value: string) {
  const path = value.trim().replace(/^\/+|\/+$/g, '')
  return path ? `/${path}` : '/'
}

export const env = Object.freeze({
  apiBaseUrl: getRuntimeEnv('VITE_API_BASE_URL').trim(),
  appBasePath: normalizeAppBasePath(getRuntimeEnv('VITE_APP_BASE_PATH')),
})
