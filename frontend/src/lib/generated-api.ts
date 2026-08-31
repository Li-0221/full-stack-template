import { createClient } from '@/client/client'
import { apiClient, publicApiClient } from '@/lib/api-client'
import { env } from '@/lib/env'

export const generatedApiClient = createClient({
  axios: apiClient,
  baseURL: env.apiBaseUrl,
  throwOnError: true,
})

export const generatedPublicApiClient = createClient({
  axios: publicApiClient,
  baseURL: env.apiBaseUrl,
  throwOnError: true,
})
