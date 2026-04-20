'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import * as XLSX from 'xlsx'
import { parseExcelRow, type CourierRow } from '@/lib/excel'
import * as shippingActions from '@/lib/actions/shipping'
import type { CoupangOrderSheet, NaverOrder } from '@/lib/actions/shipping'
import type { ShippingSettingsSummary } from '@/lib/shipping-credentials'
import type { ShippingClassification } from '@/components/ui/shipping-classification-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StoreConnectionStatus } from '@/components/ui/store-connection-status'
import { cx, ui } from '../../components/ui'

type ShippingProvider = 'naver' | 'coupang'

type CoupangShipmentMatch = {
  shipmentBoxId: number
  orderId: number
  vendorItemIds: number[]
}

type ProviderMatches = {
  naver: { productOrderId: string } | null
  coupang: {
    primary: CoupangShipmentMatch | null
    candidates: CoupangShipmentMatch[]
  }
}

type ShippingPreviewRow = CourierRow & {
  key: string
  classification: ShippingClassification
  classificationSource: 'auto' | 'manual'
  providerMatches: ProviderMatches
}

type CoupangDateRange = {
  fromDate?: string
  toDate?: string
}

function ShippingProviderActionGroup({
  label,
  configured,
  settingsHref,
  refreshing,
  canRefresh,
  onRefresh,
  applying,
  canApply,
  onApply,
  message,
}: {
  label: string
  configured: boolean
  settingsHref: string
  refreshing: boolean
  canRefresh: boolean
  onRefresh: () => void
  applying: boolean
  canApply: boolean
  onApply: () => void
  message: string
}) {
  if (!configured) {
    return (
      <Link
        href={settingsHref}
        aria-label={`${label} 미연결`}
        className={cx(ui.buttonSecondary, ui.buttonDense, 'gap-1.5')}
      >
        <StoreConnectionStatus configured={false} compact disconnectedTone="muted" />
        <span>{label} 미연결</span>
      </Link>
    )
  }

  return (
    <div className={ui.actionGroupDense}>
      <span className={ui.statusPillDense}>
        <StoreConnectionStatus configured compact />
        <span>{label}</span>
      </span>
      <button
        type="button"
        aria-label={`${label} 갱신`}
        onClick={onRefresh}
        disabled={refreshing || applying || !canRefresh}
        className={cx(ui.buttonSecondary, ui.buttonDense, (refreshing || applying || !canRefresh) && 'cursor-not-allowed opacity-50')}
      >
        {refreshing ? '갱신 중…' : '갱신'}
      </button>
      <button
        type="button"
        aria-label={`${label} 반영`}
        onClick={onApply}
        disabled={refreshing || applying || !canApply}
        className={cx(ui.buttonSuccess, ui.buttonDense, (refreshing || applying || !canApply) && 'cursor-not-allowed opacity-50')}
      >
        {applying ? '반영 중…' : '반영'}
      </button>
      <span aria-live="polite" className="sr-only">
        {message ? `${label} ${message}` : ''}
      </span>
    </div>
  )
}

type ExcelRow = Record<string, unknown>

function normalizeAddress(addr: string) {
  return addr.replace(/\s+/g, '').toLowerCase()
}

function normalizeName(value: string | undefined) {
  return (value ?? '').trim()
}

function normalizeDateValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function hasPreviewContent(row: CourierRow) {
  return [row.no, row.reservationNumber, row.recipientName, row.address, row.trackingNumber].some(
    (value) => value.trim().length > 0,
  )
}

function hasTrackingNumber(row: Pick<CourierRow, 'trackingNumber'>) {
  return row.trackingNumber.trim().length > 0
}

function collectCoupangDateRange(rows: CourierRow[]): CoupangDateRange {
  const dates = rows.flatMap((row) =>
    [row.receiptDate, row.pickupScheduleDate, row.pickupDate]
      .map(normalizeDateValue)
      .filter((value): value is string => value !== null),
  )

  if (dates.length === 0) {
    return {}
  }

  const sortedDates = [...dates].sort()

  return {
    fromDate: sortedDates[0],
    toDate: sortedDates[sortedDates.length - 1],
  }
}

function findNaverMatch(row: Pick<CourierRow, 'recipientName' | 'address'>, orders: NaverOrder[]) {
  const normalizedName = normalizeName(row.recipientName)
  const normalizedRowAddress = normalizeAddress(row.address)

  const matchedOrder = orders.find((order) => {
    const orderName = normalizeName(order.recipientName)
    const orderAddress = normalizeAddress(order.recipientAddress)
    return (
      normalizedName.length > 0 &&
      orderName === normalizedName &&
      (orderAddress.includes(normalizedRowAddress) || normalizedRowAddress.includes(orderAddress))
    )
  })

  return matchedOrder ? { productOrderId: matchedOrder.productOrderId } : null
}

function findCoupangMatch(row: Pick<CourierRow, 'recipientName' | 'address'>, orders: CoupangOrderSheet[]) {
  const normalizedName = normalizeName(row.recipientName)
  const normalizedRowAddress = normalizeAddress(row.address)

  const candidates = orders
    .filter((order) => {
      const orderName = normalizeName(order.receiver.name)
      const orderAddress = normalizeAddress(`${order.receiver.addr1} ${order.receiver.addr2}`.trim())
      return (
        normalizedName.length > 0 &&
        orderName === normalizedName &&
        (orderAddress.includes(normalizedRowAddress) || normalizedRowAddress.includes(orderAddress))
      )
    })
    .map<CoupangShipmentMatch>((order) => ({
      shipmentBoxId: order.shipmentBoxId,
      orderId: order.orderId,
      vendorItemIds: order.orderItems
        .map((item) => item.vendorItemId)
        .filter((vendorItemId) => Number.isFinite(vendorItemId) && vendorItemId > 0),
    }))

  return {
    primary: candidates.length === 1 ? candidates[0] : null,
    candidates,
  }
}

function resolveClassification(providerMatches: ProviderMatches): ShippingClassification {
  if (providerMatches.naver && providerMatches.coupang.candidates.length > 0) {
    return 'ambiguous'
  }

  if (providerMatches.coupang.candidates.length > 1) {
    return 'ambiguous'
  }

  if (providerMatches.naver) {
    return 'naver'
  }

  if (providerMatches.coupang.primary) {
    return 'coupang'
  }

  return 'unclassified'
}

function getActiveMatchedOrder(row: ShippingPreviewRow) {
  if (row.classification === 'naver' && row.providerMatches.naver) {
    return { provider: 'naver' as const, productOrderId: row.providerMatches.naver.productOrderId }
  }

  if (row.classification === 'coupang' && row.providerMatches.coupang.primary) {
    return {
      provider: 'coupang' as const,
      shipmentBoxId: row.providerMatches.coupang.primary.shipmentBoxId,
      orderId: row.providerMatches.coupang.primary.orderId,
      vendorItemIds: row.providerMatches.coupang.primary.vendorItemIds,
    }
  }

  return null
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

function classifyRows(courierRows: CourierRow[], naverOrders: NaverOrder[], coupangOrders: CoupangOrderSheet[]) {
  return courierRows.map<ShippingPreviewRow>((row, index) => {
    const providerMatches = {
      naver: findNaverMatch(row, naverOrders),
      coupang: findCoupangMatch(row, coupangOrders),
    }

    return {
      ...row,
      key: `${index}-${row.trackingNumber || row.reservationNumber || row.recipientName}`,
      classification: resolveClassification(providerMatches),
      classificationSource: 'auto',
      providerMatches,
    }
  })
}

function refreshRowsForProvider(
  rows: ShippingPreviewRow[],
  provider: ShippingProvider,
  orders: NaverOrder[] | CoupangOrderSheet[],
) {
  return rows.map((row) => {
    const providerMatches =
      provider === 'naver'
        ? { ...row.providerMatches, naver: findNaverMatch(row, orders as NaverOrder[]) }
        : { ...row.providerMatches, coupang: findCoupangMatch(row, orders as CoupangOrderSheet[]) }

    if (row.classificationSource === 'manual') {
      return {
        ...row,
        providerMatches,
      }
    }

    return {
      ...row,
      classification: resolveClassification(providerMatches),
      providerMatches,
    }
  })
}

export default function ShippingView({ settingsSummary }: { settingsSummary: ShippingSettingsSummary }) {
  const [uploadError, setUploadError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [previewRows, setPreviewRows] = useState<ShippingPreviewRow[]>([])
  const [coupangDateRange, setCoupangDateRange] = useState<CoupangDateRange>({})
  const [classificationFilter, setClassificationFilter] = useState<'all' | 'naver' | 'coupang' | 'unclassified'>('all')
  const [previewPage, setPreviewPage] = useState(1)
  const [naverMessage, setNaverMessage] = useState('')
  const [coupangMessage, setCoupangMessage] = useState('')
  const [classifying, setClassifying] = useState(false)
  const [naverRefreshing, startNaverRefreshTransition] = useTransition()
  const [coupangRefreshing, startCoupangRefreshTransition] = useTransition()
  const [naverApplying, startNaverApplyTransition] = useTransition()
  const [coupangApplying, startCoupangApplyTransition] = useTransition()
  const rowsPerPage = 50

  const hasNaverConfig = settingsSummary.naver.configured
  const hasCoupangConfig = settingsSummary.coupang.configured

  const handleFileUpload = (file: File) => {
    setUploadError('')
    setNaverMessage('')
    setCoupangMessage('')

    if (!isSupportedExcelFile(file)) {
      setUploadError('엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다.')
      setPreviewRows([])
      setCoupangDateRange({})
      setPreviewPage(1)
      setClassifying(false)
      return
    }

    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = evt.target?.result
      if (!data) {
        setUploadError('엑셀 파일을 읽을 수 없습니다.')
        setPreviewRows([])
        setCoupangDateRange({})
        setPreviewPage(1)
        setClassifying(false)
        return
      }

      try {
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
          setUploadError('엑셀 파일에 시트가 없습니다.')
          setPreviewRows([])
          setCoupangDateRange({})
          setPreviewPage(1)
          setClassifying(false)
          return
        }

        const sheet = workbook.Sheets[sheetName]
        const jsonRows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: '' })
        const courierRows = jsonRows
          .filter((row) => Object.keys(row).length > 0)
          .map(parseExcelRow)
          .filter(hasPreviewContent)
        const nextCoupangDateRange = collectCoupangDateRange(courierRows)
        setCoupangDateRange(nextCoupangDateRange)

        setClassifying(true)
        void (async () => {
          try {
            const [naverResult, coupangResult] = await Promise.all([
              hasNaverConfig ? shippingActions.fetchNaverOrders() : Promise.resolve({ success: true, orders: [] as NaverOrder[] }),
              hasCoupangConfig
                ? shippingActions.fetchCoupangOrders(nextCoupangDateRange)
                : Promise.resolve({ success: true, orders: [] as CoupangOrderSheet[] }),
            ])

            setPreviewRows(
              classifyRows(
                courierRows,
                naverResult.success ? naverResult.orders : [],
                coupangResult.success ? coupangResult.orders : [],
              ),
            )
            setPreviewPage(1)
          } catch {
            setUploadError('엑셀 파일을 처리하지 못했습니다.')
            setPreviewRows([])
            setCoupangDateRange({})
            setPreviewPage(1)
          } finally {
            setClassifying(false)
          }
        })()
      } catch {
        setUploadError('엑셀 파일을 처리하지 못했습니다.')
        setPreviewRows([])
        setCoupangDateRange({})
        setPreviewPage(1)
        setClassifying(false)
      }
    }

    reader.onerror = () => {
      setUploadError('엑셀 파일을 읽는 중 오류가 발생했습니다.')
      setPreviewRows([])
      setCoupangDateRange({})
      setPreviewPage(1)
      setClassifying(false)
    }

    reader.readAsArrayBuffer(file)
  }

  const filteredRows = useMemo(
    () => previewRows.filter((row) => classificationFilter === 'all' || row.classification === classificationFilter),
    [classificationFilter, previewRows],
  )
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage))
  const pagedRows = useMemo(
    () => filteredRows.slice((previewPage - 1) * rowsPerPage, previewPage * rowsPerPage),
    [filteredRows, previewPage],
  )
  useEffect(() => {
    setPreviewPage((currentPage) => Math.min(Math.max(currentPage, 1), totalPages))
  }, [totalPages])
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

  const naverMatches = useMemo(
    () =>
      previewRows.filter((row) => {
        const matchedOrder = getActiveMatchedOrder(row)
        return matchedOrder?.provider === 'naver' && hasTrackingNumber(row)
      }),
    [previewRows],
  )
  const coupangMatches = useMemo(
    () =>
      previewRows.filter((row) => {
        const matchedOrder = getActiveMatchedOrder(row)
        return matchedOrder?.provider === 'coupang' && hasTrackingNumber(row)
      }),
    [previewRows],
  )

  const handleClassificationFilterChange = (value: 'all' | 'naver' | 'coupang' | 'unclassified') => {
    setClassificationFilter(value)
    setPreviewPage(1)
  }

  const handleManualClassification = (rowKey: string, nextClassification: ShippingClassification) => {
    setPreviewRows((rows) =>
      rows.map((row) =>
        row.key === rowKey ? { ...row, classification: nextClassification, classificationSource: 'manual' } : row,
      ),
    )
  }

  const goPrevPage = () => {
    setPreviewPage((current) => Math.max(1, current - 1))
  }

  const goNextPage = () => {
    setPreviewPage((current) => Math.min(totalPages, current + 1))
  }

  const handleNaverRefresh = () => {
    if (!hasNaverConfig || previewRows.length === 0) return

    startNaverRefreshTransition(async () => {
      const result = await shippingActions.fetchNaverOrders()
      if (!result.success) {
        setNaverMessage(result.error ?? '오류')
        return
      }

      setPreviewRows((rows) => refreshRowsForProvider(rows, 'naver', result.orders))
      setNaverMessage('갱신됨')
    })
  }

  const handleCoupangRefresh = () => {
    if (!hasCoupangConfig || previewRows.length === 0) return

    startCoupangRefreshTransition(async () => {
      const result = await shippingActions.fetchCoupangOrders(coupangDateRange)
      if (!result.success) {
        setCoupangMessage(result.error ?? '오류')
        return
      }

      setPreviewRows((rows) => refreshRowsForProvider(rows, 'coupang', result.orders))
      setCoupangMessage('갱신됨')
    })
  }

  const handleNaverSend = () => {
    const targets = naverMatches.flatMap((row) =>
      getActiveMatchedOrder(row)?.provider === 'naver'
        ? [{ productOrderId: getActiveMatchedOrder(row).productOrderId, trackingNumber: row.trackingNumber }]
        : [],
    )
    if (targets.length === 0) return

    startNaverApplyTransition(async () => {
      const result = await shippingActions.sendNaverTrackingNumbers(targets)
      setNaverMessage(result.success ? `${targets.length}건 반영됨` : (result.error ?? `${result.failedOrders.length}건 실패`))
    })
  }

  const handleCoupangSend = () => {
    const targets = coupangMatches.flatMap((row) =>
      getActiveMatchedOrder(row)?.provider === 'coupang'
        ? [
            {
              shipmentBoxId: getActiveMatchedOrder(row).shipmentBoxId,
              orderId: getActiveMatchedOrder(row).orderId,
              vendorItemIds: getActiveMatchedOrder(row).vendorItemIds,
              trackingNumber: row.trackingNumber,
            },
          ]
        : [],
    )
    if (targets.length === 0) return

    startCoupangApplyTransition(async () => {
      const result = await shippingActions.sendCoupangTrackingNumbers(targets)
      setCoupangMessage(result.success ? `${targets.length}건 반영됨` : (result.error ?? `${result.failedBoxes.length}건 실패`))
    })
  }

  const renderClassificationControl = (row: ShippingPreviewRow) => {
    return (
      <Select
        value={row.classification}
        onValueChange={(value) => handleManualClassification(row.key, value as ShippingClassification)}
      >
        <SelectTrigger aria-label={`${row.recipientName} 분류 변경`} className={cx(ui.controlSm, 'h-8 w-[6.75rem] min-w-[6.75rem]')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ambiguous">중복 후보</SelectItem>
          <SelectItem value="unclassified">미분류</SelectItem>
          <SelectItem value="naver">네이버</SelectItem>
          <SelectItem value="coupang">쿠팡</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  const statusMessages = [
    naverMessage ? `네이버 ${naverMessage}` : null,
    coupangMessage ? `쿠팡 ${coupangMessage}` : null,
  ].filter(Boolean) as string[]

  return (
    <div className="space-y-4">
      <Card variant="strong" className="overflow-hidden">
        <CardHeader className="border-b border-[color:var(--border)] px-4 py-3">
          <div className="space-y-1">
            <CardTitle className="text-base">운송장 업로드</CardTitle>
            <p className="text-sm leading-6 text-slate-500">엑셀을 넣고, 연결 상태를 확인한 뒤, 바로 분류 결과를 확인합니다.</p>
          </div>
        </CardHeader>
        <CardContent className="px-4 py-4">
          <div
            className={cx(
              ui.surfaceMuted,
              'relative rounded-2xl border-2 border-dashed border-[color:var(--border)] px-6 py-10 text-center transition-colors',
              isDragOver && 'border-[color:var(--border-strong)]',
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
            <label
              htmlFor="shipping-excel-upload"
              className={cx(ui.surface, 'mx-auto flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl transition hover:scale-105')}
            >
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
        </CardContent>
      </Card>

      <Card variant="strong" className="overflow-hidden">
        <CardHeader className="border-b border-[color:var(--border)] px-0 py-0">
          <div className="px-4 py-2.5">
            <CardTitle className="text-sm">분류 미리보기</CardTitle>
          </div>
          <div className="border-t border-[color:var(--border)] px-4 py-2">
            <div className={cx(ui.toolbarDense, 'md:overflow-visible')}>
              <Select
                value={classificationFilter}
                onValueChange={(value) =>
                  handleClassificationFilterChange(value as 'all' | 'naver' | 'coupang' | 'unclassified')
                }
              >
                <SelectTrigger aria-label="분류 필터" className={cx(ui.controlSm, 'h-8 w-[7.5rem] min-w-[7.5rem] rounded-xl px-2.5 text-xs')}>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="naver">네이버</SelectItem>
                  <SelectItem value="coupang">쿠팡</SelectItem>
                  <SelectItem value="unclassified">미분류</SelectItem>
                </SelectContent>
              </Select>
              <div className={cx(ui.actionGroupDense, 'gap-1.5 md:ml-auto')}>
                <ShippingProviderActionGroup
                  label="네이버"
                  configured={hasNaverConfig}
                  settingsHref="/settings?section=store-connections&provider=naver"
                  refreshing={classifying || naverRefreshing}
                  canRefresh={previewRows.length > 0 && !classifying}
                  onRefresh={handleNaverRefresh}
                  applying={naverApplying}
                  canApply={naverMatches.length > 0 && !classifying && !naverRefreshing}
                  onApply={handleNaverSend}
                  message={naverMessage}
                />
                <ShippingProviderActionGroup
                  label="쿠팡"
                  configured={hasCoupangConfig}
                  settingsHref="/settings?section=store-connections&provider=coupang"
                  refreshing={classifying || coupangRefreshing}
                  canRefresh={previewRows.length > 0 && !classifying}
                  onRefresh={handleCoupangRefresh}
                  applying={coupangApplying}
                  canApply={coupangMatches.length > 0 && !classifying && !coupangRefreshing}
                  onApply={handleCoupangSend}
                  message={coupangMessage}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-0 p-0">
          <div className="border-b border-[color:var(--border)] px-4 py-2">
            <div className={cx(ui.toolbarDense, 'gap-1.5 text-[11px] text-slate-500 md:overflow-visible')}>
              <span className={cx(ui.pill, 'px-2 py-0.5 text-[11px]')}>전체 {classificationSummary.total}건</span>
              <span className={cx(ui.pill, 'px-2 py-0.5 text-[11px]')}>네이버 {classificationSummary.naver}건</span>
              <span className={cx(ui.pill, 'px-2 py-0.5 text-[11px]')}>쿠팡 {classificationSummary.coupang}건</span>
              <span className={cx(ui.pillMuted, 'px-2 py-0.5 text-[11px]')}>미분류 {classificationSummary.unclassified}건</span>
              {classificationSummary.ambiguous > 0 ? (
                <span className={cx(ui.pillMuted, 'px-2 py-0.5 text-[11px]')}>중복 후보 {classificationSummary.ambiguous}건</span>
              ) : null}
              {statusMessages.map((message) => (
                <span key={message} className={cx(ui.statusPillDense, 'text-[11px] md:ml-auto first:md:ml-auto')}>
                  {message}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-max border-collapse text-sm">
              <thead>
                <tr className="ui-table-head text-left">
                  <th className="px-4 py-3 whitespace-nowrap">분류</th>
                  <th className="px-4 py-3 whitespace-nowrap">No</th>
                  <th className="px-4 py-3 whitespace-nowrap">집화예정장소</th>
                  <th className="px-4 py-3 whitespace-nowrap">접수일자</th>
                  <th className="px-4 py-3 whitespace-nowrap">집화예정일자</th>
                  <th className="px-4 py-3 whitespace-nowrap">집화일자</th>
                  <th className="px-4 py-3 whitespace-nowrap">예약구분</th>
                  <th className="px-4 py-3 whitespace-nowrap">예약번호</th>
                  <th className="px-4 py-3 whitespace-nowrap">운송장번호</th>
                  <th className="px-4 py-3 whitespace-nowrap">받는분</th>
                  <th className="px-4 py-3 whitespace-nowrap">전화번호</th>
                  <th className="px-4 py-3 whitespace-nowrap">주소</th>
                  <th className="px-4 py-3 whitespace-nowrap">예약매체</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 ? (
                  <tr className="border-t border-[color:var(--border)]">
                    <td colSpan={13} className="px-4 py-12 text-center text-slate-400">
                      분류할 업로드 행이 없습니다.
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row) => (
                    <tr key={row.key} className="border-t border-[color:var(--border)]">
                      <td className="px-4 py-3 whitespace-nowrap">{renderClassificationControl(row)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{row.no || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{row.pickupLocation || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{row.receiptDate || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{row.pickupScheduleDate || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{row.pickupDate || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{row.reservationType || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{row.reservationNumber || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cx(ui.pillMuted, 'px-2 py-0.5 font-mono text-xs font-semibold text-slate-800')}>
                          {row.trackingNumber || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">{row.recipientName}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{row.phone || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{row.address || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{row.reservationMedia || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[color:var(--border)] px-4 py-3">
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={goPrevPage}
                disabled={previewPage === 1 || totalPages === 1}
                className={cx(ui.buttonSecondary, (previewPage === 1 || totalPages === 1) && 'cursor-not-allowed opacity-50')}
              >
                이전
              </button>
              <span className="min-w-[5rem] text-center text-sm text-slate-500">
                {filteredRows.length > 0 ? `${previewPage} / ${totalPages}` : '0 / 0'}
              </span>
              <button
                type="button"
                onClick={goNextPage}
                disabled={previewPage === totalPages || totalPages === 1}
                className={cx(ui.buttonSecondary, (previewPage === totalPages || totalPages === 1) && 'cursor-not-allowed opacity-50')}
              >
                다음
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
