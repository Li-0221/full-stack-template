import { AuthenticationService, type SessionLoginRequest } from '@/client'
import type { AuthTokens } from '@/types/api'
import { generatedPublicApiClient } from '@/lib/generated-api'

export async function createSession(
  request: SessionLoginRequest
): Promise<AuthTokens> {
  const response = await AuthenticationService.createSession({
    body: request,
    client: generatedPublicApiClient,
  })
  return response.data.data
}

export async function refreshSession(
  refreshToken: string
): Promise<AuthTokens> {
  const response = await AuthenticationService.refreshSession({
    body: { refreshToken },
    client: generatedPublicApiClient,
  })
  return response.data.data
}

export async function revokeSession(refreshToken: string): Promise<void> {
  await AuthenticationService.logoutSession({
    body: { refreshToken },
    client: generatedPublicApiClient,
  })
}
