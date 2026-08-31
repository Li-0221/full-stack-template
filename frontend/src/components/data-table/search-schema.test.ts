import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  paginationSearchSchema,
  type PaginationSearch,
} from './search-schema'

describe('paginationSearchSchema', () => {
  it('provides company defaults when pagination is omitted', () => {
    expect(paginationSearchSchema.parse({})).toEqual({
      page: DEFAULT_PAGE,
      pageSize: DEFAULT_PAGE_SIZE,
    })
  })

  it('keeps valid pagination and replaces invalid values', () => {
    expect(paginationSearchSchema.parse({ page: 3, pageSize: 50 })).toEqual({
      page: 3,
      pageSize: 50,
    })
    expect(paginationSearchSchema.parse({ page: 0, pageSize: 500 })).toEqual({
      page: DEFAULT_PAGE,
      pageSize: DEFAULT_PAGE_SIZE,
    })
  })

  it('matches the shared page query contract', () => {
    expectTypeOf<PaginationSearch>().toEqualTypeOf<{
      page: number
      pageSize: number
    }>()
  })
})
