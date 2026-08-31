import { z } from 'zod'
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import {
  UsersService,
  type UserCreateRequest,
  type UserData,
  type UserPutRequest,
} from '@/client'
import type { PageData, PageParams } from '@/types/api'
import { generatedApiClient } from '@/lib/generated-api'

const userSchema: z.ZodType<UserData> = z.strictObject({
  id: z.uuid(),
  email: z.email(),
  fullName: z.string().nullable(),
  isActive: z.boolean(),
  isSuperuser: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
})

const usersPageSchema: z.ZodType<PageData<UserData>> = z.strictObject({
  items: z.array(userSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().nonnegative(),
})

const usersResponseSchema = z.strictObject({
  code: z.literal(0),
  data: usersPageSchema,
  message: z.literal('success'),
})

const userResponseSchema = z.strictObject({
  code: z.literal(0),
  data: userSchema,
  message: z.literal('success'),
})

export type User = UserData
export const usersQueryKey = ['users'] as const

export async function listUsers(params: PageParams): Promise<PageData<User>> {
  const response = await UsersService.listUsers({
    client: generatedApiClient,
    query: params,
  })
  return usersResponseSchema.parse(response.data).data
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
  return userResponseSchema.parse(response.data).data
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
  return userResponseSchema.parse(response.data).data
}

export async function deleteUser(userId: string): Promise<void> {
  await UsersService.deleteUser({
    client: generatedApiClient,
    path: { userId },
  })
}
