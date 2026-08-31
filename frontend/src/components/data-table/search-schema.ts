import { z } from 'zod'

export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 20

export const paginationSearchSchema = z.object({
  page: z.number().int().min(1).max(10_000).catch(DEFAULT_PAGE),
  pageSize: z.number().int().min(1).max(100).catch(DEFAULT_PAGE_SIZE),
})
