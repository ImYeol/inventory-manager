'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { attachInternalSkuToInboundDraftRow, receiveManualInboundDraftRows } from '@/lib/actions'
import { createInternalProduct } from '@/lib/actions/internal-product'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogTitle, WorkDialog, WorkDialogBody, WorkDialogContent, WorkDialogFooter, WorkDialogHeader } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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

export default function ManualInboundDraftRows({ rows }: { rows: ManualInboundDraftRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [target, setTarget] = useState<ManualInboundDraftRow | null>(null)
  const [product, setProduct] = useState<ProductDraft>(emptyProductDraft)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <section className={ui.tableShell} aria-label="수동 입고 초안">
      <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[color:var(--foreground)]">수동 입고 초안</h2>
        <span className={ui.pillMuted}>{rows.length}행</span>
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
                <p className="mt-1 text-[color:var(--muted-foreground)]">{row.supplierName} · {row.warehouseName} · {row.quantity - row.receivedQuantity}개 남음</p>
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
      <WorkDialog
        open={target !== null}
        onOpenChange={(open) => { if (!open && !isPending) setTarget(null) }}
      >
        <WorkDialogContent>
          <WorkDialogHeader>
            <DialogTitle>내부 SKU 생성</DialogTitle>
            {target ? <DialogDescription>{target.externalSku} 행에 새 내부 SKU를 만들고 연결합니다.</DialogDescription> : null}
          </WorkDialogHeader>
          <WorkDialogBody>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1"><span className={ui.label}>상품명</span><Input value={product.name} onChange={(event) => setProduct((current) => ({ ...current, name: event.target.value }))} /></label>
              <label className="flex flex-col gap-1"><span className={ui.label}>SKU prefix</span><Input value={product.skuPrefix} onChange={(event) => setProduct((current) => ({ ...current, skuPrefix: event.target.value }))} /></label>
              {error ? <p role="alert" className="text-sm font-medium text-[color:var(--danger-foreground)]">{error}</p> : null}
            </div>
          </WorkDialogBody>
          <WorkDialogFooter>
            <Button type="button" variant="secondary" onClick={() => setTarget(null)} disabled={isPending}>취소</Button>
            <Button type="button" onClick={createAndAttach} disabled={isPending || !product.name.trim() || !product.skuPrefix.trim()}>생성 후 연결</Button>
          </WorkDialogFooter>
        </WorkDialogContent>
      </WorkDialog>
    </section>
  )
}
