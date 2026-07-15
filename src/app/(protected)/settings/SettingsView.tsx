'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import {
  deleteShippingProviderCredentials,
  getShippingSettingsSummary,
  saveCoupangSettings,
  saveNaverSettings,
} from '@/lib/actions/shipping-settings'
import type { ShippingProvider, ShippingSettingsSummary } from '@/lib/shipping-credentials'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { StoreConnectionRow } from '@/components/ui/store-connection-row'
import { cx, ui } from '../../components/ui'

type SettingsViewProps = {
  summary: ShippingSettingsSummary
  focusProvider?: 'naver' | 'coupang'
}

export default function SettingsView({ summary, focusProvider }: SettingsViewProps) {
  const [currentSummary, setCurrentSummary] = useState(summary)
  const [naverValues, setNaverValues] = useState({ clientId: '', clientSecret: '' })
  const [coupangValues, setCoupangValues] = useState({
    accessKey: '',
    secretKey: '',
    vendorId: '',
    defaultDeliveryCompanyCode: '',
  })
  const [naverMessage, setNaverMessage] = useState('')
  const [coupangMessage, setCoupangMessage] = useState('')
  const [naverError, setNaverError] = useState('')
  const [coupangError, setCoupangError] = useState('')
  const [removalTarget, setRemovalTarget] = useState<ShippingProvider | null>(null)
  const [naverPending, startNaverTransition] = useTransition()
  const [coupangPending, startCoupangTransition] = useTransition()
  const [removalPending, startRemovalTransition] = useTransition()
  const naverClientIdRef = useRef<HTMLInputElement>(null)
  const naverClientSecretRef = useRef<HTMLInputElement>(null)
  const coupangAccessKeyRef = useRef<HTMLInputElement>(null)
  const coupangSecretKeyRef = useRef<HTMLInputElement>(null)
  const coupangVendorIdRef = useRef<HTMLInputElement>(null)
  const coupangDeliveryCompanyCodeRef = useRef<HTMLInputElement>(null)

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

    if (!coupangValues.defaultDeliveryCompanyCode.trim()) {
      setCoupangError('쿠팡 기본 택배사 코드를 입력하세요.')
      coupangDeliveryCompanyCodeRef.current?.focus()
      return
    }

    startCoupangTransition(async () => {
      const result = await saveCoupangSettings({
        accessKey: coupangValues.accessKey.trim(),
        secretKey: coupangValues.secretKey.trim(),
        vendorId: coupangValues.vendorId.trim(),
        defaultDeliveryCompanyCode: coupangValues.defaultDeliveryCompanyCode.trim(),
      })

      if (result.success === false) {
        setCoupangError(result.error ?? '쿠팡 API 정보를 저장하지 못했습니다.')
        return
      }

      await refreshSummary()
      setCoupangValues({ accessKey: '', secretKey: '', vendorId: '', defaultDeliveryCompanyCode: '' })
      setCoupangMessage('쿠팡 API 정보를 저장했습니다.')
    })
  }

  const handleCredentialRemoval = () => {
    if (!removalTarget) {
      return
    }

    const provider = removalTarget
    const providerName = provider === 'naver' ? '네이버' : '쿠팡'
    setNaverMessage('')
    setCoupangMessage('')
    setNaverError('')
    setCoupangError('')

    startRemovalTransition(async () => {
      const result = await deleteShippingProviderCredentials(provider)

      if (!result.success) {
        const error = result.error ?? '연결 정보를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.'
        if (provider === 'naver') {
          setNaverError(error)
        } else {
          setCoupangError(error)
        }
        return
      }

      await refreshSummary()
      if (provider === 'naver') {
        setNaverValues({ clientId: '', clientSecret: '' })
        setNaverMessage(`${providerName} 연결을 해제했습니다.`)
      } else {
        setCoupangValues({ accessKey: '', secretKey: '', vendorId: '', defaultDeliveryCompanyCode: '' })
        setCoupangMessage(`${providerName} 연결을 해제했습니다.`)
      }
      setRemovalTarget(null)
    })
  }

  const removalProviderName = removalTarget === 'naver' ? '네이버' : '쿠팡'

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <StoreConnectionRow
        provider="네이버"
        configured={currentSummary.naver.configured}
        summary={[{ label: 'Client ID', value: currentSummary.naver.masked.clientId }]}
        updatedAt={currentSummary.naver.updatedAt}
        action={
          <div className="flex items-center gap-2">
            {currentSummary.naver.configured ? (
              <Button type="button" variant="destructive" size="sm" onClick={() => setRemovalTarget('naver')}>
                네이버 연결 해제
              </Button>
            ) : (
              <Button type="submit" form="naver-settings" disabled={naverPending}>
                {naverPending ? '네이버 저장 중…' : '네이버 저장'}
              </Button>
            )}
          </div>
        }
      >
        {!currentSummary.naver.configured ? (
          <form id="naver-settings" className="space-y-4" onSubmit={handleNaverSave}>
            <div className="grid gap-4">
              <div>
                <label htmlFor="naver-client-id" className={ui.label}>
                  네이버 Client ID
                </label>
                <Input
                  ref={naverClientIdRef}
                  id="naver-client-id"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={naverValues.clientId}
                  onChange={(event) => setNaverValues((prev) => ({ ...prev, clientId: event.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="naver-client-secret" className={ui.label}>
                  네이버 Client Secret
                </label>
                <Input
                  ref={naverClientSecretRef}
                  id="naver-client-secret"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={naverValues.clientSecret}
                  onChange={(event) => setNaverValues((prev) => ({ ...prev, clientSecret: event.target.value }))}
                />
              </div>
            </div>
            {naverError ? (
              <p className={cx(ui.surfaceMuted, 'px-4 py-3 text-sm text-[color:var(--danger-foreground)]')}>{naverError}</p>
            ) : null}
            {naverMessage ? (
              <p className={cx(ui.surfaceMuted, 'px-4 py-3 text-sm text-[color:var(--success-foreground)]')}>{naverMessage}</p>
            ) : null}
          </form>
        ) : null}
      </StoreConnectionRow>

      <StoreConnectionRow
        provider="쿠팡"
        configured={currentSummary.coupang.configured}
        summary={[
          { label: 'Access Key', value: currentSummary.coupang.masked.accessKey },
          { label: 'Vendor ID', value: currentSummary.coupang.masked.vendorId },
          { label: '기본 택배사 코드', value: currentSummary.coupang.masked.defaultDeliveryCompanyCode },
        ]}
        updatedAt={currentSummary.coupang.updatedAt}
        action={
          <div className="flex items-center gap-2">
            {currentSummary.coupang.configured ? (
              <Button type="button" variant="destructive" size="sm" onClick={() => setRemovalTarget('coupang')}>
                쿠팡 연결 해제
              </Button>
            ) : (
              <Button type="submit" form="coupang-settings" disabled={coupangPending}>
                {coupangPending ? '쿠팡 저장 중…' : '쿠팡 저장'}
              </Button>
            )}
          </div>
        }
      >
        {!currentSummary.coupang.configured ? (
          <form id="coupang-settings" className="space-y-4" onSubmit={handleCoupangSave}>
          <div className="grid gap-4">
            <div>
              <label htmlFor="coupang-access-key" className={ui.label}>
                쿠팡 Access Key
              </label>
              <Input
                ref={coupangAccessKeyRef}
                id="coupang-access-key"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={coupangValues.accessKey}
                onChange={(event) => setCoupangValues((prev) => ({ ...prev, accessKey: event.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="coupang-secret-key" className={ui.label}>
                쿠팡 Secret Key
              </label>
              <Input
                ref={coupangSecretKeyRef}
                id="coupang-secret-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={coupangValues.secretKey}
                onChange={(event) => setCoupangValues((prev) => ({ ...prev, secretKey: event.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="coupang-vendor-id" className={ui.label}>
                쿠팡 Vendor ID
              </label>
              <Input
                ref={coupangVendorIdRef}
                id="coupang-vendor-id"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={coupangValues.vendorId}
                onChange={(event) => setCoupangValues((prev) => ({ ...prev, vendorId: event.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="coupang-delivery-company-code" className={ui.label}>
                쿠팡 기본 택배사 코드
              </label>
              <Input
                ref={coupangDeliveryCompanyCodeRef}
                id="coupang-delivery-company-code"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={coupangValues.defaultDeliveryCompanyCode}
                onChange={(event) =>
                  setCoupangValues((prev) => ({
                    ...prev,
                    defaultDeliveryCompanyCode: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          {coupangError ? (
            <p className={cx(ui.surfaceMuted, 'px-4 py-3 text-sm text-[color:var(--danger-foreground)]')}>{coupangError}</p>
          ) : null}
          {coupangMessage ? (
            <p className={cx(ui.surfaceMuted, 'px-4 py-3 text-sm text-[color:var(--success-foreground)]')}>
              {coupangMessage}
            </p>
          ) : null}
          </form>
        ) : null}
      </StoreConnectionRow>

      <Modal
        open={removalTarget !== null}
        title={`${removalProviderName} 연결을 해제할까요?`}
        description="저장된 API 연결 정보가 삭제되어 해당 채널의 운영 동기화가 중단됩니다."
        onOpenChange={(open) => {
          if (!removalPending && !open) {
            setRemovalTarget(null)
          }
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setRemovalTarget(null)} disabled={removalPending}>
              취소
            </Button>
            <Button type="button" variant="destructive" onClick={handleCredentialRemoval} disabled={removalPending}>
              {removalPending ? '해제 중…' : '연결 해제'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[color:var(--muted-foreground)]">해제 후에는 새 API 정보를 저장해야 다시 동기화할 수 있습니다.</p>
      </Modal>
    </div>
  )
}
