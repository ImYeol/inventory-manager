'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createFactory, setFactoryActive } from '@/lib/actions'
import { StatusBadge } from '@/components/ui/badge-1'
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

export default function FactoriesView({ factories }: { factories: FactoryData[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [draft, setDraft] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    notes: '',
  })

  const submitFactory = () => {
    startTransition(async () => {
      try {
        await createFactory(draft)
        setDraft({ name: '', contactName: '', phone: '', email: '', notes: '' })
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
        description="공장 목록과 예정 입고 연결 상태를 한 화면에서 관리합니다."
      />

      {message ? (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className={cx(ui.panel, ui.panelBody, 'space-y-4 md:p-4')}>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-950">공장 등록</h2>
            <p className="mt-1 text-sm text-slate-500">이름과 연락처를 저장해 예정 입고와 연결합니다.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={ui.label}>공장 이름</label>
              <input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="예: 광주 봉제 협력사"
                className={ui.controlSm}
              />
            </div>
            <div>
              <label className={ui.label}>담당자</label>
              <input
                value={draft.contactName}
                onChange={(event) => setDraft((current) => ({ ...current, contactName: event.target.value }))}
                placeholder="담당자 이름"
                className={ui.controlSm}
              />
            </div>
            <div>
              <label className={ui.label}>전화번호</label>
              <input
                value={draft.phone}
                onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                placeholder="010-0000-0000"
                className={ui.controlSm}
              />
            </div>
            <div className="md:col-span-2">
              <label className={ui.label}>이메일</label>
              <input
                value={draft.email}
                onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                placeholder="factory@example.com"
                className={ui.controlSm}
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

          <button
            type="button"
            onClick={submitFactory}
            disabled={isPending || draft.name.trim().length === 0}
            className={ui.buttonPrimary}
          >
            공장 등록
          </button>
        </section>

        <section className={cx(ui.panel, 'overflow-hidden')}>
          <div className={ui.panelHeader}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-slate-950">공장 목록</h2>
              </div>
              <span className={ui.pill}>총 {factories.length}개</span>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {factories.length === 0 ? (
              <div className={ui.emptyState}>등록된 공장이 없습니다.</div>
            ) : (
              factories.map((factory) => (
                <div key={factory.id} className="space-y-4 px-4 py-4 md:px-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-950">{factory.name}</h3>
                        <StatusBadge tone={factory.isActive ? 'success' : 'neutral'} className="px-2.5 py-1">
                          {factory.isActive ? '활성' : '비활성'}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {[factory.contactName, factory.phone, factory.email].filter(Boolean).join(' · ') || '연락처 정보 없음'}
                      </p>
                      {factory.notes ? <p className="mt-2 text-sm text-slate-600">{factory.notes}</p> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFactory(factory.id, !factory.isActive)}
                      className={ui.buttonSecondary}
                    >
                      {factory.isActive ? '비활성화' : '다시 활성화'}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={ui.pillMuted}>
                      예정 {factory.arrivalCount}건
                    </span>
                    <span className={ui.pillMuted}>
                      잔여 {factory.pendingQuantity}개
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
