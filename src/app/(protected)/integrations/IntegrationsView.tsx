'use client'

import { useRef, useState, useTransition } from 'react'
import {
  getShippingSettingsSummary,
  saveCoupangSettings,
  saveNaverSettings,
} from '@/lib/actions/shipping-settings'
import type { ShippingSettingsSummary } from '@/lib/shipping-credentials'
import { cx, ui } from '../../components/ui'

function formatUpdatedAt(value?: string | null) {
  if (!value) return '아직 저장 이력이 없습니다.'

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function SummaryCard({
  title,
  configured,
  maskedValues,
  updatedAt,
}: {
  title: string
  configured: boolean
  maskedValues: Array<{ label: string; value?: string }>
  updatedAt?: string | null
}) {
  return (
    <div className="surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {configured ? '현재 사용자 계정에 저장된 연결 정보입니다.' : '아직 이 사용자에게 저장된 연결 정보가 없습니다.'}
          </p>
        </div>
        <span className={cx(ui.pill, configured ? '' : 'bg-slate-50')}>
          <span aria-hidden="true" className={cx('h-2 w-2 rounded-full', configured ? 'bg-emerald-500' : 'bg-amber-500')} />
          {configured ? '설정 완료' : '설정 필요'}
        </span>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        {maskedValues.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4">
            <dt className="text-slate-500">{item.label}</dt>
            <dd className="text-right font-medium text-slate-800" translate="no">
              {item.value ?? '저장된 키 없음'}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4">
          <dt className="text-slate-500">최근 변경</dt>
          <dd className="text-right text-slate-600">{formatUpdatedAt(updatedAt)}</dd>
        </div>
      </dl>
    </div>
  )
}

export default function IntegrationsView({ summary }: { summary: ShippingSettingsSummary }) {
  const [currentSummary, setCurrentSummary] = useState(summary)
  const [naverValues, setNaverValues] = useState({ clientId: '', clientSecret: '' })
  const [coupangValues, setCoupangValues] = useState({ accessKey: '', secretKey: '', vendorId: '' })
  const [naverMessage, setNaverMessage] = useState('')
  const [coupangMessage, setCoupangMessage] = useState('')
  const [naverError, setNaverError] = useState('')
  const [coupangError, setCoupangError] = useState('')
  const [naverPending, startNaverTransition] = useTransition()
  const [coupangPending, startCoupangTransition] = useTransition()
  const naverClientIdRef = useRef<HTMLInputElement>(null)
  const naverClientSecretRef = useRef<HTMLInputElement>(null)
  const coupangAccessKeyRef = useRef<HTMLInputElement>(null)
  const coupangSecretKeyRef = useRef<HTMLInputElement>(null)
  const coupangVendorIdRef = useRef<HTMLInputElement>(null)

  async function refreshSummary() {
    const nextSummary = await getShippingSettingsSummary()
    setCurrentSummary(nextSummary)
  }

  const handleNaverSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNaverMessage('')
    setNaverError('')

    if (!naverValues.clientId.trim()) {
      setNaverError('네이버 Client ID를 입력하세요.')
      naverClientIdRef.current?.focus()
      return
    }

    if (!naverValues.clientSecret.trim()) {
      setNaverError('네이버 Client Secret을 입력하세요.')
      naverClientSecretRef.current?.focus()
      return
    }

    startNaverTransition(async () => {
      const result = await saveNaverSettings({
        clientId: naverValues.clientId.trim(),
        clientSecret: naverValues.clientSecret.trim(),
      })

      if (result.success === false) {
        setNaverError(result.error ?? '네이버 API 정보를 저장하지 못했습니다.')
        return
      }

      await refreshSummary()
      setNaverValues({ clientId: '', clientSecret: '' })
      setNaverMessage('네이버 API 정보를 저장했습니다.')
    })
  }

  const handleCoupangSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCoupangMessage('')
    setCoupangError('')

    if (!coupangValues.accessKey.trim()) {
      setCoupangError('쿠팡 Access Key를 입력하세요.')
      coupangAccessKeyRef.current?.focus()
      return
    }

    if (!coupangValues.secretKey.trim()) {
      setCoupangError('쿠팡 Secret Key를 입력하세요.')
      coupangSecretKeyRef.current?.focus()
      return
    }

    if (!coupangValues.vendorId.trim()) {
      setCoupangError('쿠팡 Vendor ID를 입력하세요.')
      coupangVendorIdRef.current?.focus()
      return
    }

    startCoupangTransition(async () => {
      const result = await saveCoupangSettings({
        accessKey: coupangValues.accessKey.trim(),
        secretKey: coupangValues.secretKey.trim(),
        vendorId: coupangValues.vendorId.trim(),
      })

      if (result.success === false) {
        setCoupangError(result.error ?? '쿠팡 API 정보를 저장하지 못했습니다.')
        return
      }

      await refreshSummary()
      setCoupangValues({ accessKey: '', secretKey: '', vendorId: '' })
      setCoupangMessage('쿠팡 API 정보를 저장했습니다.')
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
        <p className="text-sm font-medium text-slate-800">저장된 값은 다시 표시되지 않습니다.</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          네이버와 쿠팡의 연결 준비는 이 화면에서만 처리하고, 운송장 업로드와 발송 실행은 `/shipping`에서 계속합니다.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <SummaryCard
            title="네이버"
            configured={currentSummary.naver.configured}
            maskedValues={[{ label: 'Client ID', value: currentSummary.naver.masked.clientId }]}
            updatedAt={currentSummary.naver.updatedAt}
          />

          <form className="surface p-5" onSubmit={handleNaverSave}>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-950">네이버 연결 정보 업데이트</h2>
              <p className="text-sm leading-6 text-slate-500">새 값을 입력하면 해당 사용자 계정의 저장값을 교체합니다.</p>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="naver-client-id" className={ui.label}>네이버 Client ID</label>
                <input
                  ref={naverClientIdRef}
                  id="naver-client-id"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="예: naver-client-id…"
                  value={naverValues.clientId}
                  onChange={(event) => setNaverValues((prev) => ({ ...prev, clientId: event.target.value }))}
                  className={ui.control}
                />
              </div>
              <div>
                <label htmlFor="naver-client-secret" className={ui.label}>네이버 Client Secret</label>
                <input
                  ref={naverClientSecretRef}
                  id="naver-client-secret"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="예: naver-client-secret…"
                  value={naverValues.clientSecret}
                  onChange={(event) => setNaverValues((prev) => ({ ...prev, clientSecret: event.target.value }))}
                  className={ui.control}
                />
              </div>
            </div>
            {naverError ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{naverError}</p> : null}
            {naverMessage ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{naverMessage}</p> : null}
            <div className="mt-5 flex items-center justify-between gap-3">
              <p className={ui.helpText}>저장 후 마스킹된 요약과 최근 변경 시각이 바로 갱신됩니다.</p>
              <button type="submit" disabled={naverPending} className={ui.buttonPrimary}>
                {naverPending ? '네이버 저장 중…' : '네이버 저장'}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <SummaryCard
            title="쿠팡"
            configured={currentSummary.coupang.configured}
            maskedValues={[
              { label: 'Access Key', value: currentSummary.coupang.masked.accessKey },
              { label: 'Vendor ID', value: currentSummary.coupang.masked.vendorId },
            ]}
            updatedAt={currentSummary.coupang.updatedAt}
          />

          <form className="surface p-5" onSubmit={handleCoupangSave}>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-950">쿠팡 연결 정보 업데이트</h2>
              <p className="text-sm leading-6 text-slate-500">Access Key, Secret Key, Vendor ID를 함께 입력해야 저장됩니다.</p>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="coupang-access-key" className={ui.label}>쿠팡 Access Key</label>
                <input
                  ref={coupangAccessKeyRef}
                  id="coupang-access-key"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="예: coupang-access-key…"
                  value={coupangValues.accessKey}
                  onChange={(event) => setCoupangValues((prev) => ({ ...prev, accessKey: event.target.value }))}
                  className={ui.control}
                />
              </div>
              <div>
                <label htmlFor="coupang-secret-key" className={ui.label}>쿠팡 Secret Key</label>
                <input
                  ref={coupangSecretKeyRef}
                  id="coupang-secret-key"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="예: coupang-secret-key…"
                  value={coupangValues.secretKey}
                  onChange={(event) => setCoupangValues((prev) => ({ ...prev, secretKey: event.target.value }))}
                  className={ui.control}
                />
              </div>
              <div>
                <label htmlFor="coupang-vendor-id" className={ui.label}>쿠팡 Vendor ID</label>
                <input
                  ref={coupangVendorIdRef}
                  id="coupang-vendor-id"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="예: A12345678"
                  value={coupangValues.vendorId}
                  onChange={(event) => setCoupangValues((prev) => ({ ...prev, vendorId: event.target.value }))}
                  className={ui.control}
                />
              </div>
            </div>
            {coupangError ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{coupangError}</p> : null}
            {coupangMessage ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{coupangMessage}</p> : null}
            <div className="mt-5 flex items-center justify-between gap-3">
              <p className={ui.helpText}>저장 후 마스킹된 요약과 최근 변경 시각이 바로 갱신됩니다.</p>
              <button type="submit" disabled={coupangPending} className={ui.buttonPrimary}>
                {coupangPending ? '쿠팡 저장 중…' : '쿠팡 저장'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
