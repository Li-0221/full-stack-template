import { z } from 'zod'
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { UsersService, type UserData } from '@/client'
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

export type User = UserData

export async function listUsers(params: PageParams): Promise<PageData<User>> {
  const response = await UsersService.listUsers({
    client: generatedApiClient,
    query: params,
  })
  return usersResponseSchema.parse(response.data).data
}

export function usersQueryOptions(params: PageParams) {
  return queryOptions({
    queryKey: ['users', 'list', params],
    queryFn: () => listUsers(params),
    placeholderData: keepPreviousData,
  })
}
