'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { deactivateSupplierSkuMapping, reassignSupplierSkuMapping, type SupplierSkuMappingAuditRow, type SupplierSkuMappingRow } from '@/lib/actions/supplier-sku-mapping'
import type { ProductWorkspaceVariant } from '@/lib/data'
import { ui } from '../../components/ui'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value))
}

export default function SupplierSkuMappingModal({ mapping, variants, audits, onClose }: {
  mapping: SupplierSkuMappingRow | null
  variants: ProductWorkspaceVariant[]
  audits: SupplierSkuMappingAuditRow[]
  onClose: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [operation, setOperation] = useState<'reassign' | 'deactivate' | null>(null)
  const [targetVariantId, setTargetVariantId] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const relatedAudits = mapping ? audits.filter((audit) => audit.supplierId === mapping.supplierId && audit.externalSku.trim() === mapping.externalSku.trim()).slice(0, 8) : []

  const start = (next: 'reassign' | 'deactivate') => {
    if (!mapping) return
    setOperation(next)
    setTargetVariantId(String(mapping.productVariantId))
    setReason('')
    setError(null)
  }
  const submit = () => {
    if (!mapping || !operation || !reason.trim()) return
    startTransition(async () => {
      try {
        if (operation === 'reassign') await reassignSupplierSkuMapping({ supplierId: mapping.supplierId, externalSku: mapping.externalSku, productVariantId: Number(targetVariantId), reason })
        else await deactivateSupplierSkuMapping({ supplierId: mapping.supplierId, externalSku: mapping.externalSku, reason })
        setOperation(null)
        router.refresh()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : '처리하지 못했습니다.')
      }
    })
  }

  return <Modal open={Boolean(mapping)} title="공급자 SKU 관리" description={mapping ? `${mapping.supplierName} · ${mapping.externalSku}` : undefined} onOpenChange={(open) => { if (!open) { setOperation(null); onClose() } }} footer={<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>닫기</Button>{operation ? <Button type="button" variant={operation === 'deactivate' ? 'destructive' : 'default'} disabled={isPending || !reason.trim() || (operation === 'reassign' && !targetVariantId)} onClick={submit}>{operation === 'reassign' ? '재지정 확정' : '비활성화 확정'}</Button> : null}</div>}>
    {mapping ? <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between gap-3"><div><p className="font-mono font-medium text-[color:var(--foreground)]">{mapping.externalSku}</p><p className="text-[color:var(--muted-foreground)]">{variants.find((variant) => variant.id === mapping.productVariantId)?.sellerSku ?? `#${mapping.productVariantId}`}</p></div><div className="flex gap-2"><Button type="button" variant="secondary" size="sm" disabled={!mapping.isActive} onClick={() => start('reassign')}>재지정</Button><Button type="button" variant="ghost" size="sm" disabled={!mapping.isActive} onClick={() => start('deactivate')}>비활성화</Button></div></div>
      {operation ? <div className="grid gap-3 border-y border-[color:var(--border)] py-3">{operation === 'reassign' ? <label className="space-y-1"><span className={ui.label}>새 내부 SKU</span><Select value={targetVariantId} onValueChange={setTargetVariantId}><SelectTrigger aria-label="재지정 내부 SKU"><SelectValue /></SelectTrigger><SelectContent>{variants.map((variant) => <SelectItem key={variant.id} value={String(variant.id)}>{variant.sellerSku} · {variant.modelName} / {variant.colorName} / {variant.sizeName}</SelectItem>)}</SelectContent></Select></label> : null}<label className="space-y-1"><span className={ui.label}>{operation === 'reassign' ? '재지정 사유' : '비활성화 사유'}</span><Input aria-label={operation === 'reassign' ? '재지정 사유' : '비활성화 사유'} value={reason} onChange={(event) => setReason(event.target.value)} /></label></div> : null}
      {error ? <p role="alert" className="text-[color:var(--danger-foreground)]">{error}</p> : null}
      <div className="space-y-2"><p className={ui.label}>최근 변경 이력</p>{relatedAudits.length ? relatedAudits.map((audit) => <div key={audit.id} className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] pb-2 last:border-0"><div><p className="font-medium text-[color:var(--foreground)]">{{ CONFIRMED: '연결', REASSIGNED: '재지정', DEACTIVATED: '비활성화' }[audit.action] ?? audit.action}</p><p className="text-xs text-[color:var(--muted-foreground)]">{audit.previousSellerSku ?? '—'} → {audit.newSellerSku ?? '—'}{audit.reason ? ` · ${audit.reason}` : ''}</p></div><time className="shrink-0 text-xs text-[color:var(--muted-foreground)]">{formatDate(audit.createdAt)}</time></div>) : <p className="text-[color:var(--muted-foreground)]">기록된 변경 이력이 없습니다.</p>}</div>
    </div> : null}
  </Modal>
}
