import { createClient } from '@/client/client'
import { publicApiClient } from '@/lib/api-client'
import { env } from '@/lib/env'

export const generatedPublicApiClient = createClient({
  axios: publicApiClient,
  baseURL: env.apiBaseUrl,
  throwOnError: true,
})
