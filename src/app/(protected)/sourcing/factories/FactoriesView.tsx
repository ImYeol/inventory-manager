'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createFactory, setFactoryActive } from '@/lib/actions'
import { StatusBadge } from '@/components/ui/badge-1'
import { Button } from '@/components/ui/button'
import { FilterToolbar } from '@/components/ui/filter-toolbar'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader, cx, ui } from '@/app/components/ui'

type FactoryData = {
  id: number
  name: string
  contactName: string | null
  phone: string | null
  email: string | null
  notes: string | null
  isActive: boolean
  arrivalCount: number
  pendingQuantity: number
}

type FactoryStatusFilter = 'all' | 'active' | 'inactive'

type SelectOption<Value extends string | number> = {
  value: Value
  label: string
}

function normalize(value: string | null) {
  return value?.toLowerCase().trim() ?? ''
}

function SelectField<Value extends string | number>({
  label,
  value,
  placeholder,
  options,
  onValueChange,
  disabled,
}: {
  label: string
  value: Value | null
  placeholder: string
  options: Array<SelectOption<Value>>
  onValueChange: (value: Value | null) => void
  disabled?: boolean
}) {
  return (
    <div className="min-w-[11rem]">
      <label className={ui.label}>{label}</label>
      <Select
        value={value !== null ? String(value) : undefined}
        onValueChange={(next) => onValueChange(next ? (next as Value) : null)}
        disabled={disabled}
      >
        <SelectTrigger aria-label={label} className={cx(ui.controlSm, 'w-full bg-white')}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={String(option.value)} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default function FactoriesView({ factories }: { factories: FactoryData[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<FactoryStatusFilter>('all')
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [selectedFactoryId, setSelectedFactoryId] = useState<number | null>(null)
  const [draft, setDraft] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    notes: '',
  })

  const filteredFactories = useMemo(() => {
    const query = search.toLowerCase().trim()

    return factories.filter((factory) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? factory.isActive : !factory.isActive)

      const haystack = [
        factory.name,
        factory.contactName,
        factory.phone,
        factory.email,
        factory.notes,
      ]
        .map(normalize)
        .join(' ')

      const matchesSearch = query.length === 0 || haystack.includes(query)
      return matchesStatus && matchesSearch
    })
  }, [factories, search, statusFilter])

  const selectedFactory = useMemo(
    () => (selectedFactoryId === null ? null : factories.find((factory) => factory.id === selectedFactoryId) ?? null),
    [factories, selectedFactoryId],
  )

  const openDetail = (factoryId: number) => {
    setSelectedFactoryId(factoryId)
  }

  const submitFactory = () => {
    startTransition(async () => {
      try {
        await createFactory(draft)
        setDraft({ name: '', contactName: '', phone: '', email: '', notes: '' })
        setIsRegisterOpen(false)
        setMessage('공장을 등록했습니다.')
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '공장 등록에 실패했습니다.')
      }
    })
  }

  const toggleFactory = (factoryId: number, nextActive: boolean) => {
    startTransition(async () => {
      try {
        await setFactoryActive(factoryId, nextActive)
        setMessage(nextActive ? '공장을 다시 활성화했습니다.' : '공장을 비활성화했습니다.')
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '공장 상태 변경에 실패했습니다.')
      }
    })
  }

  return (
    <div className={ui.shell}>
      <PageHeader
        title="외부 공장"
        description="공장 목록을 검색하고 상태를 걸러서 상세 정보와 등록 작업을 빠르게 처리합니다."
        actions={
          <Button type="button" onClick={() => setIsRegisterOpen(true)} size="sm" className="h-10 px-3">
            공장 등록
          </Button>
        }
      />

      {message ? (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      ) : null}

      <div className="space-y-4">
        <FilterToolbar>
          <div className="flex flex-1 flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="min-w-[16rem] flex-1">
              <label htmlFor="factory-search" className="sr-only">
                공장 검색
              </label>
              <Input
                id="factory-search"
                type="search"
                placeholder="공장명, 연락처, 메모 검색"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <SelectField
              label="상태 필터"
              value={statusFilter}
              placeholder="전체 상태"
              options={[
                { value: 'all', label: '전체 상태' },
                { value: 'active', label: '활성' },
                { value: 'inactive', label: '비활성' },
              ]}
              onValueChange={(value) => setStatusFilter((value ?? 'all') as FactoryStatusFilter)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={ui.pillMuted}>전체 {factories.length}개</span>
            <span className={ui.pillMuted}>표시 {filteredFactories.length}개</span>
          </div>
        </FilterToolbar>

        <section className={cx(ui.panel, 'overflow-hidden')}>
          <div className={ui.panelHeader}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-slate-950">공장 목록</h2>
                <p className="mt-1 text-sm text-slate-500">행의 상세 버튼으로 공장 정보를 확인하고 상태를 변경합니다.</p>
              </div>
              <span className={ui.pill}>총 {filteredFactories.length}개</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table aria-label="공장 목록">
              <TableHeader>
                <TableRow>
                  <TableHead>공장</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead className="text-right">예정 입고</TableHead>
                  <TableHead className="text-right">잔여</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFactories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">
                      조건에 맞는 공장이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFactories.map((factory) => (
                    <TableRow key={factory.id} data-state={factory.id === selectedFactory?.id ? 'selected' : undefined}>
                      <TableCell className="font-medium text-slate-950">
                        <button
                          type="button"
                          onClick={() => openDetail(factory.id)}
                          className="text-left font-medium text-slate-950 hover:underline"
                        >
                          {factory.name}
                        </button>
                        {factory.notes ? <p className="mt-1 text-xs text-slate-500">{factory.notes}</p> : null}
                      </TableCell>
                      <TableCell>
                        {[factory.contactName, factory.phone, factory.email].filter(Boolean).join(' · ') || '연락처 정보 없음'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-950">{factory.arrivalCount}건</TableCell>
                      <TableCell className="text-right font-semibold text-slate-950">{factory.pendingQuantity}개</TableCell>
                      <TableCell>
                        <StatusBadge tone={factory.isActive ? 'success' : 'neutral'} className="px-2.5 py-1">
                          {factory.isActive ? '활성' : '비활성'}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="secondary" size="sm" onClick={() => openDetail(factory.id)}>
                          상세
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <Modal
        open={selectedFactory !== null}
        title={selectedFactory?.name ?? '공장 상세'}
        description={selectedFactory ? '공장 정보와 상태를 확인합니다.' : undefined}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedFactoryId(null)
          }
        }}
        footer={
          selectedFactory ? (
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => toggleFactory(selectedFactory.id, !selectedFactory.isActive)}>
                {selectedFactory.isActive ? '비활성화' : '다시 활성화'}
              </Button>
            </div>
          ) : null
        }
      >
        {selectedFactory ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={selectedFactory.isActive ? 'success' : 'neutral'} className="px-2.5 py-1">
                {selectedFactory.isActive ? '활성' : '비활성'}
              </StatusBadge>
              <span className={ui.pillMuted}>예정 {selectedFactory.arrivalCount}건</span>
              <span className={ui.pillMuted}>잔여 {selectedFactory.pendingQuantity}개</span>
            </div>

            <dl className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">담당자</dt>
                <dd className="mt-1 text-sm font-medium text-slate-950">{selectedFactory.contactName || '없음'}</dd>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">전화번호</dt>
                <dd className="mt-1 text-sm font-medium text-slate-950">{selectedFactory.phone || '없음'}</dd>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">이메일</dt>
                <dd className="mt-1 text-sm font-medium text-slate-950">{selectedFactory.email || '없음'}</dd>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">메모</dt>
                <dd className="mt-1 text-sm font-medium text-slate-950">{selectedFactory.notes || '없음'}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={isRegisterOpen}
        title="공장 등록"
        description="새 공장의 연락처와 메모를 등록합니다."
        onOpenChange={setIsRegisterOpen}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsRegisterOpen(false)}>
              취소
            </Button>
            <Button type="button" onClick={submitFactory} disabled={isPending || draft.name.trim().length === 0}>
              등록
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={ui.label}>공장 이름</label>
            <Input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="예: 광주 봉제 협력사"
            />
          </div>
          <div>
            <label className={ui.label}>담당자</label>
            <Input
              value={draft.contactName}
              onChange={(event) => setDraft((current) => ({ ...current, contactName: event.target.value }))}
              placeholder="담당자 이름"
            />
          </div>
          <div>
            <label className={ui.label}>전화번호</label>
            <Input
              value={draft.phone}
              onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
              placeholder="010-0000-0000"
            />
          </div>
          <div className="md:col-span-2">
            <label className={ui.label}>이메일</label>
            <Input
              value={draft.email}
              onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
              placeholder="factory@example.com"
            />
          </div>
          <div className="md:col-span-2">
            <label className={ui.label}>메모</label>
            <textarea
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              placeholder="납기 메모, 연락 가능 시간, 특이사항"
              className={cx(ui.control, 'min-h-28 resize-y')}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
