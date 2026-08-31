import type { ColumnDef } from '@tanstack/react-table'
import { type Mock, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { ServerDataTable } from './server-table'
import { DataTableToolbar } from './toolbar'

interface RowData {
  id: string
  name: string
}

const columns: ColumnDef<RowData>[] = [
  { accessorKey: 'name', header: 'Name', enableHiding: false },
]

function applyLastSearch(
  navigate: Mock<NavigateFn>,
  previous: Record<string, unknown>
) {
  const lastCall = navigate.mock.calls[navigate.mock.calls.length - 1]
  const search = lastCall?.[0].search
  return typeof search === 'function' ? search(previous) : search
}

describe('ServerDataTable', () => {
  it('renders one server page and navigates without paginating it locally', async () => {
    const navigate = vi.fn<NavigateFn>()
    const screen = await render(
      <ServerDataTable
        pageData={{
          items: [
            { id: '3', name: 'Third' },
            { id: '4', name: 'Fourth' },
          ],
          page: 2,
          pageSize: 2,
          total: 5,
        }}
        columns={columns}
        search={{ page: 2, pageSize: 2 }}
        navigate={navigate}
        defaultPageSize={2}
        getRowId={(row) => row.id}
      />
    )

    await expect.element(screen.getByText('Third')).toBeInTheDocument()
    await expect.element(screen.getByText('Fourth')).toBeInTheDocument()
    const paginationStatus = screen.getByText('Page 2 of 3 · 5 rows')
    await expect.element(paginationStatus).toBeInTheDocument()
    await expect.element(paginationStatus).toHaveClass('whitespace-nowrap')

    await userEvent.click(
      screen.getByRole('button', { name: 'Go to next page' })
    )

    expect(applyLastSearch(navigate, { page: 2, pageSize: 2 })).toMatchObject({
      page: 3,
      pageSize: undefined,
    })
  })

  it('opens interactive rows by pointer or keyboard without hijacking row controls', async () => {
    const openRow = vi.fn<(row: RowData) => void>()
    const runAction = vi.fn()
    const screen = await render(
      <ServerDataTable
        pageData={{
          items: [{ id: '3', name: 'Third' }],
          page: 1,
          pageSize: 20,
          total: 1,
        }}
        columns={[
          ...columns,
          {
            id: 'actions',
            cell: () => <button onClick={runAction}>Edit row</button>,
          },
        ]}
        search={{}}
        navigate={vi.fn()}
        getRowId={(row) => row.id}
        onRowClick={openRow}
        getRowClickLabel={(row) => `Open ${row.name}`}
      />
    )

    const row = screen.getByRole('row', { name: 'Open Third' })
    await userEvent.click(screen.getByText('Third'))
    expect(openRow).toHaveBeenCalledWith({ id: '3', name: 'Third' })

    row.element().focus()
    await userEvent.keyboard('{Enter}')
    expect(openRow).toHaveBeenCalledTimes(2)

    await userEvent.click(screen.getByRole('button', { name: 'Edit row' }))
    expect(runAction).toHaveBeenCalledOnce()
    expect(openRow).toHaveBeenCalledTimes(2)
  })

  it('renders stable loading, error, and empty states', async () => {
    const retry = vi.fn()
    const navigate = vi.fn<NavigateFn>()
    const loading = await render(
      <ServerDataTable
        columns={columns}
        search={{ page: 3 }}
        navigate={navigate}
        isLoading
        renderToolbar={() => <div />}
      />
    )
    const loadingStatus = loading.getByRole('status')
    await expect.element(loadingStatus).toHaveTextContent('Loading data...')
    expect(
      loadingStatus
        .element()
        .closest('tbody')
        ?.querySelectorAll('[data-slot="data-table-skeleton-row"]')
    ).toHaveLength(5)
    expect(
      document.querySelector('[data-slot="data-table-search-skeleton"]')
    ).not.toBeNull()
    expect(navigate).not.toHaveBeenCalled()

    const failed = await render(
      <ServerDataTable
        pageData={{ items: [], page: 1, pageSize: 20, total: 0 }}
        columns={columns}
        search={{}}
        navigate={vi.fn()}
        error={new Error('network')}
        onRetry={retry}
      />
    )
    await userEvent.click(
      failed.getByRole('button', { name: 'Retry loading data' })
    )
    expect(retry).toHaveBeenCalledOnce()

    const empty = await render(
      <ServerDataTable
        pageData={{ items: [], page: 1, pageSize: 20, total: 0 }}
        columns={columns}
        search={{}}
        navigate={vi.fn()}
      />
    )
    await expect.element(empty.getByText('No results.')).toBeInTheDocument()
  })

  it('refreshes without replacing the current rows', async () => {
    const refresh = vi.fn()
    const screen = await render(
      <ServerDataTable
        pageData={{
          items: [{ id: '1', name: 'Existing row' }],
          page: 1,
          pageSize: 20,
          total: 1,
        }}
        columns={columns}
        search={{}}
        navigate={vi.fn()}
        isRefreshing
        onRefresh={refresh}
      />
    )

    await expect.element(screen.getByText('Existing row')).toBeInTheDocument()
    await expect
      .element(screen.getByRole('table'))
      .toHaveAttribute('aria-busy', 'true')
    await expect
      .element(screen.getByRole('button', { name: 'Refresh data' }))
      .toBeDisabled()
  })

  it('does not correct the URL or enable stale pagination for placeholder data', async () => {
    const navigate = vi.fn<NavigateFn>()
    const screen = await render(
      <ServerDataTable
        pageData={{
          items: [{ id: 'stale', name: 'Previous query row' }],
          page: 1,
          pageSize: 20,
          total: 1,
        }}
        columns={columns}
        search={{ page: 3 }}
        navigate={navigate}
        isRefreshing
        isPlaceholderData
      />
    )

    await expect.element(screen.getByText('Previous query row')).toBeVisible()
    await expect
      .element(screen.getByRole('button', { name: 'Go to previous page' }))
      .toBeDisabled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('keeps filters in the URL and restores the standard toolbar interaction', async () => {
    const navigate = vi.fn<NavigateFn>()
    const screen = await render(
      <ServerDataTable
        pageData={{ items: [], page: 2, pageSize: 20, total: 50 }}
        columns={columns}
        search={{ page: 2 }}
        navigate={navigate}
        columnFilters={[
          { columnId: 'name', searchKey: 'search', type: 'string' },
        ]}
        renderToolbar={(table) => (
          <DataTableToolbar
            table={table}
            searchKey='name'
            searchPlaceholder='Search rows…'
            searchAriaLabel='Search rows by name'
            showViewOptions={false}
          />
        )}
      />
    )

    const searchInput = screen.getByRole('searchbox', {
      name: 'Search rows by name',
    })
    await expect.element(searchInput).toHaveAttribute('name', 'name')
    await expect.element(searchInput).toHaveAttribute('autocomplete', 'off')
    await expect.element(searchInput).toHaveAttribute('spellcheck', 'false')

    await userEvent.type(searchInput, 'coach')

    expect(applyLastSearch(navigate, { page: 2 })).toMatchObject({
      page: undefined,
      search: 'coach',
    })
  })

  it('allows a feature to own one atomic reset from the shared toolbar', async () => {
    const resetFilters = vi.fn()
    const screen = await render(
      <ServerDataTable
        pageData={{ items: [], page: 1, pageSize: 20, total: 0 }}
        columns={columns}
        search={{}}
        navigate={vi.fn()}
        renderToolbar={(table) => (
          <DataTableToolbar
            table={table}
            showViewOptions={false}
            externalFilterActive
            onResetFilters={resetFilters}
          />
        )}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }))

    expect(resetFilters).toHaveBeenCalledOnce()
  })

  it('applies default column visibility from column metadata', async () => {
    const screen = await render(
      <ServerDataTable
        pageData={{
          items: [{ id: 'hidden-id', name: 'Visible name' }],
          page: 1,
          pageSize: 20,
          total: 1,
        }}
        columns={[
          {
            id: 'id',
            accessorKey: 'id',
            header: 'ID',
            meta: { defaultVisible: false },
          },
          { accessorKey: 'name', header: 'Name' },
        ]}
        search={{}}
        navigate={vi.fn()}
      />
    )

    await expect.element(screen.getByText('Visible name')).toBeVisible()
    await expect.element(screen.getByText('hidden-id')).not.toBeInTheDocument()
  })

  it('clears row selection before navigating to another page', async () => {
    const navigate = vi.fn<NavigateFn>()
    const screen = await render(
      <ServerDataTable
        pageData={{
          items: [{ id: 'row-1', name: 'First row' }],
          page: 1,
          pageSize: 1,
          total: 2,
        }}
        columns={[
          ...columns,
          {
            id: 'selection',
            cell: ({ row }) => (
              <button onClick={() => row.toggleSelected()}>
                {row.getIsSelected() ? 'Selected' : 'Select row'}
              </button>
            ),
          },
        ]}
        search={{ pageSize: 1 }}
        navigate={navigate}
        defaultPageSize={1}
        getRowId={(row) => row.id}
        enableRowSelection
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Select row' }))
    await expect
      .element(screen.getByRole('button', { name: 'Selected' }))
      .toBeVisible()

    await userEvent.click(
      screen.getByRole('button', { name: 'Go to next page' })
    )

    await expect
      .element(screen.getByRole('button', { name: 'Select row' }))
      .toBeVisible()
    expect(navigate).toHaveBeenCalledOnce()
  })
})
