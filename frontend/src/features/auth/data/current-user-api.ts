import { queryOptions } from '@tanstack/react-query'
import {
  UsersService,
  type UserData,
  type UserPasswordChangeRequest,
  type UserSelfPutRequest,
} from '@/client'
import { generatedApiClient } from '@/lib/generated-api'

export type CurrentUser = UserData
export const currentUserQueryKey = ['current-user'] as const

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await UsersService.getCurrentUser({
    client: generatedApiClient,
  })
  return response.data.data
}

export function currentUserQueryOptions() {
  return queryOptions({
    queryKey: currentUserQueryKey,
    queryFn: getCurrentUser,
  })
}

export async function updateCurrentUser(
  request: UserSelfPutRequest
): Promise<CurrentUser> {
  const response = await UsersService.updateCurrentUser({
    client: generatedApiClient,
    body: request,
  })
  return response.data.data
}

export async function changeCurrentUserPassword(
  request: UserPasswordChangeRequest
): Promise<void> {
  await UsersService.changeCurrentUserPassword({
    client: generatedApiClient,
    body: request,
  })
}
