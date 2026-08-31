import { Skeleton } from '@/components/ui/skeleton'

interface DataTableSearchSkeletonProps {
  filterCount?: number
  showTrailingAction?: boolean
}

export function DataTableSearchSkeleton({
  filterCount = 2,
  showTrailingAction = true,
}: DataTableSearchSkeletonProps) {
  return (
    <div
      data-slot='data-table-search-skeleton'
      aria-hidden='true'
      className='flex min-h-8 items-center justify-between gap-3'
    >
      <div className='flex min-w-0 flex-1 items-center gap-2'>
        <Skeleton className='h-8 w-64' />
        {Array.from({ length: filterCount }, (_, index) => (
          <Skeleton
            key={index}
            className={index % 2 === 0 ? 'h-8 w-24' : 'h-8 w-28'}
          />
        ))}
      </div>
      {showTrailingAction ? <Skeleton className='size-8 shrink-0' /> : null}
    </div>
  )
}
