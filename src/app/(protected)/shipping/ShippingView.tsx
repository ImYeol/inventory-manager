'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import * as XLSX from 'xlsx'
import { parseExcelRow, type CourierRow } from '@/lib/excel'
import * as shippingActions from '@/lib/actions/shipping'
import type { NaverOrder, CoupangOrder } from '@/lib/actions/shipping'
import type { ShippingSettingsSummary } from '@/lib/shipping-credentials'
import { ShippingClassificationBadge, type ShippingClassification } from '@/components/ui/shipping-classification-badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StoreConnectionStatus } from '@/components/ui/store-connection-status'
import { cx, ui } from '../../components/ui'

type ShippingPreviewRow = {
  key: string
  recipientName: string
  address: string
  trackingNumber: string
  classification: ShippingClassification
  productName: string
  providerOrderLabel: string
  matchedOrder:
    | { provider: 'naver'; productOrderId: string }
    | { provider: 'coupang'; shipmentBoxId: number }
    | null
}

type ExcelRow = Record<string, unknown>

function normalizeAddress(addr: string) {
  return addr.replace(/\s+/g, '').toLowerCase()
}

function normalizeName(value: string | undefined) {
  return (value ?? '').trim()
}

function isSupportedExcelFile(file: File) {
  const extension = file.name.toLowerCase().split('.').pop()
  const allowedExtensions = ['xlsx', 'xls']
  const allowedMimeTypes = new Set([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ])

  return (extension && allowedExtensions.includes(extension)) || allowedMimeTypes.has(file.type)
}

function classifyRows(courierRows: CourierRow[], naverOrders: NaverOrder[], coupangOrders: CoupangOrder[]) {
  return courierRows.map<ShippingPreviewRow>((row, index) => {
    const normalizedName = normalizeName(row.recipientName)
    const normalizedRowAddress = normalizeAddress(row.address)

    const matchedNaver = naverOrders.find((order) => {
      const orderName = normalizeName(order.recipientName)
      const orderAddress = normalizeAddress(order.recipientAddress)
      return (
        normalizedName.length > 0 &&
        orderName === normalizedName &&
        (orderAddress.includes(normalizedRowAddress) || normalizedRowAddress.includes(orderAddress))
      )
    })

    const matchedCoupang = coupangOrders.find((order) => {
      const orderName = normalizeName(order.receiverName)
      const orderAddress = normalizeAddress(order.receiverAddr)
      return (
        normalizedName.length > 0 &&
        orderName === normalizedName &&
        (orderAddress.includes(normalizedRowAddress) || normalizedRowAddress.includes(orderAddress))
      )
    })

    if (matchedNaver && matchedCoupang) {
      return {
        key: `${index}-${row.trackingNumber}`,
        recipientName: row.recipientName,
        address: row.address,
        trackingNumber: row.trackingNumber,
        classification: 'ambiguous',
        productName: [matchedNaver.productName, matchedCoupang.productName].filter(Boolean).join(' / '),
        providerOrderLabel: `${matchedNaver.productOrderId} / ${matchedCoupang.shipmentBoxId}`,
        matchedOrder: null,
      }
    }

    if (matchedNaver) {
      return {
        key: `${index}-${row.trackingNumber}`,
        recipientName: row.recipientName,
        address: row.address,
        trackingNumber: row.trackingNumber,
        classification: 'naver',
        productName: matchedNaver.productName,
        providerOrderLabel: matchedNaver.productOrderId,
        matchedOrder: { provider: 'naver', productOrderId: matchedNaver.productOrderId },
      }
    }

    if (matchedCoupang) {
      return {
        key: `${index}-${row.trackingNumber}`,
        recipientName: row.recipientName,
        address: row.address,
        trackingNumber: row.trackingNumber,
        classification: 'coupang',
        productName: matchedCoupang.productName,
        providerOrderLabel: String(matchedCoupang.shipmentBoxId),
        matchedOrder: { provider: 'coupang', shipmentBoxId: matchedCoupang.shipmentBoxId },
      }
    }

    return {
      key: `${index}-${row.trackingNumber}`,
      recipientName: row.recipientName,
      address: row.address,
      trackingNumber: row.trackingNumber,
      classification: 'unclassified',
      productName: '',
      providerOrderLabel: '',
      matchedOrder: null,
    }
  })
}

export default function ShippingView({ settingsSummary }: { settingsSummary: ShippingSettingsSummary }) {
  const [uploadError, setUploadError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [previewRows, setPreviewRows] = useState<ShippingPreviewRow[]>([])
  const [classificationFilter, setClassificationFilter] = useState<'all' | ShippingClassification>('all')
  const [naverMessage, setNaverMessage] = useState('')
  const [coupangMessage, setCoupangMessage] = useState('')
  const [loading, startLoadingTransition] = useTransition()
  const [naverSending, startNaverSendTransition] = useTransition()
  const [coupangSending, startCoupangSendTransition] = useTransition()

  const hasNaverConfig = settingsSummary.naver.configured
  const hasCoupangConfig = settingsSummary.coupang.configured

  const handleFileUpload = (file: File) => {
    setUploadError('')
    setNaverMessage('')
    setCoupangMessage('')

    if (!isSupportedExcelFile(file)) {
      setUploadError('엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다.')
      setPreviewRows([])
      return
    }

    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = evt.target?.result
      if (!data) {
        setUploadError('엑셀 파일을 읽을 수 없습니다.')
        setPreviewRows([])
        return
      }

      try {
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
          setUploadError('엑셀 파일에 시트가 없습니다.')
          setPreviewRows([])
          return
        }

        const sheet = workbook.Sheets[sheetName]
        const jsonRows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: '' })
        const courierRows = jsonRows
          .filter((row) => Object.keys(row).length > 0)
          .map(parseExcelRow)
          .filter((row) => row.trackingNumber)

        startLoadingTransition(async () => {
          const [naverResult, coupangResult] = await Promise.all([
            hasNaverConfig ? shippingActions.fetchNaverOrders() : Promise.resolve({ success: true, orders: [] as NaverOrder[] }),
            hasCoupangConfig ? shippingActions.fetchCoupangOrders() : Promise.resolve({ success: true, orders: [] as CoupangOrder[] }),
          ])

          setPreviewRows(
            classifyRows(
              courierRows,
              naverResult.success ? naverResult.orders : [],
              coupangResult.success ? coupangResult.orders : [],
            ),
          )
        })
      } catch {
        setUploadError('엑셀 파일을 처리하지 못했습니다.')
        setPreviewRows([])
      }
    }

    reader.onerror = () => {
      setUploadError('엑셀 파일을 읽는 중 오류가 발생했습니다.')
      setPreviewRows([])
    }

    reader.readAsArrayBuffer(file)
  }

  const filteredRows = useMemo(
    () => previewRows.filter((row) => classificationFilter === 'all' || row.classification === classificationFilter),
    [classificationFilter, previewRows],
  )
  const classificationSummary = useMemo(
    () => ({
      total: previewRows.length,
      naver: previewRows.filter((row) => row.classification === 'naver').length,
      coupang: previewRows.filter((row) => row.classification === 'coupang').length,
      unclassified: previewRows.filter((row) => row.classification === 'unclassified').length,
      ambiguous: previewRows.filter((row) => row.classification === 'ambiguous').length,
    }),
    [previewRows],
  )

  const naverMatches = previewRows.filter((row) => row.classification === 'naver' && row.matchedOrder?.provider === 'naver')
  const coupangMatches = previewRows.filter((row) => row.classification === 'coupang' && row.matchedOrder?.provider === 'coupang')
  const providerActions = [
    {
      provider: 'naver' as const,
      label: '네이버',
      configured: hasNaverConfig,
    },
    {
      provider: 'coupang' as const,
      label: '쿠팡',
      configured: hasCoupangConfig,
    },
  ]

  const handleNaverSend = () => {
    const targets = naverMatches.flatMap((row) =>
      row.matchedOrder?.provider === 'naver'
        ? [{ productOrderId: row.matchedOrder.productOrderId, trackingNumber: row.trackingNumber }]
        : [],
    )
    if (targets.length === 0) return

    startNaverSendTransition(async () => {
      const result = await shippingActions.sendNaverTrackingNumbers(targets)
      setNaverMessage(result.success ? `${targets.length}건 발송 완료` : (result.error ?? `${result.failedOrders.length}건 실패`))
    })
  }

  const handleCoupangSend = () => {
    const targets = coupangMatches.flatMap((row) =>
      row.matchedOrder?.provider === 'coupang'
        ? [{ shipmentBoxId: row.matchedOrder.shipmentBoxId, trackingNumber: row.trackingNumber }]
        : [],
    )
    if (targets.length === 0) return

    startCoupangSendTransition(async () => {
      const result = await shippingActions.sendCoupangTrackingNumbers(targets)
      setCoupangMessage(result.success ? `${targets.length}건 발송 완료` : (result.error ?? `${result.failedBoxes.length}건 실패`))
    })
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-2 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-950">운송장 업로드</h2>
            <p className="text-sm leading-6 text-slate-500">엑셀을 넣고, 연결 상태를 확인한 뒤, 바로 분류 결과를 확인합니다.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {providerActions.map((provider) => (
              <Link
                key={provider.provider}
                href={`/settings?section=store-connections&provider=${provider.provider}`}
                aria-label={`${provider.label} ${provider.configured ? '변경' : '연결'}`}
                className={cx(ui.buttonSecondary, 'h-10 gap-2 px-3')}
              >
                <StoreConnectionStatus configured={provider.configured} compact />
                <span>
                  {provider.label} {provider.configured ? '변경' : '연결'}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div
          className={cx(
            'relative mt-4 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
            isDragOver ? 'border-slate-500 bg-slate-100' : 'border-slate-300 bg-slate-50/80',
          )}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragOver(false)
            const file = event.dataTransfer.files?.[0]
            if (file) handleFileUpload(file)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'copy'
            setIsDragOver(true)
          }}
          onDragEnter={(event) => {
            event.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          aria-label="운송장 엑셀 업로드 영역"
        >
          <label htmlFor="shipping-excel-upload" className="mx-auto flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl bg-slate-200/80 transition hover:scale-105">
            <span className="sr-only">엑셀 업로드</span>
            <input
              id="shipping-excel-upload"
              name="shipping-excel-upload"
              type="file"
              accept=".xlsx,.xls"
              className="sr-only"
              aria-label="운송장 엑셀 업로드"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) handleFileUpload(file)
                event.currentTarget.value = ''
              }}
            />
            <svg className="h-7 w-7 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M17 8l-5-5-5 5" />
              <path d="M12 3v12" />
            </svg>
          </label>

          <p className="mt-4 text-sm text-slate-700">운송장 엑셀을 업로드하면 채널별로 바로 분류합니다.</p>
          <p className="mt-1 text-xs text-slate-500">형식: .xlsx, .xls</p>
          {fileName ? <p className="mt-3 text-sm font-medium text-slate-800">{fileName}</p> : null}
          {uploadError ? <p className="mt-3 text-sm text-red-600">{uploadError}</p> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-semibold text-slate-950">분류 미리보기</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={classificationFilter} onValueChange={(value) => setClassificationFilter(value as typeof classificationFilter)}>
              <SelectTrigger aria-label="분류 필터" className={cx(ui.controlSm, 'min-w-[10rem] bg-white')}>
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="naver">네이버</SelectItem>
                <SelectItem value="coupang">쿠팡</SelectItem>
                <SelectItem value="unclassified">미분류</SelectItem>
                <SelectItem value="ambiguous">중복 후보</SelectItem>
              </SelectContent>
            </Select>
            {loading ? <span className="text-sm text-slate-500">주문 정보를 확인하는 중…</span> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span className={ui.pill}>전체 {classificationSummary.total}건</span>
          <span className={ui.pill}>네이버 {classificationSummary.naver}건</span>
          <span className={ui.pill}>쿠팡 {classificationSummary.coupang}건</span>
          <span className={ui.pillMuted}>미분류 {classificationSummary.unclassified}건</span>
          {classificationSummary.ambiguous > 0 ? <span className={ui.pillMuted}>중복 후보 {classificationSummary.ambiguous}건</span> : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="ui-table-head text-left">
                <th className="px-4 py-3">받는분</th>
                <th className="px-4 py-3">주소</th>
                <th className="px-4 py-3">운송장번호</th>
                <th className="px-4 py-3">주문 정보</th>
                <th className="px-4 py-3">분류</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr className="border-t border-slate-100">
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    분류할 업로드 행이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.key} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.recipientName}</td>
                    <td className="px-4 py-3 text-slate-600">{row.address}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-800">
                        {row.trackingNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {row.productName ? (
                        <div className="space-y-1">
                          <p className="text-sm text-slate-800">{row.productName}</p>
                          <p className="text-xs text-slate-500">{row.providerOrderLabel}</p>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ShippingClassificationBadge classification={row.classification} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-4 py-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>네이버 {naverMatches.length}건 발송 가능</span>
              {naverMessage ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{naverMessage}</span> : null}
              <span>쿠팡 {coupangMatches.length}건 발송 가능</span>
              {coupangMessage ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{coupangMessage}</span> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleNaverSend}
                disabled={naverSending || naverMatches.length === 0}
                className={ui.buttonPrimary}
              >
                {naverSending ? '네이버 발송 중…' : '네이버 발송'}
              </button>
              <button
                type="button"
                onClick={handleCoupangSend}
                disabled={coupangSending || coupangMatches.length === 0}
                className={ui.buttonSecondary}
              >
                {coupangSending ? '쿠팡 발송 중…' : '쿠팡 발송'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
