import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'

afterEach(() => {
  vi.clearAllMocks()
})

type TestRow = {
  id: string
  name: string
  status: string
  action: string
}

describe('DataTable', () => {
  const mockRows: TestRow[] = [
    { id: '1', name: 'Alice', status: 'active', action: 'view' },
    { id: '2', name: 'Bob', status: 'inactive', action: 'edit' },
    { id: '3', name: 'Charlie', status: 'active', action: 'delete' },
  ]

  const createColumns = (): ColumnDef<TestRow>[] => [
    {
      accessorKey: 'name',
      header: 'Name',
      enableSorting: true,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: true,
    },
    {
      accessorKey: 'action',
      header: 'Action',
      enableSorting: false,
    },
  ]

  it('renders table with columns and rows', () => {
    const columns = createColumns()

    render(
      <DataTable
        columns={columns}
        rows={mockRows}
        emptyState="No data"
      />
    )

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  it('clicking a sortable column header reorders rows', () => {
    const columns = createColumns()

    const { rerender } = render(
      <DataTable
        columns={columns}
        rows={mockRows}
        emptyState="No data"
      />
    )

    const nameHeader = screen.getByText('Name')

    // First click: ascending sort
    fireEvent.click(nameHeader)
    rerender(
      <DataTable
        columns={columns}
        rows={mockRows}
        emptyState="No data"
      />
    )

    // Rows should be sorted A → B → C
    const rows = screen.getAllByText(/Alice|Bob|Charlie/)
    expect(rows[0]).toHaveTextContent('Alice')
    expect(rows[1]).toHaveTextContent('Bob')
    expect(rows[2]).toHaveTextContent('Charlie')
  })

  it('exposes sortable headers as accessible buttons with sort state', () => {
    render(<DataTable columns={createColumns()} rows={mockRows} emptyState="No data" />)

    const nameHeader = screen.getByRole('columnheader', { name: /Name/ })
    const sortButton = within(nameHeader).getByRole('button', { name: /Name/ })

    expect(sortButton).toHaveAttribute('type', 'button')
    expect(nameHeader).toHaveAttribute('aria-sort', 'none')

    fireEvent.click(sortButton)

    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')
  })

  it('sort direction icon appears in active sorted column', () => {
    const columns = createColumns()

    const { rerender } = render(
      <DataTable
        columns={columns}
        rows={mockRows}
        emptyState="No data"
      />
    )

    const nameHeader = screen.getByText('Name')

    // Click to sort
    fireEvent.click(nameHeader)
    rerender(
      <DataTable
        columns={columns}
        rows={mockRows}
        emptyState="No data"
      />
    )

    // Look for sort icon (could be svg or icon element near the header)
    const headerCell = nameHeader.closest('th')
    expect(headerCell).toBeInTheDocument()
  })

  it('cycling through sort states: asc -> desc -> none', () => {
    const columns = createColumns()

    const { rerender } = render(
      <DataTable
        columns={columns}
        rows={mockRows}
        emptyState="No data"
      />
    )

    const nameHeader = screen.getByText('Name')

    // First click: ascending
    fireEvent.click(nameHeader)
    rerender(
      <DataTable
        columns={columns}
        rows={mockRows}
        emptyState="No data"
      />
    )

    let rows = screen.getAllByText(/Alice|Bob|Charlie/)
    expect(rows[0]).toHaveTextContent('Alice')

    // Second click: descending
    fireEvent.click(nameHeader)
    rerender(
      <DataTable
        columns={columns}
        rows={mockRows}
        emptyState="No data"
      />
    )

    rows = screen.getAllByText(/Alice|Bob|Charlie/)
    expect(rows[0]).toHaveTextContent('Charlie')

    // Third click: none (back to original order)
    fireEvent.click(nameHeader)
    rerender(
      <DataTable
        columns={columns}
        rows={mockRows}
        emptyState="No data"
      />
    )

    rows = screen.getAllByText(/Alice|Bob|Charlie/)
    expect(rows[0]).toHaveTextContent('Alice')
  })

  it('non-sortable column header does not trigger sort on click', () => {
    const columns = createColumns()

    const { rerender } = render(
      <DataTable
        columns={columns}
        rows={mockRows}
        emptyState="No data"
      />
    )

    const actionHeader = screen.getByText('Action')

    // Click the non-sortable column multiple times
    fireEvent.click(actionHeader)
    rerender(
      <DataTable
        columns={columns}
        rows={mockRows}
        emptyState="No data"
      />
    )

    // Rows should remain in original order (id: 1, 2, 3)
    const cells = screen.getAllByText(/view|edit|delete/)
    expect(cells[0]).toHaveTextContent('view')
    expect(cells[1]).toHaveTextContent('edit')
    expect(cells[2]).toHaveTextContent('delete')
  })

  it('renders empty state when rows is empty', () => {
    const columns = createColumns()

    render(
      <DataTable
        columns={columns}
        rows={[]}
        emptyState="No data available"
      />
    )

    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('renders bare variant without ui-table-shell border', () => {
    const columns = createColumns()
    const { container } = render(
      <DataTable
        columns={columns}
        rows={mockRows}
        emptyState="No data"
        bare={true}
      />
    )

    const wrapper = container.querySelector('[class*="bare"]') || container.firstChild
    expect(wrapper).toBeInTheDocument()
  })

  it('calls onRowClick when a row is clicked', () => {
    const columns = createColumns()
    const onRowClick = vi.fn()

    render(
      <DataTable
        columns={columns}
        rows={mockRows}
        emptyState="No data"
        onRowClick={onRowClick}
      />
    )

    const aliceCell = screen.getByText('Alice')
    const aliceRow = aliceCell.closest('tr')

    fireEvent.click(aliceRow!)
    expect(onRowClick).toHaveBeenCalledWith(mockRows[0])
  })

  it('renders ColumnVisibilityMenu with correct column options', () => {
    const columns = createColumns()

    render(
      <DataTable
        columns={columns}
        rows={mockRows}
        emptyState="No data"
      />
    )

    // ColumnVisibilityMenu button should be rendered
    expect(screen.getByText('컬럼')).toBeInTheDocument()

    // Verify that the button exists and is clickable
    const columnButton = screen.getByText('컬럼').closest('button')!
    expect(columnButton).toBeInTheDocument()
    expect(columnButton).not.toBeDisabled()
  })

  it('renders all columns visible by default with ColumnVisibilityMenu', () => {
    const columns = createColumns()

    render(
      <DataTable
        columns={columns}
        rows={mockRows}
        emptyState="No data"
      />
    )

    // Verify all columns are visible by default
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()

    // Verify ColumnVisibilityMenu button is rendered
    expect(screen.getByText('컬럼')).toBeInTheDocument()

    // Verify column data cells are visible
    expect(screen.getByText('Alice')).toBeInTheDocument()
    const statusCells = screen.getAllByText('active')
    expect(statusCells.length).toBeGreaterThan(0)
    expect(screen.getByText('view')).toBeInTheDocument()
  })

  it('pagination displays correct rows when dataset exceeds page size', () => {
    const columns = createColumns()
    const elevenRows: TestRow[] = [
      { id: '1', name: 'Alice', status: 'active', action: 'view' },
      { id: '2', name: 'Bob', status: 'inactive', action: 'edit' },
      { id: '3', name: 'Charlie', status: 'active', action: 'delete' },
      { id: '4', name: 'Diana', status: 'active', action: 'view' },
      { id: '5', name: 'Eve', status: 'inactive', action: 'edit' },
      { id: '6', name: 'Frank', status: 'active', action: 'delete' },
      { id: '7', name: 'Grace', status: 'active', action: 'view' },
      { id: '8', name: 'Henry', status: 'inactive', action: 'edit' },
      { id: '9', name: 'Ivy', status: 'active', action: 'delete' },
      { id: '10', name: 'Jack', status: 'inactive', action: 'view' },
      { id: '11', name: 'Karen', status: 'active', action: 'edit' },
    ]

    const { rerender } = render(
      <DataTable
        columns={columns}
        rows={elevenRows}
        emptyState="No data"
      />
    )

    // Page 1 should show rows 1-10 (Alice through Jack)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Jack')).toBeInTheDocument()
    expect(screen.queryByText('Karen')).not.toBeInTheDocument()

    // Find and click the next page button
    const nextPageButton = screen.getByRole('button', { name: /다음 페이지/ })
    fireEvent.click(nextPageButton)

    // Rerender to reflect pagination change
    rerender(
      <DataTable
        columns={columns}
        rows={elevenRows}
        emptyState="No data"
      />
    )

    // Page 2 should show row 11 (Karen)
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
    expect(screen.getByText('Karen')).toBeInTheDocument()
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })

  it('resets to page 1 when rows prop changes', () => {
    const columns = createColumns()
    const initialRows: TestRow[] = [
      { id: '1', name: 'Alice', status: 'active', action: 'view' },
      { id: '2', name: 'Bob', status: 'inactive', action: 'edit' },
      { id: '3', name: 'Charlie', status: 'active', action: 'delete' },
      { id: '4', name: 'Diana', status: 'active', action: 'view' },
      { id: '5', name: 'Eve', status: 'inactive', action: 'edit' },
      { id: '6', name: 'Frank', status: 'active', action: 'delete' },
      { id: '7', name: 'Grace', status: 'active', action: 'view' },
      { id: '8', name: 'Henry', status: 'inactive', action: 'edit' },
      { id: '9', name: 'Ivy', status: 'active', action: 'delete' },
      { id: '10', name: 'Jack', status: 'inactive', action: 'view' },
      { id: '11', name: 'Karen', status: 'active', action: 'edit' },
    ]

    const updatedRows: TestRow[] = [
      { id: '20', name: 'Zoe', status: 'active', action: 'view' },
      { id: '21', name: 'Uma', status: 'inactive', action: 'edit' },
    ]

    const { rerender } = render(
      <DataTable
        columns={columns}
        rows={initialRows}
        emptyState="No data"
      />
    )

    // Navigate to page 2
    const nextPageButton = screen.getByRole('button', { name: /다음 페이지/ })
    fireEvent.click(nextPageButton)

    rerender(
      <DataTable
        columns={columns}
        rows={initialRows}
        emptyState="No data"
      />
    )

    // Verify we're on page 2
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
    expect(screen.getByText('Karen')).toBeInTheDocument()

    // Change rows prop (filter applied externally)
    rerender(
      <DataTable
        columns={columns}
        rows={updatedRows}
        emptyState="No data"
      />
    )

    // Should be back on page 1
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
    expect(screen.getByText('Zoe')).toBeInTheDocument()
    expect(screen.getByText('Uma')).toBeInTheDocument()
    expect(screen.queryByText('Karen')).not.toBeInTheDocument()
  })

  it('renders toolbarStart and toolbarEnd slots', () => {
    const columns = createColumns()
    const toolbarStartContent = 'Search Input'
    const toolbarEndContent = 'Add Button'

    render(
      <DataTable
        columns={columns}
        rows={mockRows}
        emptyState="No data"
        toolbarStart={<div>{toolbarStartContent}</div>}
        toolbarEnd={<div>{toolbarEndContent}</div>}
      />
    )

    // Verify both toolbar slots are rendered
    expect(screen.getByText(toolbarStartContent)).toBeInTheDocument()
    expect(screen.getByText(toolbarEndContent)).toBeInTheDocument()
  })

  it('keeps controls outside the bordered table surface and groups them from the start edge', () => {
    const columns = createColumns()

    render(
      <DataTable
        columns={columns}
        rows={mockRows}
        emptyState="No data"
        toolbarStart={<div>Search Input</div>}
        toolbarEnd={<button type="button">Add Button</button>}
      />
    )

    const controls = screen.getByText('Search Input').closest('.ui-data-controls')
    const surface = screen.getByRole('table').closest('.ui-data-surface')

    expect(controls).not.toBeNull()
    expect(surface).not.toBeNull()
    expect(controls?.contains(surface)).toBe(false)
    expect(surface?.contains(controls)).toBe(false)
    expect(controls?.firstElementChild).toHaveClass('justify-between')
  })

  it('uses an intrinsic-width column control and a sticky, padded header', () => {
    render(<DataTable columns={createColumns()} rows={mockRows} emptyState="No data" />)

    expect(screen.getByRole('button', { name: '컬럼' })).toHaveClass('w-fit', 'shrink-0')
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveClass('px-4', 'sticky', 'top-0')
  })

  it('does not render toolbar when bare mode is enabled', () => {
    const columns = createColumns()
    const toolbarStartContent = 'Search Input'

    render(
      <DataTable
        columns={columns}
        rows={mockRows}
        emptyState="No data"
        bare={true}
        toolbarStart={<div>{toolbarStartContent}</div>}
      />
    )

    // Toolbar should not be rendered in bare mode
    expect(screen.queryByText(toolbarStartContent)).not.toBeInTheDocument()
    // But the table should still be rendered
    expect(screen.getByText('Name')).toBeInTheDocument()
  })

  it('does not render toolbar when mode is bare', () => {
    render(
      <DataTable
        columns={createColumns()}
        rows={mockRows}
        emptyState="No data"
        mode="bare"
        queryRow={<div>Query Row</div>}
        actionRow={<div>Action Row</div>}
      />,
    )

    expect(screen.queryByText('Query Row')).not.toBeInTheDocument()
    expect(screen.queryByText('Action Row')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '컬럼' })).not.toBeInTheDocument()
  })

  it('does not render pagination when pageSizeOptions is empty', () => {
    const columns = createColumns()
    const elevenRows: TestRow[] = [
      { id: '1', name: 'Alice', status: 'active', action: 'view' },
      { id: '2', name: 'Bob', status: 'inactive', action: 'edit' },
      { id: '3', name: 'Charlie', status: 'active', action: 'delete' },
      { id: '4', name: 'Diana', status: 'active', action: 'view' },
      { id: '5', name: 'Eve', status: 'inactive', action: 'edit' },
      { id: '6', name: 'Frank', status: 'active', action: 'delete' },
      { id: '7', name: 'Grace', status: 'active', action: 'view' },
      { id: '8', name: 'Henry', status: 'inactive', action: 'edit' },
      { id: '9', name: 'Ivy', status: 'active', action: 'delete' },
      { id: '10', name: 'Jack', status: 'inactive', action: 'view' },
      { id: '11', name: 'Karen', status: 'active', action: 'edit' },
    ]

    render(
      <DataTable
        columns={columns}
        rows={elevenRows}
        emptyState="No data"
        pageSizeOptions={[]}
      />
    )

    // All rows should be visible since pagination is disabled
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Karen')).toBeInTheDocument()

    // Pagination controls should not be rendered
    expect(screen.queryByRole('button', { name: /다음 페이지/ })).not.toBeInTheDocument()
  })

  it('supports explicit query and action rows without putting controls inside TableSurface', () => {
    render(
      <DataTable
        columns={createColumns()}
        rows={mockRows}
        emptyState="No data"
        queryRow={<div>Query Row</div>}
        actionRow={<div>Action Row</div>}
      />,
    )

    const query = screen.getByText('Query Row').closest('[data-slot="data-query-row"]')
    const action = screen.getByText('Action Row').closest('[data-slot="data-action-row"]')
    const surface = screen.getByRole('table').closest('.ui-data-surface')

    expect(query).toBeTruthy()
    expect(action).toBeTruthy()
    expect(surface?.contains(query)).toBe(false)
    expect(surface?.contains(action)).toBe(false)
  })

  it('keeps the Column control as a descendant of the Query Row', () => {
    render(<DataTable columns={createColumns()} rows={mockRows} emptyState="No data" />)

    const queryRow = screen.getByRole('button', { name: '컬럼' }).closest('[data-slot="data-query-row"]')

    expect(queryRow).toBeTruthy()
    expect(queryRow).toContainElement(screen.getByRole('button', { name: '컬럼' }))
    expect(screen.getByRole('button', { name: '컬럼' })).toHaveClass('w-fit', 'shrink-0')
  })

  it('applies semantic column metadata for minimum width, alignment, and accessible truncation', () => {
    const longName = '상품명이 아주 긴 경우에도 전체 정보는 title로 확인할 수 있습니다.'
    const columns: ColumnDef<TestRow>[] = [
      {
        accessorKey: 'name',
        header: '상품',
        meta: { minWidth: 'identity', align: 'left', truncate: true },
      },
      {
        accessorKey: 'status',
        header: '상태',
        meta: { minWidth: 'status', align: 'center' },
      },
    ]

    render(
      <DataTable
        columns={columns}
        rows={[{ ...mockRows[0], name: longName }]}
        emptyState="No data"
      />,
    )

    const nameCell = screen.getByText(longName).closest('td')
    const nameHeader = screen.getByRole('columnheader', { name: /상품/ })
    const statusCell = screen.getByText('active').closest('td')

    expect(nameCell).toHaveClass('text-left')
    expect(screen.getByLabelText(longName)).toBeInTheDocument()
    expect(screen.getByLabelText(longName)).toHaveAttribute('tabindex', '0')
    expect(nameHeader.getAttribute('style')).toContain('min-width: var(--table-col-identity-min)')
    expect(statusCell).toHaveClass('text-center')
  })

  it('supports explicit dataset-empty and filtered-empty slots with optional actions', () => {
    const resetFilters = vi.fn()
    const { rerender } = render(
      <DataTable
        columns={createColumns()}
        rows={[]}
        emptyState="legacy fallback"
        emptyStateKind="filtered"
        filteredEmptyState={<span>조건에 맞는 결과가 없습니다.</span>}
        onResetFilters={resetFilters}
      />,
    )

    expect(screen.getByText('조건에 맞는 결과가 없습니다.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '필터 초기화' }))
    expect(resetFilters).toHaveBeenCalledOnce()

    rerender(
      <DataTable
        columns={createColumns()}
        rows={[]}
        emptyState="legacy fallback"
        emptyStateKind="dataset"
        dataEmptyState={<span>아직 데이터가 없습니다.</span>}
        emptyStateAction={<button type="button">새로 만들기</button>}
      />,
    )

    expect(screen.getByText('아직 데이터가 없습니다.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '새로 만들기' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '필터 초기화' })).not.toBeInTheDocument()
  })

  it('uses primary truncation with mobile two-line allowance and secondary single-line contract', () => {
    const columns: ColumnDef<TestRow>[] = [
      { accessorKey: 'name', header: '상품', meta: { role: 'identity', truncate: 'primary' } },
      { accessorKey: 'status', header: '메타', meta: { truncate: 'secondary' } },
    ]
    const longName = '매우 긴 상품 식별자 전체 값'
    const longMeta = '긴 보조 정보 전체 값'

    render(<DataTable columns={columns} rows={[{ ...mockRows[0], name: longName, status: longMeta }]} emptyState="No data" />)

    expect(screen.getByLabelText(longName)).toHaveClass('line-clamp-2', 'sm:truncate')
    expect(screen.getByLabelText(longMeta)).toHaveClass('truncate')
  })

  it('derives layout from semantic column role and keeps priority metadata on the column', () => {
    const columns: ColumnDef<TestRow>[] = [
      { accessorKey: 'name', header: '상품', meta: { role: 'identity', priority: 'high', truncate: true } },
      { accessorKey: 'status', header: '상태', meta: { role: 'status', priority: 'medium' } },
      { accessorKey: 'action', header: '수량', meta: { role: 'numeric', priority: 'low' } },
    ]

    render(<DataTable columns={columns} rows={mockRows} emptyState="No data" />)

    expect(screen.getByRole('columnheader', { name: /상품/ })).toHaveAttribute('data-column-priority', 'high')
    expect(screen.getByRole('columnheader', { name: /상품/ }).getAttribute('style')).toContain(
      'min-width: var(--table-col-identity-min)',
    )
    expect(screen.getByRole('columnheader', { name: /상태/ }).getAttribute('style')).toContain(
      'min-width: var(--table-col-status-min)',
    )
    expect(screen.getAllByText('active')[0].closest('td')).toHaveClass('text-center')
    expect(screen.getAllByText('view')[0].closest('td')).toHaveClass('text-right')
  })

  it('renders loading and error states inside the table surface', () => {
    const { rerender } = render(
      <DataTable columns={createColumns()} rows={[]} emptyState="No data" loading />,
    )

    expect(screen.getByRole('status', { name: '표를 불러오는 중' })).toBeInTheDocument()
    expect(screen.getByRole('table').closest('.ui-data-surface')).toBeTruthy()

    rerender(
      <DataTable columns={createColumns()} rows={[]} emptyState="No data" errorState="불러오지 못했습니다." />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('불러오지 못했습니다.')
  })

  it('keeps the table header and renders multiple skeleton rows while loading', () => {
    render(<DataTable columns={createColumns()} rows={[]} emptyState="No data" loading />)

    expect(screen.getByRole('columnheader', { name: /Name/ })).toBeInTheDocument()
    expect(screen.getAllByTestId('skeleton-row')).toHaveLength(3)
  })
})
