'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import { getShippingSettingsSummary, saveCoupangSettings, saveNaverSettings } from '@/lib/actions/shipping-settings'
import type { ShippingSettingsSummary } from '@/lib/shipping-credentials'
import { StoreConnectionRow } from '@/components/ui/store-connection-row'
import { ui } from '../../components/ui'

type SettingsViewProps = {
  summary: ShippingSettingsSummary
  focusProvider?: 'naver' | 'coupang'
}

export default function SettingsView({ summary, focusProvider }: SettingsViewProps) {
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

  useEffect(() => {
    if (!focusProvider) {
      return
    }

    const target = document.getElementById(`${focusProvider}-settings`)

    if (target instanceof HTMLElement && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'start' })
    }
  }, [focusProvider])

  async function refreshSummary() {
    const nextSummary = await getShippingSettingsSummary()
    setCurrentSummary(nextSummary)
  }

  const handleNaverSave = (event: FormEvent<HTMLFormElement>) => {
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

  const handleCoupangSave = (event: FormEvent<HTMLFormElement>) => {
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
    <div className="grid gap-4 xl:grid-cols-2">
      <StoreConnectionRow
        provider="네이버"
        configured={currentSummary.naver.configured}
        summary={[{ label: 'Client ID', value: currentSummary.naver.masked.clientId }]}
        updatedAt={currentSummary.naver.updatedAt}
        href="#naver-settings"
      >
        <form id="naver-settings" className="space-y-4" onSubmit={handleNaverSave}>
          <div className="grid gap-4">
            <div>
              <label htmlFor="naver-client-id" className={ui.label}>
                네이버 Client ID
              </label>
              <input
                ref={naverClientIdRef}
                id="naver-client-id"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={naverValues.clientId}
                onChange={(event) => setNaverValues((prev) => ({ ...prev, clientId: event.target.value }))}
                className={ui.control}
              />
            </div>
            <div>
              <label htmlFor="naver-client-secret" className={ui.label}>
                네이버 Client Secret
              </label>
              <input
                ref={naverClientSecretRef}
                id="naver-client-secret"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={naverValues.clientSecret}
                onChange={(event) => setNaverValues((prev) => ({ ...prev, clientSecret: event.target.value }))}
                className={ui.control}
              />
            </div>
          </div>
          {naverError ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{naverError}</p> : null}
          {naverMessage ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{naverMessage}</p> : null}
          <div className="flex justify-end">
            <button type="submit" disabled={naverPending} className={ui.buttonPrimary}>
              {naverPending ? '네이버 저장 중…' : '네이버 저장'}
            </button>
          </div>
        </form>
      </StoreConnectionRow>

      <StoreConnectionRow
        provider="쿠팡"
        configured={currentSummary.coupang.configured}
        summary={[
          { label: 'Access Key', value: currentSummary.coupang.masked.accessKey },
          { label: 'Vendor ID', value: currentSummary.coupang.masked.vendorId },
        ]}
        updatedAt={currentSummary.coupang.updatedAt}
        href="#coupang-settings"
      >
        <form id="coupang-settings" className="space-y-4" onSubmit={handleCoupangSave}>
          <div className="grid gap-4">
            <div>
              <label htmlFor="coupang-access-key" className={ui.label}>
                쿠팡 Access Key
              </label>
              <input
                ref={coupangAccessKeyRef}
                id="coupang-access-key"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={coupangValues.accessKey}
                onChange={(event) => setCoupangValues((prev) => ({ ...prev, accessKey: event.target.value }))}
                className={ui.control}
              />
            </div>
            <div>
              <label htmlFor="coupang-secret-key" className={ui.label}>
                쿠팡 Secret Key
              </label>
              <input
                ref={coupangSecretKeyRef}
                id="coupang-secret-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={coupangValues.secretKey}
                onChange={(event) => setCoupangValues((prev) => ({ ...prev, secretKey: event.target.value }))}
                className={ui.control}
              />
            </div>
            <div>
              <label htmlFor="coupang-vendor-id" className={ui.label}>
                쿠팡 Vendor ID
              </label>
              <input
                ref={coupangVendorIdRef}
                id="coupang-vendor-id"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={coupangValues.vendorId}
                onChange={(event) => setCoupangValues((prev) => ({ ...prev, vendorId: event.target.value }))}
                className={ui.control}
              />
            </div>
          </div>
          {coupangError ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{coupangError}</p> : null}
          {coupangMessage ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{coupangMessage}</p> : null}
          <div className="flex justify-end">
            <button type="submit" disabled={coupangPending} className={ui.buttonPrimary}>
              {coupangPending ? '쿠팡 저장 중…' : '쿠팡 저장'}
            </button>
          </div>
        </form>
      </StoreConnectionRow>
    </div>
  )
}
