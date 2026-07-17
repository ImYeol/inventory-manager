'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createWarehouseTransfer, getCurrentStock } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ui } from '@/app/components/ui'

type Model = { id: number; name: string; sizes: Array<{ id: number; name: string }>; colors: Array<{ id: number; name: string }> }
type Warehouse = { id: number; name: string }
const EMPTY = '__empty__'

function today() {
  const value = new Date()
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function Picker({ label, value, onChange, options, disabled = false }: { label: string; value: number | ''; onChange: (value: number | '') => void; options: Array<{ id: number; name: string }>; disabled?: boolean }) {
  return <div><label className={ui.label}>{label}</label><Select value={value === '' ? EMPTY : String(value)} onValueChange={(next) => onChange(next === EMPTY || !next ? '' : Number(next))} disabled={disabled}><SelectTrigger aria-label={label} className={ui.controlSm}><SelectValue placeholder={`${label} 선택`} /></SelectTrigger><SelectContent><SelectItem value={EMPTY}>{label} 선택</SelectItem>{options.map((option) => <SelectItem key={option.id} value={String(option.id)}>{option.name}</SelectItem>)}</SelectContent></Select></div>
}

export default function WarehouseTransferForm({ models, warehouses, initialWarehouseId, onSubmitted }: { models: Model[]; warehouses: Warehouse[]; initialWarehouseId?: number; onSubmitted?: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [date, setDate] = useState(today)
  const [modelId, setModelId] = useState<number | ''>('')
  const [sizeId, setSizeId] = useState<number | ''>('')
  const [colorId, setColorId] = useState<number | ''>('')
  const [fromWarehouseId, setFromWarehouseId] = useState<number | ''>(initialWarehouseId ?? '')
  const [toWarehouseId, setToWarehouseId] = useState<number | ''>('')
  const [quantity, setQuantity] = useState<number | ''>('')
  const [reason, setReason] = useState('')
  const [onHand, setOnHand] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const model = useMemo(() => models.find((item) => item.id === modelId), [modelId, models])

  useEffect(() => {
    if (!modelId || !sizeId || !colorId || !fromWarehouseId) return
    let active = true
    void getCurrentStock(modelId, sizeId, colorId, fromWarehouseId).then((stock) => {
      if (active) setOnHand(stock)
    }).catch(() => {
      if (active) setOnHand(null)
    })
    return () => { active = false }
  }, [colorId, fromWarehouseId, modelId, sizeId])

  const sameWarehouse = !!fromWarehouseId && fromWarehouseId === toWarehouseId
  const sourceOnHand = modelId && sizeId && colorId && fromWarehouseId ? onHand : null
  const insufficient = typeof quantity === 'number' && sourceOnHand !== null && quantity > sourceOnHand
  const ready = !!modelId && !!sizeId && !!colorId && !!fromWarehouseId && !!toWarehouseId && typeof quantity === 'number' && quantity > 0 && !!reason.trim() && !sameWarehouse && !insufficient
  const submit = () => {
    if (!ready) { setMessage(sameWarehouse ? '출발 창고와 도착 창고는 달라야 합니다.' : insufficient ? '출발 재고보다 많은 수량은 이동할 수 없습니다.' : '필수 입력을 확인해주세요.'); return }
    startTransition(async () => {
      try {
        await createWarehouseTransfer({ date, modelId: modelId as number, sizeId: sizeId as number, colorId: colorId as number, fromWarehouseId: fromWarehouseId as number, toWarehouseId: toWarehouseId as number, quantity: quantity as number, reason })
        router.refresh(); onSubmitted?.()
      } catch (error) { setMessage(error instanceof Error ? error.message : '창고 이동에 실패했습니다.') }
    })
  }
  return <div className="space-y-4"><div className="grid gap-3 md:grid-cols-2"><div><label className={ui.label} htmlFor="transfer-date">날짜</label><Input id="transfer-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={ui.controlSm} /></div><Picker label="상품" value={modelId} onChange={(value) => { setModelId(value); setSizeId(''); setColorId('') }} options={models} /></div><div className="grid gap-3 md:grid-cols-2"><Picker label="사이즈" value={sizeId} onChange={setSizeId} options={model?.sizes ?? []} disabled={!model} /><Picker label="색상" value={colorId} onChange={setColorId} options={model?.colors ?? []} disabled={!model} /></div><div className="grid gap-3 md:grid-cols-2"><Picker label="출발 창고" value={fromWarehouseId} onChange={setFromWarehouseId} options={warehouses} /><Picker label="도착 창고" value={toWarehouseId} onChange={setToWarehouseId} options={warehouses} /></div><div className="grid gap-3 md:grid-cols-2"><div><label className={ui.label} htmlFor="transfer-quantity">이동 수량</label><Input id="transfer-quantity" type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value ? Number(event.target.value) : '')} className={ui.controlSm} /></div><div className="flex items-end"><span className={ui.pillMuted}>출발 재고 {sourceOnHand ?? '-'}</span></div></div><div><label className={ui.label} htmlFor="transfer-reason">이동 사유</label><Input id="transfer-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="예: 창고 재배치" className={ui.controlSm} /></div>{message ? <p role="alert" className="text-sm text-[color:var(--danger-foreground)]">{message}</p> : null}<div className="flex justify-end border-t border-[color:var(--border)] pt-4"><Button type="button" onClick={submit} disabled={pending || !ready}>{pending ? '이동 중…' : '이동 확정'}</Button></div></div>
}
