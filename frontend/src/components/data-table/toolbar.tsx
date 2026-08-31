import type { ReactNode } from 'react'
import { Cross2Icon } from '@radix-ui/react-icons'
import { type Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { RemoteSelectSearch } from '@/components/searchable-select'
import { DataTableFacetedFilter } from './faceted-filter'
import { DataTableViewOptions } from './view-options'

type DataTableToolbarProps<TData> = {
  table: Table<TData>
  searchPlaceholder?: string
  searchAriaLabel?: string
  searchKey?: string
  searchMaxLength?: number
  showViewOptions?: boolean
  externalFilterActive?: boolean
  onResetFilters?: () => void
  children?: ReactNode
  childrenPosition?: 'before-filters' | 'after-filters'
  filters?: {
    columnId: string
    title: string
    multiple?: boolean
    contentClassName?: string
    options: {
      label: string
      value: string
      icon?: React.ComponentType<{ className?: string }>
    }[]
    remoteSearch?: RemoteSelectSearch
  }[]
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder = 'Search…',
  searchAriaLabel,
  searchKey,
  searchMaxLength = 255,
  showViewOptions = true,
  externalFilterActive = false,
  onResetFilters,
  children,
  childrenPosition = 'after-filters',
  filters = [],
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    table.getState().columnFilters.length > 0 ||
    table.getState().globalFilter ||
    externalFilterActive
  const searchInput = searchKey ? (
    <Input
      type='search'
      name={searchKey}
      autoComplete='off'
      spellCheck={false}
      aria-label={searchAriaLabel ?? searchPlaceholder}
      placeholder={searchPlaceholder}
      maxLength={searchMaxLength}
      value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
      onChange={(event) =>
        table.getColumn(searchKey)?.setFilterValue(event.target.value)
      }
      className='h-8 w-37.5 lg:w-62.5'
    />
  ) : (
    <Input
      type='search'
      name='search'
      autoComplete='off'
      spellCheck={false}
      aria-label={searchAriaLabel ?? searchPlaceholder}
      placeholder={searchPlaceholder}
      maxLength={searchMaxLength}
      value={table.getState().globalFilter ?? ''}
      onChange={(event) => table.setGlobalFilter(event.target.value)}
      className='h-8 w-37.5 lg:w-62.5'
    />
  )

  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-1 flex-col-reverse items-start gap-2 sm:flex-row sm:items-center'>
        <div className='flex items-center'>
          {searchAriaLabel ? (
            <Tooltip>
              <TooltipTrigger asChild>{searchInput}</TooltipTrigger>
              <TooltipContent sideOffset={4} className='max-w-80 text-pretty'>
                <p>{searchAriaLabel}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            searchInput
          )}
        </div>
        <div className='flex min-w-0 flex-wrap gap-2'>
          {childrenPosition === 'before-filters' ? children : null}
          {filters.map((filter) => {
            const column = table.getColumn(filter.columnId)
            if (!column) return null
            return (
              <DataTableFacetedFilter
                key={filter.columnId}
                column={column}
                title={filter.title}
                multiple={filter.multiple}
                contentClassName={filter.contentClassName}
                options={filter.options}
                remoteSearch={filter.remoteSearch}
              />
            )
          })}
          {childrenPosition === 'after-filters' ? children : null}
        </div>
        {isFiltered && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => {
              if (onResetFilters) {
                onResetFilters()
                return
              }
              table.resetColumnFilters()
              table.setGlobalFilter('')
            }}
            className='px-2 lg:px-3'
          >
            Reset
            <Cross2Icon data-icon='inline-end' />
          </Button>
        )}
      </div>
      {showViewOptions ? <DataTableViewOptions table={table} /> : null}
    </div>
  )
}
