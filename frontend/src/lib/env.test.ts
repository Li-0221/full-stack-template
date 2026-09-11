import { afterEach, describe, expect, it, vi } from 'vitest'
import { getRuntimeEnv, normalizeAppBasePath } from './env'

afterEach(() => {
  vi.unstubAllEnvs()
  delete window.__ENV__
})

describe('normalizeAppBasePath', () => {
  it.each(['', '/', '///'])('normalizes %j to the root path', (value) => {
    expect(normalizeAppBasePath(value)).toBe('/')
  })

  it.each([
    ['admin', '/admin'],
    ['/admin/', '/admin'],
    [' /operations/tools/ ', '/operations/tools'],
  ])('normalizes %j to %j', (value, expected) => {
    expect(normalizeAppBasePath(value)).toBe(expected)
  })
})

describe('getRuntimeEnv', () => {
  it('falls back to the build-time value for an undefined placeholder', () => {
    vi.stubEnv('VITE_APP_BASE_PATH', '/build')
    window.__ENV__ = { VITE_APP_BASE_PATH: undefined }

    expect(getRuntimeEnv('VITE_APP_BASE_PATH')).toBe('/build')
  })

  it('prefers a runtime value over its build-time fallback', () => {
    vi.stubEnv('VITE_APP_BASE_PATH', '/build')
    window.__ENV__ = { VITE_APP_BASE_PATH: '/runtime' }

    expect(getRuntimeEnv('VITE_APP_BASE_PATH')).toBe('/runtime')
  })

  it('allows the runtime config to intentionally clear a build-time value', () => {
    vi.stubEnv('VITE_APP_BASE_PATH', '/build')
    window.__ENV__ = { VITE_APP_BASE_PATH: '' }

    expect(getRuntimeEnv('VITE_APP_BASE_PATH')).toBe('')
  })
})
