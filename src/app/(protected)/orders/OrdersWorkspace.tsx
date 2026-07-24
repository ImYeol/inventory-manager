'use client'

import { useMemo, useState, useTransition } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { StatusBadge, type BadgeTone } from '@/components/ui/badge-1'
import { Button } from '@/components/ui/button'
import { ChannelBadge } from '@/components/ui/channel-badge'
import { DataTable } from '@/components/ui/data-table'
import { ResponsiveFilterControls } from '@/components/ui/filter-toolbar'
import { Input } from '@/components/ui/input'
import { ProductVariantCombobox, type ProductVariantOption } from '@/components/ui/product-variant-combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DialogTitle, WorkDialog, WorkDialogBody, WorkDialogContent, WorkDialogFooter, WorkDialogHeader } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { assignOrderLine, syncOrders } from '@/lib/actions/order-sync'
import type { SavedTrackingPreset } from '@/lib/actions/tracking-import'
import TrackingImportWorkspace from './tracking-import/tracking-import-workspace'

type OrderLine = {
  id: number
  quantity: number
  line_status: string
  product_variants: { seller_sku: string } | null
  inventory_reservations: Array<{ warehouse_id: number; status: string }>
}

type OrderRow = {
  id: number
  channel: 'naver' | 'coupang'
  external_order_id: string
  order_status: string
  ordered_at: string | null
  channel_order_lines: OrderLine[]
}

type Warehouse = { id: number; name: string }
type Assignment = { variantId: string | null; warehouseId: string }

const views = ['신규', '출고 준비', '확인 필요', '발송 완료'] as const
export type OrderView = (typeof views)[number]

const statusLabels: Record<string, { label: string; tone: BadgeTone }> = {
  NEW: { label: '신규', tone: 'info' },
  PENDING: { label: '신규', tone: 'info' },
  RESERVED: { label: '출고 준비', tone: 'success' },
  MAPPING_REQUIRED: { label: '매핑 확인', tone: 'warning' },
  EXCEPTION: { label: '확인 필요', tone: 'warning' },
  FULFILLED: { label: '발송 완료', tone: 'success' },
  SHIPPED: { label: '발송 완료', tone: 'success' },
  CANCELLED: { label: '취소', tone: 'neutral' },
}

function orderStatus(status: string) {
  return statusLabels[status] ?? { label: status || '확인 필요', tone: 'neutral' as BadgeTone }
}

function isException(status: string) {
  return status === 'MAPPING_REQUIRED' || status === 'EXCEPTION'
}

export default function OrdersWorkspace({
  orders,
  variants,
  warehouses,
  initialView = '신규',
  trackingPresets = [],
}: {
  orders: OrderRow[]
  variants: ProductVariantOption[]
  warehouses: Warehouse[]
  initialView?: OrderView
  trackingPresets?: SavedTrackingPreset[]
}) {
  const [view, setView] = useState<OrderView>(initialView)
  const [search, setSearch] = useState('')
  const [channel, setChannel] = useState<'all' | 'naver' | 'coupang'>('all')
  const [assignments, setAssignments] = useState<Record<number, Assignment>>({})
  const [lineStatuses, setLineStatuses] = useState<Record<number, string>>({})
  const [message, setMessage] = useState('')
  const [isTrackingImportOpen, setIsTrackingImportOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const rows = useMemo(() => orders.filter((order) => {
    const line = order.channel_order_lines[0]
    const lineStatus = line ? lineStatuses[line.id] ?? line.line_status : order.order_status
    const matchesView = view === '신규'
      ? lineStatus === 'NEW' || lineStatus === 'PENDING'
      : view === '출고 준비'
        ? lineStatus === 'RESERVED'
        : view === '확인 필요'
          ? isException(lineStatus)
          : /FULFILLED|SHIPPED|발송/.test(lineStatus ?? order.order_status)

    const searchValue = `${order.external_order_id} ${line?.product_variants?.seller_sku ?? ''}`.toLowerCase()
    return matchesView && (channel === 'all' || order.channel === channel) && searchValue.includes(search.toLowerCase())
  }), [channel, lineStatuses, orders, search, view])

  const resetFilters = () => {
    setSearch('')
    setChannel('all')
  }

  const updateAssignment = (lineId: number, patch: Partial<Assignment>) => {
    setAssignments((current) => {
      const base: Assignment = current[lineId] ?? { variantId: null, warehouseId: '' }
      return { ...current, [lineId]: { ...base, ...patch } }
    })
  }

  const assign = (line: OrderLine) => {
    const selection = assignments[line.id]
    if (!selection?.variantId || !selection.warehouseId) {
      setMessage('상품 옵션과 배정 창고를 모두 선택하세요.')
      return
    }

    startTransition(async () => {
      try {
        await assignOrderLine({ lineId: line.id, variantId: Number(selection.variantId), warehouseId: Number(selection.warehouseId) })
        setLineStatuses((current) => ({ ...current, [line.id]: 'RESERVED' }))
        setMessage('배정을 저장했습니다. 주문이 출고 준비로 이동했습니다.')
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '주문 배정에 실패했습니다.')
      }
    })
  }

  const orderColumns: ColumnDef<OrderRow, unknown>[] = [
    {
      id: 'channel',
      header: '채널',
      enableSorting: false,
      enableHiding: false,
      meta: { role: 'status', minWidth: 'status', align: 'center', priority: 'high' },
      cell: ({ row }) => <ChannelBadge channel={row.original.channel} listingStatus="active" compact />,
    },
    {
      id: 'order',
      accessorFn: (order) => order.external_order_id,
      header: '주문번호 / 상품',
      enableHiding: false,
      meta: { role: 'identity', minWidth: 'identity', truncate: 'primary', priority: 'high' },
      cell: ({ row }) => {
        const line = row.original.channel_order_lines[0]
        return (
          <div>
            <p className="font-medium text-[color:var(--foreground)]">{row.original.external_order_id}</p>
            <p>{line?.product_variants?.seller_sku ?? '매핑 필요'}</p>
          </div>
        )
      },
    },
    {
      id: 'quantity',
      accessorFn: (order) => order.channel_order_lines[0]?.quantity ?? 0,
      header: '수량',
      meta: { role: 'numeric', minWidth: 'numeric', align: 'right', priority: 'high' },
      cell: ({ getValue }) => getValue<number>(),
    },
    {
      id: 'warehouse',
      header: '배정 창고',
      enableSorting: false,
      meta: { role: 'text', minWidth: 'identity', priority: 'medium' },
      cell: ({ row }) => {
        const order = row.original
        const line = order.channel_order_lines[0]
        const currentStatus = line ? lineStatuses[line.id] ?? line.line_status : order.order_status
        const assignedWarehouse = warehouses.find((warehouse) => warehouse.id === line?.inventory_reservations[0]?.warehouse_id)
        if (!line || !isException(currentStatus)) return assignedWarehouse?.name ?? '-'
        const selection = assignments[line.id] ?? { variantId: null, warehouseId: '' }
        return (
          <div className="flex min-w-[18rem] items-center gap-2">
            <ProductVariantCombobox variants={variants} value={selection.variantId} onValueChange={(variantId) => updateAssignment(line.id, { variantId })} aria-label="상품 옵션 선택" className="w-36" />
            <Select value={selection.warehouseId} onValueChange={(warehouseId) => updateAssignment(line.id, { warehouseId })}>
              <SelectTrigger aria-label="배정 창고 선택" className="w-32 ui-control-sm"><SelectValue placeholder="창고" /></SelectTrigger>
              <SelectContent>{warehouses.map((warehouse) => <SelectItem key={warehouse.id} value={String(warehouse.id)}>{warehouse.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={() => assign(line)}>배정</Button>
          </div>
        )
      },
    },
    {
      id: 'status',
      accessorFn: (order) => {
        const line = order.channel_order_lines[0]
        return line ? lineStatuses[line.id] ?? line.line_status : order.order_status
      },
      header: '주문 / 발송 상태',
      meta: { role: 'status', minWidth: 'status', align: 'center', priority: 'high' },
      cell: ({ getValue }) => {
        const status = orderStatus(getValue<string>())
        return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      },
    },
    {
      id: 'orderedAt',
      accessorFn: (order) => order.ordered_at,
      header: '주문일',
      meta: { role: 'text', minWidth: 'status', priority: 'low' },
      cell: ({ getValue }) => {
        const value = getValue<string | null>()
        return value ? new Date(value).toLocaleDateString('ko-KR') : '-'
      },
    },
  ]

  return (
    <div className="space-y-3">
      <Tabs value={view} onValueChange={(value) => setView(value as OrderView)}>
        <TabsList aria-label="주문 보기">
          {views.map((item) => <TabsTrigger key={item} value={item}>{item}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <DataTable
        columns={orderColumns}
        rows={rows}
        tableAriaLabel="주문 목록"
        dataEmptyState="등록된 주문이 없습니다."
        filteredEmptyState="조건에 맞는 주문이 없습니다."
        emptyStateKind={search || channel !== 'all' ? 'filtered' : 'dataset'}
        onResetFilters={resetFilters}
        emptyState="조건에 맞는 주문이 없습니다."
        queryStart={
          <>
            <Input type="search" aria-label="주문 검색" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="주문번호 또는 SKU" className="min-w-0 flex-1 ui-control-sm" />
            <ResponsiveFilterControls>
            <Select value={channel} onValueChange={(value) => setChannel(value as typeof channel)}>
              <SelectTrigger aria-label="채널 선택" className="ui-control-sm"><SelectValue placeholder="채널" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 채널</SelectItem>
                <SelectItem value="naver">네이버</SelectItem>
                <SelectItem value="coupang">쿠팡</SelectItem>
              </SelectContent>
            </Select>
            </ResponsiveFilterControls>
          </>
        }
        actionStart={<span className="shrink-0 text-sm text-[color:var(--muted-foreground)]">{rows.length}건</span>}
        actionEnd={
            <div className="flex min-w-0 shrink-0 items-center gap-2">
              <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={() => startTransition(async () => {
                try {
                  const result = await syncOrders()
                  setMessage(`주문 동기화 완료: ${result.orders}건`)
                } catch {
                  setMessage('주문 동기화에 실패했습니다.')
                }
              })}>주문 동기화</Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsTrackingImportOpen(true)}>송장 등록</Button>
            </div>
        }
      />
      <p aria-live="polite" className="text-sm text-[color:var(--muted-foreground)]">{message}</p>
      <WorkDialog open={isTrackingImportOpen} onOpenChange={setIsTrackingImportOpen}>
        <WorkDialogContent>
          <WorkDialogHeader>
            <DialogTitle>송장 업로드</DialogTitle>
          </WorkDialogHeader>
          <WorkDialogBody>
            <TrackingImportWorkspace initialPresets={trackingPresets} />
          </WorkDialogBody>
          <WorkDialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsTrackingImportOpen(false)}>닫기</Button>
          </WorkDialogFooter>
        </WorkDialogContent>
      </WorkDialog>
    </div>
  )
}
