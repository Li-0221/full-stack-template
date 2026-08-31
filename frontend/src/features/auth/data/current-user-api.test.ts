import { UsersService } from '@/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generatedApiClient } from '@/lib/generated-api'
import {
  changeCurrentUserPassword,
  getCurrentUser,
  updateCurrentUser,
} from './current-user-api'

vi.mock('@/client', () => ({
  UsersService: {
    getCurrentUser: vi.fn(),
    updateCurrentUser: vi.fn(),
    changeCurrentUserPassword: vi.fn(),
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

describe('current user API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads the current user through the generated authenticated client', async () => {
    vi.mocked(UsersService.getCurrentUser).mockResolvedValue(
      response(user) as never
    )

    await expect(getCurrentUser()).resolves.toEqual(user)
    expect(UsersService.getCurrentUser).toHaveBeenCalledWith({
      client: generatedApiClient,
    })
  })

  it('fully updates email and an explicitly cleared name', async () => {
    const request = { email: user.email, fullName: null }
    vi.mocked(UsersService.updateCurrentUser).mockResolvedValue(
      response({ ...user, fullName: null }) as never
    )

    await expect(updateCurrentUser(request)).resolves.toMatchObject({
      email: user.email,
      fullName: null,
    })
    expect(UsersService.updateCurrentUser).toHaveBeenCalledWith({
      client: generatedApiClient,
      body: request,
    })
  })

  it('changes the password without expecting a response body', async () => {
    const request = {
      currentPassword: 'current-password',
      newPassword: 'new-password',
    }
    vi.mocked(UsersService.changeCurrentUserPassword).mockResolvedValue(
      {} as never
    )

    await expect(changeCurrentUserPassword(request)).resolves.toBeUndefined()
    expect(UsersService.changeCurrentUserPassword).toHaveBeenCalledWith({
      client: generatedApiClient,
      body: request,
    })
  })
})
