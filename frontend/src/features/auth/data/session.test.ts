import { ZodError } from 'zod'
import { AuthenticationService } from '@/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generatedPublicApiClient } from '@/lib/generated-api'
import { createSession, refreshSession, revokeSession } from './session'

vi.mock('@/client', () => ({
  AuthenticationService: {
    createSession: vi.fn(),
    logoutSession: vi.fn(),
    refreshSession: vi.fn(),
  },
}))

vi.mock('@/lib/generated-api', () => ({
  generatedPublicApiClient: { name: 'public-test-client' },
}))

const tokens = {
  accessToken: 'access-token',
  accessExpiresAt: 1_800_000_000_000,
  refreshToken: 'refresh-token',
  refreshExpiresAt: 1_900_000_000_000,
}

const response = (data: unknown) => ({
  data: { code: 0, data, message: 'success' },
})

describe('auth session API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a session through the generated public client', async () => {
    vi.mocked(AuthenticationService.createSession).mockResolvedValue(
      response(tokens) as never
    )

    await expect(
      createSession({ email: 'admin@example.com', password: 'password' })
    ).resolves.toEqual(tokens)
    expect(AuthenticationService.createSession).toHaveBeenCalledWith({
      body: { email: 'admin@example.com', password: 'password' },
      client: generatedPublicApiClient,
    })
  })

  it('rejects an incomplete token response at the API boundary', async () => {
    vi.mocked(AuthenticationService.createSession).mockResolvedValue(
      response({ ...tokens, refreshToken: undefined }) as never
    )

    await expect(
      createSession({ email: 'admin@example.com', password: 'password' })
    ).rejects.toBeInstanceOf(ZodError)
  })

  it('refreshes and revokes through the generated public client', async () => {
    vi.mocked(AuthenticationService.refreshSession).mockResolvedValue(
      response(tokens) as never
    )
    vi.mocked(AuthenticationService.logoutSession).mockResolvedValue(
      {} as never
    )

    await expect(refreshSession('refresh-token')).resolves.toEqual(tokens)
    await expect(revokeSession('refresh-token')).resolves.toBeUndefined()
    expect(AuthenticationService.refreshSession).toHaveBeenCalledWith({
      body: { refreshToken: 'refresh-token' },
      client: generatedPublicApiClient,
    })
    expect(AuthenticationService.logoutSession).toHaveBeenCalledWith({
      body: { refreshToken: 'refresh-token' },
      client: generatedPublicApiClient,
    })
  })
})
