'use server'

import { getSupabaseWithUser } from '../db'

export type OperationsDashboardData = {
  metrics: {
    newOrders: number
    readyToFulfill: number
    needsAttention: number
    dispatchedToday: number
  }
  flow: Array<{ date: string; label: string; inbound: number; outbound: number }>
  warehouses: Array<{ id: number; name: string; onHand: number; committed: number; available: number }>
  exceptions: Array<{
    id: number
    channel: 'naver' | 'coupang'
    externalOrderId: string
    customerName: string
    reason: string
  }>
  upcomingSourcing: Array<{
    id: number
    expectedDate: string
    factoryName: string
    referenceCode: string | null
    remainingQuantity: number
  }>
}

type OrderLineSummary = { line_status: string }
type FactoryName = { name: string }
type ArrivalQuantity = { ordered_quantity: number; received_quantity: number }

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function seoulDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
}

function isMissingOptionalOperationsTable(error: { code?: string; message: string } | null) {
  if (!error) return false
  return error.code === 'PGRST205' || /Could not find the table 'public\.(channel_orders|order_fulfillments|inventory_reservations)'/.test(error.message)
}

export async function getOperationsDashboard(): Promise<OperationsDashboardData> {
  const { supabase } = await getSupabaseWithUser()
  const todayDate = seoulDate(new Date())
  const today = new Date(`${todayDate}T00:00:00.000Z`)
  const start = new Date(today)
  start.setUTCDate(today.getUTCDate() - 13)
  const startDate = isoDate(start)

  const [
    ordersResult,
    fulfillmentsResult,
    warehousesResult,
    inventoryResult,
    reservationsResult,
    transactionsResult,
    sourcingResult,
  ] = await Promise.all([
    supabase
      .from('channel_orders')
      .select('id,channel,external_order_id,customer_name,channel_order_lines(line_status)')
      .order('ordered_at', { ascending: false }),
    supabase
      .from('order_fulfillments')
      .select('local_status,external_status,fulfilled_at,error')
      .gte('updated_at', `${todayDate}T00:00:00+09:00`),
    supabase.from('warehouses').select('id,name').order('name'),
    supabase.from('inventory').select('warehouse_id,quantity'),
    supabase.from('inventory_reservations').select('warehouse_id,quantity,status').eq('status', 'active'),
    supabase.from('transactions').select('date,type,quantity').gte('date', startDate).lte('date', todayDate),
    supabase
      .from('factory_arrivals')
      .select('id,expected_date,reference_code,status,factories(name),factory_arrival_items(ordered_quantity,received_quantity)')
      .in('status', ['예정', '부분입고'])
      .gte('expected_date', todayDate)
      .order('expected_date', { ascending: true })
      .limit(6),
  ])

  const firstError = [ordersResult, fulfillmentsResult, reservationsResult, warehousesResult, inventoryResult, transactionsResult, sourcingResult]
    .map((result) => result.error)
    .find((error) => error && !isMissingOptionalOperationsTable(error))
  if (firstError) throw new Error(firstError.message)

  const orders = ordersResult.data ?? []
  const fulfillmentRows = fulfillmentsResult.data ?? []
  const exceptionStatuses = new Set(['MAPPING_REQUIRED', 'EXCEPTION'])
  const newOrders = orders.filter((order) =>
    ((order.channel_order_lines ?? []) as OrderLineSummary[]).some((line) => line.line_status === 'NEW'),
  ).length
  const readyToFulfill = orders.filter((order) =>
    ((order.channel_order_lines ?? []) as OrderLineSummary[]).some((line) => line.line_status === 'RESERVED'),
  ).length
  const exceptions = orders
    .flatMap((order) => {
      const line = ((order.channel_order_lines ?? []) as OrderLineSummary[]).find((item) => exceptionStatuses.has(item.line_status))
      if (!line) return []
      return [{
        id: order.id,
        channel: order.channel as 'naver' | 'coupang',
        externalOrderId: order.external_order_id,
        customerName: order.customer_name ?? '-',
        reason: line.line_status === 'MAPPING_REQUIRED' ? 'SKU 연결 필요' : '창고·재고 확인 필요',
      }]
    })
    .slice(0, 6)
  const reconcileCount = fulfillmentRows.filter((row) => row.local_status === 'failed' || row.error === 'RECONCILE_REQUIRED').length
  const dispatchedToday = fulfillmentRows.filter((row) => row.external_status === 'success').length

  const onHandByWarehouse = new Map<number, number>()
  for (const row of inventoryResult.data ?? []) {
    onHandByWarehouse.set(row.warehouse_id, (onHandByWarehouse.get(row.warehouse_id) ?? 0) + row.quantity)
  }
  const committedByWarehouse = new Map<number, number>()
  for (const row of reservationsResult.data ?? []) {
    committedByWarehouse.set(row.warehouse_id, (committedByWarehouse.get(row.warehouse_id) ?? 0) + row.quantity)
  }
  const warehouses = (warehousesResult.data ?? []).map((warehouse) => {
    const onHand = onHandByWarehouse.get(warehouse.id) ?? 0
    const committed = committedByWarehouse.get(warehouse.id) ?? 0
    return { id: warehouse.id, name: warehouse.name, onHand, committed, available: onHand - committed }
  })

  const flowByDate = new Map<string, { inbound: number; outbound: number }>()
  for (let offset = 0; offset < 14; offset += 1) {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + offset)
    flowByDate.set(isoDate(date), { inbound: 0, outbound: 0 })
  }
  for (const row of transactionsResult.data ?? []) {
    const current = flowByDate.get(row.date) ?? { inbound: 0, outbound: 0 }
    if (row.type === 'INBOUND') current.inbound += row.quantity
    if (row.type === 'OUTBOUND') current.outbound += row.quantity
    flowByDate.set(row.date, current)
  }
  const flow = Array.from(flowByDate, ([date, values]) => ({
    date,
    label: `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`,
    ...values,
  }))

  const upcomingSourcing = (sourcingResult.data ?? []).map((arrival) => ({
    id: arrival.id,
    expectedDate: arrival.expected_date,
    factoryName: relationOne(arrival.factories as FactoryName | FactoryName[] | null)?.name ?? '공장 미지정',
    referenceCode: arrival.reference_code,
    remainingQuantity: ((arrival.factory_arrival_items ?? []) as ArrivalQuantity[])
      .reduce((sum, item) => sum + Math.max(item.ordered_quantity - item.received_quantity, 0), 0),
  }))

  return {
    metrics: {
      newOrders,
      readyToFulfill,
      needsAttention: exceptions.length + reconcileCount,
      dispatchedToday,
    },
    flow,
    warehouses,
    exceptions,
    upcomingSourcing,
  }
}
