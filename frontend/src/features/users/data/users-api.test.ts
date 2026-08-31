import { ZodError } from 'zod'
import { UsersService } from '@/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generatedApiClient } from '@/lib/generated-api'
import { createUser, deleteUser, listUsers, updateUser } from './users-api'

vi.mock('@/client', () => ({
  UsersService: {
    listUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
  },
}))

vi.mock('@/lib/generated-api', () => ({
  generatedApiClient: { name: 'authenticated-test-client' },
}))

const user = {
  id: '57cc5265-a519-4bee-94de-52e440a6e4ca',
  email: 'admin@example.com',
  fullName: 'Admin User',
  isActive: true,
  isSuperuser: true,
  createdAt: '2026-08-31T02:00:00+00:00',
  updatedAt: '2026-08-31T02:00:00+00:00',
}

const response = (data: unknown) => ({
  data: { code: 0, data, message: 'success' },
})

describe('users API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists a server page through the generated authenticated client', async () => {
    const page = { items: [user], page: 2, pageSize: 20, total: 25 }
    vi.mocked(UsersService.listUsers).mockResolvedValue(response(page) as never)

    await expect(listUsers({ page: 2, pageSize: 20 })).resolves.toEqual(page)
    expect(UsersService.listUsers).toHaveBeenCalledWith({
      client: generatedApiClient,
      query: { page: 2, pageSize: 20 },
    })
  })

  it('rejects an invalid user variant at the API boundary', async () => {
    vi.mocked(UsersService.listUsers).mockResolvedValue(
      response({
        items: [{ ...user, isActive: undefined }],
        page: 1,
        pageSize: 20,
        total: 1,
      }) as never
    )

    await expect(listUsers({ page: 1, pageSize: 20 })).rejects.toBeInstanceOf(
      ZodError
    )
  })

  it('creates a user and validates the returned user', async () => {
    const request = {
      email: user.email,
      fullName: user.fullName,
      password: 'password123',
      isActive: true,
      isSuperuser: false,
    }
    vi.mocked(UsersService.createUser).mockResolvedValue(
      response(user) as never
    )

    await expect(createUser(request)).resolves.toEqual(user)
    expect(UsersService.createUser).toHaveBeenCalledWith({
      client: generatedApiClient,
      body: request,
    })
  })

  it('fully updates a user while omitting an unchanged password', async () => {
    const request = {
      email: user.email,
      fullName: null,
      isActive: false,
      isSuperuser: false,
    }
    vi.mocked(UsersService.updateUser).mockResolvedValue(
      response(user) as never
    )

    await expect(updateUser(user.id, request)).resolves.toEqual(user)
    expect(UsersService.updateUser).toHaveBeenCalledWith({
      client: generatedApiClient,
      path: { userId: user.id },
      body: request,
    })
  })

  it('rejects an invalid mutation response at the API boundary', async () => {
    vi.mocked(UsersService.createUser).mockResolvedValue(
      response({ ...user, updatedAt: null }) as never
    )

    await expect(
      createUser({
        email: user.email,
        password: 'password123',
      })
    ).rejects.toBeInstanceOf(ZodError)
  })

  it('deletes a user through the authenticated generated client', async () => {
    vi.mocked(UsersService.deleteUser).mockResolvedValue({
      data: undefined,
    } as never)

    await expect(deleteUser(user.id)).resolves.toBeUndefined()
    expect(UsersService.deleteUser).toHaveBeenCalledWith({
      client: generatedApiClient,
      path: { userId: user.id },
    })
  })
})
