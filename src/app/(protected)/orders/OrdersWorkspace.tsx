'use client'

import { useMemo, useState, useTransition } from 'react'
import { StatusBadge, type BadgeTone } from '@/components/ui/badge-1'
import { BasicDataTable } from '@/components/ui/basic-data-table'
import { Button } from '@/components/ui/button'
import { ChannelBadge } from '@/components/ui/channel-badge'
import { FilterToolbar } from '@/components/ui/filter-toolbar'
import { FixedSheet } from '@/components/ui/fixed-sheet'
import { Input } from '@/components/ui/input'
import { ProductVariantCombobox, type ProductVariantOption } from '@/components/ui/product-variant-combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TableSurface } from '@/components/ui/table-surface'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActionToolbar, ToolbarButtonAction } from '@/components/ui/toolbar'
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
    setAssignments((current) => ({
      ...current,
      [lineId]: { variantId: null, warehouseId: '', ...current[lineId], ...patch },
    }))
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

  const columns = [
    { key: 'channel', label: '채널' },
    { key: 'order', label: '주문번호 / 상품' },
    { key: 'quantity', label: '수량', align: 'right' as const },
    { key: 'warehouse', label: '배정 창고' },
    { key: 'status', label: '주문 / 발송 상태' },
    { key: 'orderedAt', label: '주문일' },
  ]

  return (
    <div className="space-y-3">
      <Tabs value={view} onValueChange={(value) => setView(value as OrderView)}>
        <TabsList aria-label="주문 보기">
          {views.map((item) => <TabsTrigger key={item} value={item}>{item}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <TableSurface toolbar={
        <FilterToolbar className="sm:!flex-nowrap">
          <div className="flex min-w-0 items-center gap-2">
            <Input type="search" aria-label="주문 검색" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="주문번호 또는 SKU" className="w-56 ui-control-sm" />
            <Select value={channel} onValueChange={(value) => setChannel(value as typeof channel)}>
              <SelectTrigger aria-label="채널 선택" className="w-32 ui-control-sm"><SelectValue placeholder="채널" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 채널</SelectItem>
                <SelectItem value="naver">네이버</SelectItem>
                <SelectItem value="coupang">쿠팡</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="ui-data-meta" aria-live="polite">{rows.length}건</span>
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>필터 초기화</Button>
            <ActionToolbar>
              <ToolbarButtonAction disabled={isPending} onClick={() => startTransition(async () => {
                try {
                  const result = await syncOrders()
                  setMessage(`주문 동기화 완료: ${result.orders}건`)
                } catch {
                  setMessage('주문 동기화에 실패했습니다.')
                }
              })}>주문 동기화</ToolbarButtonAction>
              <ToolbarButtonAction onClick={() => setIsTrackingImportOpen(true)}>송장 등록</ToolbarButtonAction>
            </ActionToolbar>
          </div>
        </FilterToolbar>
      }>
        <BasicDataTable
          bare
          tableAriaLabel="주문 목록"
          columns={columns}
          rows={rows}
          rowKey={(order) => order.id}
          emptyState="조건에 맞는 주문이 없습니다."
          renderCell={(order, key) => {
            const line = order.channel_order_lines[0]
            const currentStatus = line ? lineStatuses[line.id] ?? line.line_status : order.order_status
            const assignedWarehouse = warehouses.find((warehouse) => warehouse.id === line?.inventory_reservations[0]?.warehouse_id)

            if (key === 'channel') return <ChannelBadge channel={order.channel} listingStatus="active" compact />
            if (key === 'order') return <div><p className="font-medium text-[color:var(--foreground)]">{order.external_order_id}</p><p>{line?.product_variants?.seller_sku ?? '매핑 필요'}</p></div>
            if (key === 'quantity') return line?.quantity ?? 0
            if (key === 'warehouse') {
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
            }
            if (key === 'status') {
              const status = orderStatus(currentStatus)
              return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            }
            if (key === 'orderedAt') return order.ordered_at ? new Date(order.ordered_at).toLocaleDateString('ko-KR') : '-'
            return null
          }}
        />
      </TableSurface>
      <p aria-live="polite" className="text-sm text-[color:var(--muted-foreground)]">{message}</p>
      <FixedSheet open={isTrackingImportOpen} title="송장 업로드" onClose={() => setIsTrackingImportOpen(false)}>
        <TrackingImportWorkspace initialPresets={trackingPresets} />
      </FixedSheet>
    </div>
  )
}
