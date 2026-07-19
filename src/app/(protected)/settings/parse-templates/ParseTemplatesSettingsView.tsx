'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createInboundTemplateVersion, inspectInboundTemplateSample, type InboundTemplateSample } from '@/lib/actions/inbound-import'
import { saveTrackingPreset, type SavedTrackingPreset } from '@/lib/actions/tracking-import'
import { BUILT_IN_TRACKING_PRESETS, type TrackingColumnMapping } from '@/lib/excel'
import { BasicDataTable } from '@/components/ui/basic-data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { StatusBadge } from '@/components/ui/badge-1'
import { ParseTemplateBuilder, type ParseTemplateRole } from '@/components/ui/parse-template-builder'
import { ui } from '@/app/components/ui'

export type InboundParseTemplateRow = { id: number; name: string; versionId: number; versionNumber: number }

const inboundRoles: ParseTemplateRole<'externalSku' | 'quantity'>[] = [
  { key: 'externalSku', label: '외부 SKU', required: true },
  { key: 'quantity', label: '수량', required: true },
]

export default function ParseTemplatesSettingsView({
  inboundTemplates,
  trackingPresets,
}: {
  inboundTemplates: InboundParseTemplateRow[]
  trackingPresets: SavedTrackingPreset[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const [versionModal, setVersionModal] = useState<InboundParseTemplateRow | 'new' | null>(null)
  const [versionName, setVersionName] = useState('')
  const [versionSample, setVersionSample] = useState<InboundTemplateSample | null>(null)
  const [versionSheetName, setVersionSheetName] = useState('')
  const [versionHeaderRow, setVersionHeaderRow] = useState(1)
  const [versionMapping, setVersionMapping] = useState<{ externalSku: string; quantity: string }>({ externalSku: '', quantity: '' })

  const [cloneTarget, setCloneTarget] = useState<{ id: 'built-in' | number; label: string; mapping: TrackingColumnMapping } | null>(null)
  const [cloneName, setCloneName] = useState('')

  const openNewVersion = (template: InboundParseTemplateRow | 'new') => {
    setVersionModal(template)
    setVersionName(template === 'new' ? '' : template.name)
    setVersionSample(null)
    setVersionSheetName('')
    setVersionHeaderRow(1)
    setVersionMapping({ externalSku: '', quantity: '' })
    setMessage(null)
  }

  const inspectVersionSample = (file: File) => startTransition(async () => {
    try {
      const result = await inspectInboundTemplateSample(file)
      setVersionSample(result)
      setVersionSheetName(result.sheets[0]?.name ?? '')
      setVersionHeaderRow(1)
      setVersionMapping({ externalSku: '', quantity: '' })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '샘플 파일을 읽지 못했습니다.')
    }
  })

  const saveVersion = () => {
    const sheet = versionSample?.sheets.find((candidate) => candidate.name === versionSheetName)
    if (!sheet || !versionName.trim() || !versionMapping.externalSku || !versionMapping.quantity) return
    const templateId = versionModal !== 'new' && versionModal ? versionModal.id : undefined
    startTransition(async () => {
      try {
        await createInboundTemplateVersion({
          templateId,
          name: versionName,
          sheetName: sheet.name,
          headerRowNumber: versionHeaderRow,
          headers: sheet.rows[versionHeaderRow - 1] ?? [],
          mappings: versionMapping,
        })
        setVersionModal(null)
        setMessage('입고 파싱 템플릿 버전을 저장했습니다.')
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '파싱 템플릿을 저장하지 못했습니다.')
      }
    })
  }

  const saveClone = () => {
    if (!cloneTarget || !cloneName.trim()) return
    startTransition(async () => {
      try {
        await saveTrackingPreset({ name: cloneName, mapping: cloneTarget.mapping })
        setCloneTarget(null)
        setCloneName('')
        setMessage('주문 송장 파싱 프리셋을 저장했습니다.')
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '프리셋을 저장하지 못했습니다.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {message ? <p role="status" aria-live="polite" className="text-sm text-[color:var(--muted)]">{message}</p> : null}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>입고 파싱 템플릿</CardTitle>
              <CardDescription>공장 입고 엑셀의 시트·헤더·외부 SKU/수량 열 매핑을 버전으로 관리합니다.</CardDescription>
            </div>
            <Button type="button" size="sm" onClick={() => openNewVersion('new')}>새 파싱 템플릿</Button>
          </div>
        </CardHeader>
        <CardContent>
          <BasicDataTable
            columns={[{ key: 'name', label: '이름' }, { key: 'version', label: '최신 버전' }, { key: 'action', label: <span className="sr-only">작업</span>, align: 'right' }]}
            rows={inboundTemplates}
            rowKey={(template) => template.id}
            emptyState="등록된 입고 파싱 템플릿이 없습니다."
            renderCell={(template, key) => key === 'name'
              ? <span className="font-medium text-[color:var(--foreground)]">{template.name}</span>
              : key === 'version'
                ? <span className="tabular-nums text-[color:var(--muted)]">v{template.versionNumber}</span>
                : <Button type="button" variant="outline" size="sm" onClick={() => openNewVersion(template)}>새 버전 만들기</Button>}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>주문 송장 파싱 프리셋</CardTitle>
          <CardDescription>운송장·주문번호 등 컬럼 매핑 프리셋입니다. 기본 프리셋은 복제해서 새 이름으로 저장합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <BasicDataTable
            columns={[{ key: 'name', label: '이름' }, { key: 'type', label: '구분' }, { key: 'action', label: <span className="sr-only">작업</span>, align: 'right' }]}
            rows={[
              ...BUILT_IN_TRACKING_PRESETS.map((preset) => ({ id: 'built-in' as const, key: `built-in:${preset.name}`, label: preset.name, mapping: preset.mapping, builtIn: true })),
              ...trackingPresets.map((preset) => ({ id: preset.id, key: `saved:${preset.id}`, label: preset.name, mapping: preset.mapping, builtIn: false })),
            ]}
            rowKey={(row) => row.key}
            emptyState="등록된 파싱 프리셋이 없습니다."
            renderCell={(row, key) => key === 'name'
              ? <span className="font-medium text-[color:var(--foreground)]">{row.label}</span>
              : key === 'type'
                ? <StatusBadge tone={row.builtIn ? 'neutral' : 'info'}>{row.builtIn ? '기본 제공' : '저장됨'}</StatusBadge>
                : <Button type="button" variant="outline" size="sm" onClick={() => { setCloneTarget({ id: row.id, label: row.label, mapping: row.mapping }); setCloneName(`${row.label} 복사본`) }}>복제해서 새 프리셋 만들기</Button>}
          />
        </CardContent>
      </Card>

      <Modal
        open={versionModal !== null}
        title={versionModal === 'new' ? '새 입고 파싱 템플릿' : `${versionModal ? versionModal.name : ''} 새 버전`}
        description="샘플 파일에서 시트·헤더 행과 외부 SKU, 수량 열을 선택해 새 버전으로 저장합니다."
        onOpenChange={(open) => { if (!open) setVersionModal(null) }}
        footer={<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setVersionModal(null)}>닫기</Button><Button type="button" disabled={isPending || !versionSample || !versionName.trim() || !versionMapping.externalSku || !versionMapping.quantity} onClick={saveVersion}>버전 저장</Button></div>}
      >
        <div className="space-y-4">
          <label className="space-y-1"><span className={ui.label}>파싱 템플릿 이름</span><Input aria-label="파싱 템플릿 이름" value={versionName} onChange={(event) => setVersionName(event.target.value)} /></label>
          <label className="space-y-1"><span className={ui.label}>샘플 파일</span><Input aria-label="샘플 파일" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) inspectVersionSample(file) }} /></label>
          {versionSample ? <ParseTemplateBuilder<'externalSku' | 'quantity'>
            roles={inboundRoles}
            sample={versionSample}
            sheetName={versionSheetName}
            headerRowNumber={versionHeaderRow}
            mapping={versionMapping}
            onSheetChange={setVersionSheetName}
            onHeaderRowChange={setVersionHeaderRow}
            onMappingChange={setVersionMapping}
          /> : null}
        </div>
      </Modal>

      <Modal
        open={cloneTarget !== null}
        title="파싱 프리셋 복제"
        description="기존 컬럼 매핑을 그대로 새 이름으로 저장합니다."
        onOpenChange={(open) => { if (!open) setCloneTarget(null) }}
        footer={<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setCloneTarget(null)}>취소</Button><Button type="button" disabled={isPending || !cloneName.trim()} onClick={saveClone}>프리셋 저장</Button></div>}
      >
        <label className="space-y-1"><span className={ui.label}>새 프리셋 이름</span><Input aria-label="새 프리셋 이름" value={cloneName} onChange={(event) => setCloneName(event.target.value)} /></label>
      </Modal>
    </div>
  )
}
