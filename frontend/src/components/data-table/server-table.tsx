import {
  useEffect,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type Table as TableInstance,
  type VisibilityState,
} from '@tanstack/react-table'
import type { PageData } from '@/types/api'
import { cn } from '@/lib/utils'
import {
  useTableUrlState,
  type ColumnFilterConfig,
  type NavigateFn,
} from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RefreshCw, TriangleAlert } from '@/components/icons'
import { DataTablePagination } from './pagination'
import { DataTableSearchSkeleton } from './search-skeleton'
import { DataTableSkeletonRows } from './skeleton-rows'
import { DataTableViewOptions } from './view-options'

const EMPTY_DATA: never[] = []

interface ServerDataTableProps<TData, TValue> {
  pageData?: PageData<TData>
  columns: ColumnDef<TData, TValue>[]
  search: Record<string, unknown>
  navigate: NavigateFn
  columnFilters?: ColumnFilterConfig[]
  defaultPageSize?: number
  pageSizeOptions?: readonly number[]
  isLoading?: boolean
  isRefreshing?: boolean
  isPlaceholderData?: boolean
  error?: unknown
  loadingLabel?: string
  errorLabel?: string
  emptyLabel?: string
  ariaLabel?: string
  onRetry?: () => void
  onRefresh?: () => void
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean)
  renderToolbar?: (table: TableInstance<TData>) => ReactNode
  renderBulkActions?: (table: TableInstance<TData>) => ReactNode
  onRowClick?: (row: TData) => void
  getRowClickLabel?: (row: TData) => string
}

const INTERACTIVE_TARGET_SELECTOR =
  'a, button, input, select, textarea, [role="button"], [role="checkbox"], [role="menuitem"]'

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest(INTERACTIVE_TARGET_SELECTOR) !== null
  )
}

function getDefaultColumnVisibility<TData, TValue>(
  columns: ColumnDef<TData, TValue>[]
): VisibilityState {
  return Object.fromEntries(
    columns.flatMap((column) =>
      column.id && column.meta?.defaultVisible !== undefined
        ? [[column.id, column.meta.defaultVisible]]
        : []
    )
  )
}

export function ServerDataTable<TData, TValue>({
  pageData,
  columns,
  search,
  navigate,
  columnFilters: columnFilterConfig,
  defaultPageSize = 20,
  pageSizeOptions,
  isLoading = false,
  isRefreshing = false,
  isPlaceholderData = false,
  error,
  loadingLabel = 'Loading data...',
  errorLabel = 'Unable to load data.',
  emptyLabel = 'No results.',
  ariaLabel = 'Data table',
  onRetry,
  onRefresh,
  getRowId,
  enableRowSelection = false,
  renderToolbar,
  renderBulkActions,
  onRowClick,
  getRowClickLabel,
}: ServerDataTableProps<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => getDefaultColumnVisibility(columns)
  )
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const {
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange: onUrlPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search,
    navigate,
    pagination: { defaultPage: 1, defaultPageSize },
    globalFilter: { enabled: false },
    columnFilters: columnFilterConfig,
  })
  const items = pageData?.items ?? EMPTY_DATA
  const total = pageData?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize))

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    setRowSelection({})
    onUrlPaginationChange(updater)
  }

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: items,
    columns,
    pageCount,
    state: {
      pagination,
      rowSelection,
      columnVisibility,
      columnFilters,
    },
    manualPagination: true,
    enableSorting: false,
    enableRowSelection,
    getRowId,
    onPaginationChange: handlePaginationChange,
    onColumnFiltersChange,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualFiltering: true,
  })

  useEffect(() => {
    if (!isLoading && !isPlaceholderData && !error && pageData) {
      ensurePageInRange(pageCount)
    }
  }, [
    ensurePageInRange,
    error,
    isLoading,
    isPlaceholderData,
    pageCount,
    pageData,
  ])

  const hasHideableColumns = table
    .getAllColumns()
    .some(
      (column) =>
        typeof column.accessorFn !== 'undefined' && column.getCanHide()
    )
  const hasToolbar = Boolean(renderToolbar || onRefresh || hasHideableColumns)
  const visibleColumnCount = Math.max(1, table.getVisibleLeafColumns().length)

  function handleRowClick(event: MouseEvent<HTMLTableRowElement>, row: TData) {
    if (isInteractiveTarget(event.target)) return
    onRowClick?.(row)
  }

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    row: TData
  ) {
    if (event.target !== event.currentTarget || event.key !== 'Enter') return
    event.preventDefault()
    onRowClick?.(row)
  }

  return (
    <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-4'>
      {hasToolbar && isLoading && renderToolbar ? (
        <DataTableSearchSkeleton
          filterCount={Math.max(0, (columnFilterConfig?.length ?? 1) - 1)}
          showTrailingAction={Boolean(onRefresh || hasHideableColumns)}
        />
      ) : hasToolbar ? (
        <div
          role='toolbar'
          aria-label={`${ariaLabel} controls`}
          className='flex min-h-8 shrink-0 items-center justify-between gap-3'
        >
          <div className='min-w-0 flex-1'>{renderToolbar?.(table)}</div>
          <div className='flex shrink-0 items-center gap-2'>
            {onRefresh ? (
              <Button
                type='button'
                variant='outline'
                size='icon'
                className='size-8'
                aria-label='Refresh data'
                title='Refresh data'
                disabled={isLoading || isRefreshing}
                onClick={onRefresh}
              >
                <RefreshCw
                  data-icon='inline-start'
                  aria-hidden='true'
                  className={cn(isRefreshing && 'animate-spin')}
                />
              </Button>
            ) : null}
            {hasHideableColumns ? <DataTableViewOptions table={table} /> : null}
          </div>
        </div>
      ) : null}

      <div className='min-h-0 flex-initial overflow-hidden rounded-md border [&>[data-slot=table-container]]:h-full [&>[data-slot=table-container]]:overflow-auto'>
        <Table aria-label={ariaLabel} aria-busy={isLoading || isRefreshing}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='group/row'>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      'sticky top-0 z-10 bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                      header.column.columnDef.meta?.className,
                      header.column.columnDef.meta?.thClassName
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody
            inert={isPlaceholderData ? true : undefined}
            className={cn(
              isPlaceholderData && 'pointer-events-none opacity-60'
            )}
          >
            {isLoading ? (
              <DataTableSkeletonRows
                columnCount={visibleColumnCount}
                label={loadingLabel}
              />
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnCount}
                  className='h-24 text-center'
                >
                  <div
                    role='alert'
                    className='inline-flex items-center gap-2 text-destructive'
                  >
                    <TriangleAlert aria-hidden='true' className='size-4' />
                    <span>{errorLabel}</span>
                    {onRetry ? (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='ms-2'
                        aria-label='Retry loading data'
                        onClick={onRetry}
                      >
                        <RefreshCw
                          data-icon='inline-start'
                          aria-hidden='true'
                        />
                        Retry
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={getRowClickLabel?.(row.original)}
                  className={cn(
                    'group/row',
                    onRowClick &&
                      'cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset'
                  )}
                  onClick={
                    onRowClick
                      ? (event) => handleRowClick(event, row.original)
                      : undefined
                  }
                  onKeyDown={
                    onRowClick
                      ? (event) => handleRowKeyDown(event, row.original)
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                        cell.column.columnDef.meta?.className,
                        cell.column.columnDef.meta?.tdClassName
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnCount}
                  className='h-24 text-center text-muted-foreground'
                >
                  {emptyLabel}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        table={table}
        className='mt-auto shrink-0'
        pageSizeOptions={pageSizeOptions}
        totalRows={pageData?.total}
        disabled={isLoading || isPlaceholderData}
      />
      {renderBulkActions?.(table)}
    </div>
  )
}
