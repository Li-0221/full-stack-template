import type { AuthTokensData } from '@/client'

export const API_SUCCESS_CODE = 0
export const ACCESS_TOKEN_EXPIRED_CODE = 40111

export type EmptyData = Record<string, never>

export interface ApiResponse<TData = EmptyData> {
  code: number
  data: TData
  message: string
}

export interface PageParams {
  page: number
  pageSize: number
}

export interface PageData<TItem> extends PageParams {
  items: TItem[]
  total: number
}

export type PaginatedResponse<TItem> = ApiResponse<PageData<TItem>>

export type AuthTokens = AuthTokensData
