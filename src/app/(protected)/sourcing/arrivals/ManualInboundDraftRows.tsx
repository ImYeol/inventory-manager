'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { attachInternalSkuToInboundDraftRow, receiveManualInboundDraftRows } from '@/lib/actions'
import { importBuiltInInboundFile } from '@/lib/actions/inbound-import'
import { createInternalProduct } from '@/lib/actions/internal-product'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cx, ui } from '@/app/components/ui'

export type ManualInboundDraftRow = {
  id: number
  draftId: number
  supplierName: string
  template: string
  externalSku: string
  quantity: number
  receivedQuantity: number
  warehouseName: string
  productVariantId: number | null
  productName: string | null
  sellerSku: string | null
}

type ProductDraft = { name: string; skuPrefix: string }

const emptyProductDraft = (): ProductDraft => ({ name: '', skuPrefix: '' })

export default function ManualInboundDraftRows({ rows, suppliers = [], warehouses = [] }: { rows: ManualInboundDraftRow[]; suppliers?: Array<{ id: number; name: string }>; warehouses?: Array<{ id: number; name: string }> }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [target, setTarget] = useState<ManualInboundDraftRow | null>(null)
  const [product, setProduct] = useState<ProductDraft>(emptyProductDraft)
  const [error, setError] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [preset, setPreset] = useState('중국 공장 입고')
  const [file, setFile] = useState<File | null>(null)

  const openCreate = (row: ManualInboundDraftRow) => {
    setTarget(row)
    setProduct(emptyProductDraft())
    setError(null)
  }

  const createAndAttach = () => {
    if (!target || !product.name.trim() || !product.skuPrefix.trim()) return
    startTransition(async () => {
      try {
        const created = await createInternalProduct({ name: product.name, skuPrefix: product.skuPrefix, sizes: [], colors: [] })
        const variant = created.variants[0]
        if (!variant) throw new Error('생성한 내부 SKU를 찾을 수 없습니다.')
        await attachInternalSkuToInboundDraftRow({ draftRowId: target.id, productVariantId: variant.id })
        setTarget(null)
        router.refresh()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : '내부 SKU 생성에 실패했습니다.')
      }
    })
  }

  const receive = (row: ManualInboundDraftRow) => {
    startTransition(async () => {
      try {
        await receiveManualInboundDraftRows({
          draftId: row.draftId,
          rows: [{ rowId: row.id, quantity: row.quantity - row.receivedQuantity, productVariantId: row.productVariantId }],
        })
        router.refresh()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : '검수 입고에 실패했습니다.')
      }
    })
  }

  const importFile = () => startTransition(async () => {
    if (!file) return
    try {
      const result = await importBuiltInInboundFile({ supplierId: Number(supplierId), warehouseId: Number(warehouseId), preset, file })
      setImportOpen(false); setFile(null); setError(`${result.imported}행 초안을 가져왔습니다. 확인 필요 ${result.invalid}행`); router.refresh()
    } catch (caught) { setError(caught instanceof Error ? caught.message : '파일 가져오기에 실패했습니다.') }
  })

  return (
    <section className={ui.tableShell} aria-label="수동 입고 초안">
      <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[color:var(--foreground)]">수동 입고 초안</h2>
        <div className="flex items-center gap-2"><span className={ui.pillMuted}>{rows.length}행</span><Button type="button" variant="secondary" size="sm" onClick={() => setImportOpen(true)} disabled={!suppliers.length || !warehouses.length}>파일 가져오기</Button></div>
      </div>
      {rows.length === 0 ? <p className="px-4 py-8 text-sm text-[color:var(--muted-foreground)]">파일을 가져오면 검수 대기 행이 여기에 표시됩니다.</p> : null}
      {error && !target ? <p className="border-b border-[color:var(--border)] px-4 py-3 text-sm font-medium text-[color:var(--danger-foreground)]">{error}</p> : null}
      <div className="divide-y divide-[color:var(--border)]">
        {rows.map((row) => {
          const matched = row.productVariantId !== null
          return (
            <div key={row.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 text-sm">
                <p className="font-medium text-[color:var(--foreground)]">{row.externalSku} <span className="font-normal text-[color:var(--muted-foreground)]">· {row.template}</span></p>
                <p className="mt-1 text-[color:var(--muted)]">{row.supplierName} · {row.warehouseName} · {row.quantity - row.receivedQuantity}개 남음</p>
              </div>
              {matched ? (
                <div className="flex items-center gap-2">
                  <span className={cx(ui.pillMuted, 'shrink-0')}>{row.sellerSku ?? row.productName ?? '내부 SKU 연결됨'}</span>
                  <Button type="button" size="sm" onClick={() => receive(row)} disabled={isPending}>입고 반영</Button>
                </div>
              ) : (
                <Button type="button" variant="secondary" size="sm" onClick={() => openCreate(row)}>SKU 생성</Button>
              )}
            </div>
          )
        })}
      </div>
      <Modal
        open={target !== null}
        title="내부 SKU 생성"
        description={target ? `${target.externalSku} 행에 새 내부 SKU를 만들고 연결합니다.` : undefined}
        onOpenChange={(open) => { if (!open && !isPending) setTarget(null) }}
        footer={<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setTarget(null)} disabled={isPending}>취소</Button><Button type="button" onClick={createAndAttach} disabled={isPending || !product.name.trim() || !product.skuPrefix.trim()}>생성 후 연결</Button></div>}
      >
        <div className="space-y-4">
          <label className="space-y-1"><span className={ui.label}>상품명</span><Input value={product.name} onChange={(event) => setProduct((current) => ({ ...current, name: event.target.value }))} /></label>
          <label className="space-y-1"><span className={ui.label}>SKU prefix</span><Input value={product.skuPrefix} onChange={(event) => setProduct((current) => ({ ...current, skuPrefix: event.target.value }))} /></label>
          {error ? <p className="text-sm font-medium text-[color:var(--danger-foreground)]">{error}</p> : null}
        </div>
      </Modal>
      <Modal open={importOpen} title="입고 파일 가져오기" description="지원 프리셋의 외부 SKU와 수량만 초안으로 가져옵니다." onOpenChange={setImportOpen} footer={<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setImportOpen(false)}>취소</Button><Button type="button" onClick={importFile} disabled={isPending || !supplierId || !warehouseId || !file}>가져오기</Button></div>}>
        <div className="space-y-4"><label className="space-y-1"><span className={ui.label}>공급자</span><Select value={supplierId} onValueChange={setSupplierId}><SelectTrigger aria-label="공급자"><SelectValue placeholder="공급자 선택" /></SelectTrigger><SelectContent>{suppliers.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></label><label className="space-y-1"><span className={ui.label}>창고</span><Select value={warehouseId} onValueChange={setWarehouseId}><SelectTrigger aria-label="입고 창고"><SelectValue placeholder="창고 선택" /></SelectTrigger><SelectContent>{warehouses.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></label><label className="space-y-1"><span className={ui.label}>프리셋</span><Select value={preset} onValueChange={setPreset}><SelectTrigger aria-label="입고 프리셋"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="중국 공장 입고">중국 공장 입고</SelectItem><SelectItem value="1688 주문">1688 주문</SelectItem></SelectContent></Select></label><label className="space-y-1"><span className={ui.label}>Excel 파일</span><Input aria-label="입고 파일" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label></div>
      </Modal>
    </section>
  )
}
