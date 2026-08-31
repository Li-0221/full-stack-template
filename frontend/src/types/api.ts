import type { AuthTokensData } from '@/client'

export const API_SUCCESS_CODE = 0
export const ACCESS_TOKEN_EXPIRED_CODE = 40111

export interface ApiResponse<TData = unknown> {
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

export type AuthTokens = AuthTokensData
