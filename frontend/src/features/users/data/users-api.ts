import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import {
  UsersService,
  type UserCreateRequest,
  type UserData,
  type UserPutRequest,
} from '@/client'
import type { PageData, PageParams } from '@/types/api'
import { generatedApiClient } from '@/lib/generated-api'

export type User = UserData
export const usersQueryKey = ['users'] as const

export async function listUsers(params: PageParams): Promise<PageData<User>> {
  const response = await UsersService.listUsers({
    client: generatedApiClient,
    query: params,
  })
  return response.data.data
}

export function usersQueryOptions(params: PageParams) {
  return queryOptions({
    queryKey: [...usersQueryKey, 'list', params],
    queryFn: () => listUsers(params),
    placeholderData: keepPreviousData,
  })
}

export async function createUser(request: UserCreateRequest): Promise<User> {
  const response = await UsersService.createUser({
    client: generatedApiClient,
    body: request,
  })
  return response.data.data
}

export async function updateUser(
  userId: string,
  request: UserPutRequest
): Promise<User> {
  const response = await UsersService.updateUser({
    client: generatedApiClient,
    path: { userId },
    body: request,
  })
  return response.data.data
}

export async function deleteUser(userId: string): Promise<void> {
  await UsersService.deleteUser({
    client: generatedApiClient,
    path: { userId },
  })
}
