import { z } from 'zod'
import { AuthenticationService, type SessionLoginRequest } from '@/client'
import type { AuthTokens } from '@/types/api'
import { generatedPublicApiClient } from '@/lib/generated-api'

const authTokensSchema: z.ZodType<AuthTokens> = z.strictObject({
  accessToken: z.string().min(1),
  accessExpiresAt: z.number().int().positive(),
  refreshToken: z.string().min(1),
  refreshExpiresAt: z.number().int().positive(),
})

const authTokensResponseSchema = z.strictObject({
  code: z.literal(0),
  data: authTokensSchema,
  message: z.literal('success'),
})

export async function createSession(
  request: SessionLoginRequest
): Promise<AuthTokens> {
  const response = await AuthenticationService.createSession({
    body: request,
    client: generatedPublicApiClient,
  })
  return authTokensResponseSchema.parse(response.data).data
}

export async function refreshSession(
  refreshToken: string
): Promise<AuthTokens> {
  const response = await AuthenticationService.refreshSession({
    body: { refreshToken },
    client: generatedPublicApiClient,
  })
  return authTokensResponseSchema.parse(response.data).data
}

export async function revokeSession(refreshToken: string): Promise<void> {
  await AuthenticationService.logoutSession({
    body: { refreshToken },
    client: generatedPublicApiClient,
  })
}
