import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons'
import { type Table } from '@tanstack/react-table'
import { cn, getPageNumbers } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type DataTablePaginationProps<TData> = {
  table: Table<TData>
  className?: string
  pageSizeOptions?: readonly number[]
  totalRows?: number
  disabled?: boolean
}

export function DataTablePagination<TData>({
  table,
  className,
  pageSizeOptions = [10, 20, 50, 100],
  totalRows,
  disabled = false,
}: DataTablePaginationProps<TData>) {
  const pageSize = table.getState().pagination.pageSize
  const totalPages = Math.max(1, table.getPageCount())
  const currentPage = Math.min(
    table.getState().pagination.pageIndex + 1,
    totalPages
  )
  const pageNumbers = getPageNumbers(currentPage, totalPages)
  const availablePageSizes = Array.from(new Set([...pageSizeOptions, pageSize]))
    .filter((value) => Number.isInteger(value) && value > 0)
    .sort((first, second) => first - second)

  return (
    <div
      className={cn(
        'flex items-center justify-between overflow-clip px-2',
        '@max-2xl/content:flex-col-reverse @max-2xl/content:gap-4',
        className
      )}
      style={{ overflowClipMargin: 1 }}
    >
      <div className='flex w-full items-center justify-between'>
        <div className='flex shrink-0 items-center justify-center text-sm font-medium whitespace-nowrap @2xl/content:hidden'>
          Page {currentPage} of {totalPages}
        </div>
        <div className='flex items-center gap-2 @max-2xl/content:flex-row-reverse'>
          <Select
            value={`${pageSize}`}
            disabled={disabled}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger aria-label='Rows per page' className='h-8 w-17.5'>
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side='top'>
              <SelectGroup>
                {availablePageSizes.map((availablePageSize) => (
                  <SelectItem
                    key={availablePageSize}
                    value={`${availablePageSize}`}
                  >
                    {availablePageSize}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <p className='hidden text-sm font-medium sm:block'>Rows per page</p>
        </div>
      </div>

      <div className='flex items-center sm:gap-6 lg:gap-8'>
        <div className='flex shrink-0 items-center justify-center text-sm font-medium whitespace-nowrap @max-3xl/content:hidden'>
          Page {currentPage} of {totalPages}
          {typeof totalRows === 'number' ? ` · ${totalRows} rows` : null}
        </div>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-8 @max-md/content:hidden'
            onClick={() => table.setPageIndex(0)}
            disabled={disabled || !table.getCanPreviousPage()}
          >
            <span className='sr-only'>Go to first page</span>
            <DoubleArrowLeftIcon />
          </Button>
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-8'
            onClick={() => table.previousPage()}
            disabled={disabled || !table.getCanPreviousPage()}
          >
            <span className='sr-only'>Go to previous page</span>
            <ChevronLeftIcon />
          </Button>

          {/* Page number buttons */}
          {pageNumbers.map((pageNumber, index) => (
            <div key={`${pageNumber}-${index}`} className='flex items-center'>
              {pageNumber === '...' ? (
                <span className='px-1 text-sm text-muted-foreground'>...</span>
              ) : (
                <Button
                  type='button'
                  variant={currentPage === pageNumber ? 'default' : 'outline'}
                  className='h-8 min-w-8 px-2'
                  aria-current={currentPage === pageNumber ? 'page' : undefined}
                  disabled={disabled}
                  onClick={() => table.setPageIndex((pageNumber as number) - 1)}
                >
                  <span className='sr-only'>Go to page {pageNumber}</span>
                  {pageNumber}
                </Button>
              )}
            </div>
          ))}

          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-8'
            onClick={() => table.nextPage()}
            disabled={disabled || !table.getCanNextPage()}
          >
            <span className='sr-only'>Go to next page</span>
            <ChevronRightIcon />
          </Button>
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-8 @max-md/content:hidden'
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={disabled || !table.getCanNextPage()}
          >
            <span className='sr-only'>Go to last page</span>
            <DoubleArrowRightIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}
