'use client'

import { useMemo, useState } from 'react'
import { ChannelBadge } from '@/components/ui/channel-badge'
import { TableSurface } from '@/components/ui/table-surface'
import { assignOrderLine } from '@/lib/actions/order-sync'

type OrderRow = { id: number; channel: 'naver' | 'coupang'; external_order_id: string; order_status: string; ordered_at: string | null; channel_order_lines: Array<{ id: number; quantity: number; line_status: string; product_variants: { seller_sku: string } | null; inventory_reservations: Array<{ warehouse_id: number; status: string }> }> }
const views = ['신규', '출고 준비', '확인 필요', '발송 완료'] as const
export type OrderView = (typeof views)[number]

export default function OrdersWorkspace({ orders, initialView = '신규' }: { orders: OrderRow[]; initialView?: OrderView }) {
  const [view, setView] = useState<OrderView>(initialView)
  const [search, setSearch] = useState('')
  const [channel, setChannel] = useState<'all' | 'naver' | 'coupang'>('all')
  const [assignment, setAssignment] = useState<Record<number, { variantId: string; warehouseId: string }>>({})
  const rows = useMemo(() => orders.filter((order) => {
    const lineStatus = order.channel_order_lines[0]?.line_status
    const matchesView = view === '신규'
      ? lineStatus === 'NEW' || lineStatus === 'PENDING'
      : view === '출고 준비'
        ? lineStatus === 'RESERVED'
        : view === '확인 필요'
          ? lineStatus === 'MAPPING_REQUIRED' || lineStatus === 'EXCEPTION'
          : /FULFILLED|SHIPPED|발송/.test(lineStatus ?? order.order_status)
    return matchesView && (channel === 'all' || order.channel === channel) && `${order.external_order_id} ${order.channel_order_lines.map((line) => line.product_variants?.seller_sku ?? '').join(' ')}`.toLowerCase().includes(search.toLowerCase())
  }), [orders, channel, search, view])
  return <TableSurface toolbar={<div className="flex items-center gap-2"><div className="flex gap-1" role="tablist">{views.map((item) => <button key={item} type="button" role="tab" aria-selected={view === item} onClick={() => setView(item)} className="ui-button-secondary">{item}</button>)}</div><input aria-label="주문 검색" value={search} onChange={(event) => setSearch(event.target.value)} className="ui-input" placeholder="주문번호 또는 SKU" /><div className="flex gap-1"><button type="button" className="ui-button-secondary" onClick={() => setChannel('all')}>전체</button><button type="button" className="ui-button-secondary" onClick={() => setChannel('naver')}>네이버</button><button type="button" className="ui-button-secondary" onClick={() => setChannel('coupang')}>쿠팡</button></div></div>}><table className="ui-table" aria-label="주문 목록"><thead><tr><th>채널</th><th>주문번호 / 상품</th><th>수량</th><th>배정 창고</th><th>주문 / 발송 상태</th><th>주문일</th></tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-sm text-[color:var(--muted-foreground)]">조건에 맞는 주문이 없습니다.</td></tr> : rows.map((order) => { const line = order.channel_order_lines[0]; const values = line ? assignment[line.id] ?? { variantId: '', warehouseId: '' } : null; return <tr key={order.id}><td><ChannelBadge channel={order.channel} listingStatus="active" compact /></td><td><details><summary>{order.external_order_id}<br />{line?.product_variants?.seller_sku ?? '매핑 필요'}</summary>{line && values ? <div className="flex gap-1"><input aria-label="Variant ID" className="ui-input" value={values.variantId} onChange={(event) => setAssignment({ ...assignment, [line.id]: { ...values, variantId: event.target.value } })} /><input aria-label="창고 ID" className="ui-input" value={values.warehouseId} onChange={(event) => setAssignment({ ...assignment, [line.id]: { ...values, warehouseId: event.target.value } })} /><button type="button" className="ui-button-secondary" onClick={() => assignOrderLine({ lineId: line.id, variantId: Number(values.variantId), warehouseId: Number(values.warehouseId) })}>배정</button></div> : null}</details></td><td>{line?.quantity ?? 0}</td><td>{line?.inventory_reservations[0]?.warehouse_id ?? '-'}</td><td>{line?.line_status ?? order.order_status}</td><td>{order.ordered_at ? new Date(order.ordered_at).toLocaleDateString('ko-KR') : '-'}</td></tr> })}</tbody></table></TableSurface>
}
