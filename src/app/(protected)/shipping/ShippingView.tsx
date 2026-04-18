'use client';

import Link from 'next/link';
import { useState, useCallback, useTransition } from 'react';
import * as XLSX from 'xlsx';
import { parseExcelRow, type CourierRow } from '@/lib/excel';
import * as shippingActions from '@/lib/actions/shipping';
import type { NaverOrder, CoupangOrder } from '@/lib/actions/shipping';
import type { ShippingSettingsSummary } from '@/lib/shipping-credentials';
import { StatusBadge } from '@/components/ui/badge-1';
import { cx, ui } from '../../components/ui';

type MatchedNaverOrder = NaverOrder & {
  trackingNumber: string;
  excluded: boolean;
  sent?: boolean;
  failed?: boolean;
};

type MatchedCoupangOrder = CoupangOrder & {
  trackingNumber: string;
  excluded: boolean;
  sent?: boolean;
  failed?: boolean;
};

function normalizeAddress(addr: string): string {
  return addr.replace(/\s+/g, '').toLowerCase();
}

function matchOrders<T extends { recipientName?: string; receiverName?: string; recipientAddress?: string; receiverAddr?: string }>(
  orders: T[],
  courierRows: CourierRow[]
): (T & { trackingNumber: string; excluded: boolean })[] {
  return orders.map((order) => {
    const name = ('recipientName' in order ? order.recipientName : order.receiverName) ?? '';
    const addr = ('recipientAddress' in order ? order.recipientAddress : order.receiverAddr) ?? '';
    const normalizedAddr = normalizeAddress(addr);

    const matched = courierRows.find((row) => {
      if (!row.recipientName || !row.trackingNumber) return false;
      const nameMatch = row.recipientName.trim() === name.trim();
      const rowAddr = normalizeAddress(row.address);
      const addrMatch = normalizedAddr.includes(rowAddr) || rowAddr.includes(normalizedAddr);
      return nameMatch && addrMatch;
    });

    return {
      ...order,
      trackingNumber: matched?.trackingNumber ?? '',
      excluded: false,
    };
  });
}

type ExcelRow = Record<string, unknown>;

function isSupportedExcelFile(file: File) {
  const extension = file.name.toLowerCase().split('.').pop();
  const allowedExtensions = ['xlsx', 'xls'];
  const allowedMimeTypes = new Set([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ]);

  return (extension && allowedExtensions.includes(extension)) || allowedMimeTypes.has(file.type);
}

function formatCellValue(value: unknown) {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value);
}

export default function ShippingView({ settingsSummary }: { settingsSummary: ShippingSettingsSummary }) {
  const fetchNaverOrders = shippingActions.fetchNaverOrders;
  const sendNaverTrackingNumbers = shippingActions.sendNaverTrackingNumbers;
  const fetchCoupangOrders = shippingActions.fetchCoupangOrders;
  const sendCoupangTrackingNumbers = shippingActions.sendCoupangTrackingNumbers;

  const [courierRows, setCourierRows] = useState<CourierRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [excelRows, setExcelRows] = useState<ExcelRow[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // 네이버
  const [naverOrders, setNaverOrders] = useState<MatchedNaverOrder[]>([]);
  const [naverError, setNaverError] = useState('');
  const [naverLoading, startNaverTransition] = useTransition();
  const [naverSending, startNaverSendTransition] = useTransition();
  const [naverSentMessage, setNaverSentMessage] = useState('');

  // 쿠팡
  const [coupangOrders, setCoupangOrders] = useState<MatchedCoupangOrder[]>([]);
  const [coupangError, setCoupangError] = useState('');
  const [coupangLoading, startCoupangTransition] = useTransition();
  const [coupangSending, startCoupangSendTransition] = useTransition();
  const [coupangSentMessage, setCoupangSentMessage] = useState('');

  const hasNaverConfig = settingsSummary.naver.configured;
  const hasCoupangConfig = settingsSummary.coupang.configured;
  const hasAnyProviderConfig = hasNaverConfig || hasCoupangConfig;

  const handleFileUpload = useCallback(
    (file: File) => {
      setUploadError('');

      if (!isSupportedExcelFile(file)) {
        setUploadError('엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다.');
        setCourierRows([]);
        setExcelRows([]);
        setExcelColumns([]);
        return;
      }

      setFileName(file.name);
      setNaverSentMessage('');
      setCoupangSentMessage('');

      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = evt.target?.result;
        if (!data) {
          setUploadError('엑셀 파일을 읽을 수 없습니다.');
          setCourierRows([]);
          setExcelRows([]);
          setExcelColumns([]);
          return;
        }

        try {
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];

          if (!sheetName) {
            setUploadError('엑셀 파일에 시트가 없습니다.');
            setCourierRows([]);
            setExcelRows([]);
            setExcelColumns([]);
            return;
          }

          const sheet = workbook.Sheets[sheetName];
          const jsonRows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: '' });
          const nonEmptyRows = jsonRows.filter((row) => Object.keys(row).length > 0);

          setExcelRows(nonEmptyRows);
          setExcelColumns(nonEmptyRows.length > 0 ? Object.keys(nonEmptyRows[0]) : []);

          const parsed = nonEmptyRows.map(parseExcelRow).filter((r) => r.trackingNumber);
          setCourierRows(parsed);

          if (hasNaverConfig) {
            startNaverTransition(async () => {
              setNaverError('');
              const result = await fetchNaverOrders();
              if (result.success) {
                setNaverOrders(matchOrders(result.orders, parsed) as MatchedNaverOrder[]);
              } else {
                setNaverError(result.error ?? '네이버 주문 조회 실패');
              }
            });
          } else {
            setNaverOrders([]);
            setNaverError('');
          }

          if (hasCoupangConfig) {
            startCoupangTransition(async () => {
              setCoupangError('');
              const result = await fetchCoupangOrders();
              if (result.success) {
                setCoupangOrders(matchOrders(result.orders, parsed) as MatchedCoupangOrder[]);
              } else {
                setCoupangError(result.error ?? '쿠팡 주문 조회 실패');
              }
            });
          } else {
            setCoupangOrders([]);
            setCoupangError('');
          }
        } catch {
          setUploadError('엑셀 파일을 처리하지 못했습니다.');
          setCourierRows([]);
          setExcelRows([]);
          setExcelColumns([]);
        }
      };
      reader.onerror = () => {
        setUploadError('엑셀 파일을 읽는 중 오류가 발생했습니다.');
        setCourierRows([]);
        setExcelRows([]);
        setExcelColumns([]);
      };
      reader.readAsArrayBuffer(file);
    },
    [fetchCoupangOrders, fetchNaverOrders, hasCoupangConfig, hasNaverConfig]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    handleFileUpload(file);
    e.currentTarget.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const toggleNaverExclude = (idx: number) => {
    setNaverOrders((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, excluded: !o.excluded } : o))
    );
  };

  const toggleCoupangExclude = (idx: number) => {
    setCoupangOrders((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, excluded: !o.excluded } : o))
    );
  };

  const handleNaverSend = () => {
    const toSend = naverOrders.filter((o) => !o.excluded && o.trackingNumber);
    if (toSend.length === 0) return;

    startNaverSendTransition(async () => {
      setNaverSentMessage('');
      const result = await sendNaverTrackingNumbers(
        toSend.map((o) => ({
          productOrderId: o.productOrderId,
          trackingNumber: o.trackingNumber,
        }))
      );

      const failedSet = new Set(result.failedOrders);
      setNaverOrders((prev) =>
        prev.map((o) => ({
          ...o,
          sent: !o.excluded && o.trackingNumber ? !failedSet.has(o.productOrderId) : undefined,
          failed: failedSet.has(o.productOrderId),
        }))
      );

      if (result.success) {
        setNaverSentMessage(`${toSend.length}건 발송 완료`);
      } else {
        setNaverSentMessage(
          result.error ?? `${result.failedOrders.length}건 실패`
        );
      }
    });
  };

  const handleCoupangSend = () => {
    const toSend = coupangOrders.filter((o) => !o.excluded && o.trackingNumber);
    if (toSend.length === 0) return;

    startCoupangSendTransition(async () => {
      setCoupangSentMessage('');
      const result = await sendCoupangTrackingNumbers(
        toSend.map((o) => ({
          shipmentBoxId: o.shipmentBoxId,
          trackingNumber: o.trackingNumber,
        }))
      );

      const failedSet = new Set(result.failedBoxes);
      setCoupangOrders((prev) =>
        prev.map((o) => ({
          ...o,
          sent: !o.excluded && o.trackingNumber ? !failedSet.has(o.shipmentBoxId) : undefined,
          failed: failedSet.has(o.shipmentBoxId),
        }))
      );

      if (result.success) {
        setCoupangSentMessage(`${toSend.length}건 발송 완료`);
      } else {
        setCoupangSentMessage(
          result.error ?? `${result.failedBoxes.length}건 실패`
        );
      }
    });
  };

  const naverSendableCount = naverOrders.filter((o) => !o.excluded && o.trackingNumber).length;
  const coupangSendableCount = coupangOrders.filter((o) => !o.excluded && o.trackingNumber).length;

  return (
    <div className="space-y-5">
      <section className={cx(ui.panel, ui.panelBody, 'space-y-4')}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Excel Upload</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">운송장 엑셀 업로드</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={cx(ui.pill, hasNaverConfig ? '' : 'bg-slate-50')}>
              <span
                aria-hidden="true"
                className={cx('h-2 w-2 rounded-full', hasNaverConfig ? 'bg-emerald-500' : 'bg-amber-500')}
              />
              네이버 {hasNaverConfig ? '연결됨' : '미연결'}
            </span>
            <span className={cx(ui.pill, hasCoupangConfig ? '' : 'bg-slate-50')}>
              <span
                aria-hidden="true"
                className={cx('h-2 w-2 rounded-full', hasCoupangConfig ? 'bg-emerald-500' : 'bg-amber-500')}
              />
              쿠팡 {hasCoupangConfig ? '연결됨' : '미연결'}
            </span>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div
              className={cx(
                'relative rounded-2xl border-2 border-dashed px-6 py-10 text-center',
                isDragOver ? 'border-slate-500 bg-slate-100' : 'border-slate-300'
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              aria-label="운송장 엑셀 업로드 영역"
            >
              <label
                htmlFor="shipping-excel-upload"
                className="mx-auto flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl bg-slate-200/80 transition hover:scale-105"
              >
                <span className="sr-only">엑셀 업로드</span>
                <input
                  id="shipping-excel-upload"
                  name="shipping-excel-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  className="sr-only"
                  aria-label="운송장 엑셀 업로드"
                  onChange={handleFileChange}
                />
                <svg className="h-7 w-7 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="M17 8l-5-5-5 5" />
                  <path d="M12 3v12" />
                  <path d="M8 14H5a2 2 0 0 0-2 2v3" />
                </svg>
              </label>

              <p className="mt-4 text-sm text-slate-600">엑셀 파일을 드래그하거나 클릭해 업로드하세요.</p>
              <p className="mt-1 text-xs text-slate-500">업로드 형식: .xlsx, .xls</p>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                받는분 이름과 주소가 일치하면 자동 매칭됩니다. 발송 제외 체크로 전송 대상을 더 줄일 수 있습니다.
              </p>
              {fileName ? (
                <p className="mt-3 text-sm font-medium text-slate-800">{fileName}</p>
              ) : null}
              {uploadError ? <p className="mt-3 text-sm text-red-500">{uploadError}</p> : null}
            </div>

            {excelRows.length > 0 ? (
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 ui-table-head">
                      {excelColumns.map((col) => (
                        <th key={col} className="px-3 py-2 font-semibold">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {excelRows.map((row, rowIndex) => (
                      <tr key={`excel-row-${rowIndex}`} className="border-t border-slate-100">
                        {excelColumns.map((col) => (
                          <td key={`${rowIndex}-${col}`} className="px-3 py-2 text-slate-700">
                            {formatCellValue(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {!excelRows.length ? (
              <p className="mt-4 text-sm text-slate-500">
                {hasAnyProviderConfig ? '업로드 즉시 두 채널의 미발송 주문을 조회합니다.' : '엑셀만 업로드해 먼저 형식을 확인할 수 있습니다.'}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className={cx(ui.panel, ui.panelBody, 'flex flex-col gap-3 md:flex-row md:items-center md:justify-between')}>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-950">연동 준비 상태</p>
          <p className="text-sm leading-6 text-slate-500">
            연결 준비와 키 관리는 스토어 연결에서만 처리합니다. 여기서는 업로드와 발송만 진행합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={hasNaverConfig ? 'success' : 'warning'}>
            네이버 {hasNaverConfig ? '연결됨' : '미연결'}
          </StatusBadge>
          <StatusBadge tone={hasCoupangConfig ? 'success' : 'warning'}>
            쿠팡 {hasCoupangConfig ? '연결됨' : '미연결'}
          </StatusBadge>
          <Link href="/integrations" className={ui.buttonSecondary}>
            스토어 연결로 이동
          </Link>
        </div>
      </section>

      {courierRows.length > 0 && (
        <>
          {/* 네이버 섹션 */}
          <div className={ui.tableShell}>
            <div className="surface-header flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-slate-950">네이버</span>
                <span className="text-sm text-slate-500">
                  {naverLoading
                    ? '조회 중…'
                    : `${naverOrders.length}건 조회 / ${naverSendableCount}건 발송 가능`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {naverSentMessage && (
                  <span className="text-sm font-medium text-slate-700" aria-live="polite">
                    {naverSentMessage}
                  </span>
                )}
                <button
                  onClick={handleNaverSend}
                  disabled={naverSending || naverSendableCount === 0}
                  className={cx(ui.buttonPrimary, 'whitespace-nowrap px-4 py-2 text-sm')}
                >
                  {naverSending ? '발송 중…' : '보내기'}
                </button>
              </div>
            </div>

            {!hasNaverConfig ? (
              <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <StatusBadge tone="warning">네이버 미연결</StatusBadge>
                  <p className="text-sm leading-6 text-slate-600">
                    스토어 연결에서 네이버 API 키를 저장하면 이 표에서 주문을 조회할 수 있습니다.
                  </p>
                </div>
                <Link href="/integrations" className={ui.buttonSecondary}>
                  네이버 연결하기
                </Link>
              </div>
            ) : naverError ? (
              <div className="px-4 py-3 text-sm text-red-600">{naverError}</div>
            ) : naverLoading ? (
              <div className="px-4 py-12 text-center text-slate-400">주문 조회 중…</div>
            ) : naverOrders.length === 0 ? (
              <div className="px-4 py-12 text-center text-slate-400">
                {naverError ? '조회 실패' : '미발송 주문이 없습니다.'}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="ui-table-head text-left">
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 border-b border-slate-200 w-12"></th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 border-b border-slate-200">주문번호</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 border-b border-slate-200">상품명</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 border-b border-slate-200">받는분</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 border-b border-slate-200">주소</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 border-b border-slate-200">운송장번호</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 border-b border-slate-200 w-16">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {naverOrders.map((o, i) => (
                        <tr
                          key={o.productOrderId}
                          className={`transition-colors ${o.excluded ? 'bg-slate-50 opacity-50' : 'hover:bg-slate-50'}`}
                        >
                          <td className="px-4 py-2.5 border-b border-slate-100">
                            <label className="inline-flex items-center">
                              <input
                                type="checkbox"
                                checked={!o.excluded}
                                onChange={() => toggleNaverExclude(i)}
                                aria-label={`네이버 주문 ${o.productOrderId} 포함`}
                                className="h-4 w-4 rounded border-slate-300"
                              />
                            </label>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-700 border-b border-slate-100 font-mono text-xs">
                            {o.productOrderId}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-700 border-b border-slate-100 max-w-[200px] truncate">
                            {o.productName}
                          </td>
                          <td className="px-4 py-2.5 text-sm font-medium text-slate-800 border-b border-slate-100">
                            {o.recipientName}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-600 border-b border-slate-100 max-w-[250px] truncate">
                            {o.recipientAddress}
                          </td>
                          <td className="px-4 py-2.5 border-b border-slate-100">
                            {o.trackingNumber ? (
                              <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold font-mono text-slate-800">
                                {o.trackingNumber}
                              </span>
                            ) : (
                              <span className="text-xs text-red-400">미매칭</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 border-b border-slate-100 text-center">
                            {o.sent && <span className="text-xs font-semibold text-slate-700">완료</span>}
                            {o.failed && <span className="text-red-600 text-xs font-bold">실패</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-100">
                  {naverOrders.map((o, i) => (
                    <div
                      key={o.productOrderId}
                      className={`px-4 py-3 ${o.excluded ? 'opacity-50 bg-slate-50' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={!o.excluded}
                              onChange={() => toggleNaverExclude(i)}
                              aria-label={`네이버 주문 ${o.productOrderId} 포함`}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                          </label>
                          <span className="text-sm font-medium text-slate-800">{o.recipientName}</span>
                        </div>
                        {o.sent && <span className="text-xs font-semibold text-slate-700">완료</span>}
                        {o.failed && <span className="text-xs font-semibold text-red-600">실패</span>}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{o.productName}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{o.recipientAddress}</p>
                      <div className="mt-1.5">
                        {o.trackingNumber ? (
                          <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold font-mono text-slate-800">
                            {o.trackingNumber}
                          </span>
                        ) : (
                          <span className="text-xs text-red-400">미매칭</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 쿠팡 섹션 */}
          <div className={ui.tableShell}>
            <div className="surface-header flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-slate-950">쿠팡</span>
                <span className="text-sm text-slate-500">
                  {coupangLoading
                    ? '조회 중…'
                    : `${coupangOrders.length}건 조회 / ${coupangSendableCount}건 발송 가능`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {coupangSentMessage && (
                  <span className="text-sm font-medium text-slate-700" aria-live="polite">
                    {coupangSentMessage}
                  </span>
                )}
                <button
                  onClick={handleCoupangSend}
                  disabled={coupangSending || coupangSendableCount === 0}
                  className={cx(ui.buttonPrimary, 'whitespace-nowrap px-4 py-2 text-sm')}
                >
                  {coupangSending ? '발송 중…' : '보내기'}
                </button>
              </div>
            </div>

            {!hasCoupangConfig ? (
              <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <StatusBadge tone="warning">쿠팡 미연결</StatusBadge>
                  <p className="text-sm leading-6 text-slate-600">
                    스토어 연결에서 쿠팡 API 키를 저장하면 이 표에서 주문을 조회할 수 있습니다.
                  </p>
                </div>
                <Link href="/integrations" className={ui.buttonSecondary}>
                  쿠팡 연결하기
                </Link>
              </div>
            ) : coupangError ? (
              <div className="px-4 py-3 text-sm text-red-600">{coupangError}</div>
            ) : coupangLoading ? (
              <div className="px-4 py-12 text-center text-slate-400">주문 조회 중…</div>
            ) : coupangOrders.length === 0 ? (
              <div className="px-4 py-12 text-center text-slate-400">
                {coupangError ? '조회 실패' : '미발송 주문이 없습니다.'}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="ui-table-head text-left">
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 border-b border-slate-200 w-12"></th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 border-b border-slate-200">주문번호</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 border-b border-slate-200">상품명</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 border-b border-slate-200">받는분</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 border-b border-slate-200">주소</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 border-b border-slate-200">운송장번호</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 border-b border-slate-200 w-16">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupangOrders.map((o, i) => (
                        <tr
                          key={o.shipmentBoxId}
                          className={`transition-colors ${o.excluded ? 'bg-slate-50 opacity-50' : 'hover:bg-slate-50'}`}
                        >
                          <td className="px-4 py-2.5 border-b border-slate-100">
                            <label className="inline-flex items-center">
                              <input
                                type="checkbox"
                                checked={!o.excluded}
                                onChange={() => toggleCoupangExclude(i)}
                                aria-label={`쿠팡 주문 ${o.orderId} 포함`}
                                className="h-4 w-4 rounded border-slate-300"
                              />
                            </label>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-700 border-b border-slate-100 font-mono text-xs">
                            {o.orderId}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-700 border-b border-slate-100 max-w-[200px] truncate">
                            {o.productName}
                          </td>
                          <td className="px-4 py-2.5 text-sm font-medium text-slate-800 border-b border-slate-100">
                            {o.receiverName}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-600 border-b border-slate-100 max-w-[250px] truncate">
                            {o.receiverAddr}
                          </td>
                          <td className="px-4 py-2.5 border-b border-slate-100">
                            {o.trackingNumber ? (
                              <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold font-mono text-slate-800">
                                {o.trackingNumber}
                              </span>
                            ) : (
                              <span className="text-xs text-red-400">미매칭</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 border-b border-slate-100 text-center">
                            {o.sent && <span className="text-xs font-semibold text-slate-700">완료</span>}
                            {o.failed && <span className="text-red-600 text-xs font-bold">실패</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-100">
                  {coupangOrders.map((o, i) => (
                    <div
                      key={o.shipmentBoxId}
                      className={`px-4 py-3 ${o.excluded ? 'opacity-50 bg-slate-50' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={!o.excluded}
                              onChange={() => toggleCoupangExclude(i)}
                              aria-label={`쿠팡 주문 ${o.orderId} 포함`}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                          </label>
                          <span className="text-sm font-medium text-slate-800">{o.receiverName}</span>
                        </div>
                        {o.sent && <span className="text-xs font-semibold text-slate-700">완료</span>}
                        {o.failed && <span className="text-xs font-semibold text-red-600">실패</span>}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{o.productName}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{o.receiverAddr}</p>
                      <div className="mt-1.5">
                        {o.trackingNumber ? (
                          <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold font-mono text-slate-800">
                            {o.trackingNumber}
                          </span>
                        ) : (
                          <span className="text-xs text-red-400">미매칭</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
