import { Skeleton } from '@/components/ui/skeleton'
import { TableCell, TableRow } from '@/components/ui/table'

interface DataTableSkeletonRowsProps {
  columnCount: number
  label: string
  rowCount?: number
}

const skeletonWidths = ['w-full', 'w-3/4', 'w-1/2', 'w-5/6'] as const

export function DataTableSkeletonRows({
  columnCount,
  label,
  rowCount = 5,
}: DataTableSkeletonRowsProps) {
  return Array.from({ length: rowCount }, (_, rowIndex) => (
    <TableRow
      key={rowIndex}
      data-slot='data-table-skeleton-row'
      aria-hidden={rowIndex === 0 ? undefined : true}
    >
      {Array.from({ length: columnCount }, (_, columnIndex) => (
        <TableCell key={columnIndex} className='h-12'>
          {rowIndex === 0 && columnIndex === 0 ? (
            <span role='status' aria-live='polite' className='sr-only'>
              {label}
            </span>
          ) : null}
          <Skeleton
            aria-hidden='true'
            className={`h-4 ${skeletonWidths[(rowIndex + columnIndex) % skeletonWidths.length]}`}
          />
        </TableCell>
      ))}
    </TableRow>
  ))
}
