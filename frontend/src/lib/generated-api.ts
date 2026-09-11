import { createClient } from '@/client/client'
import { apiClient, publicApiClient } from '@/lib/api-client'

export const generatedApiClient = createClient({
  axios: apiClient,
  baseURL: '/',
  throwOnError: true,
})

export const generatedPublicApiClient = createClient({
  axios: publicApiClient,
  baseURL: '/',
  throwOnError: true,
})
