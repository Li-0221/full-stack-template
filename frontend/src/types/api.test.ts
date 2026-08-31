import { describe, expectTypeOf, it } from 'vitest'
import type { EmptyData, PageData, PageParams, PaginatedResponse } from './api'

interface Item {
  id: string
}

describe('API contract types', () => {
  it('models the shared pagination request and response fields', () => {
    expectTypeOf<PageParams>().toEqualTypeOf<{
      page: number
      pageSize: number
    }>()
    expectTypeOf<PageData<Item>>().toEqualTypeOf<{
      items: Item[]
      page: number
      pageSize: number
      total: number
    }>()
  })

  it('models regular and paginated response envelopes', () => {
    expectTypeOf<PaginatedResponse<Item>['data']>().toEqualTypeOf<
      PageData<Item>
    >()
    expectTypeOf<EmptyData>().toEqualTypeOf<Record<string, never>>()
  })
})
