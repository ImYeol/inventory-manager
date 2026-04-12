'use client';

import Link from 'next/link';
import { useState, useCallback, useTransition } from 'react';
import * as XLSX from 'xlsx';
import { parseExcelRow, type CourierRow } from '@/lib/excel';
import * as shippingActions from '@/lib/actions/shipping';
import type { NaverOrder, CoupangOrder } from '@/lib/actions/shipping';
import type { ShippingSettingsSummary } from '@/lib/shipping-credentials';
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

function formatUpdatedAt(value?: string | null) {
  if (!value) return '아직 저장 이력이 없습니다.';

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function ProviderStatusCard({
  label,
  configured,
  maskedSummary,
  updatedAt,
}: {
  label: string;
  configured: boolean;
  maskedSummary?: string;
  updatedAt?: string | null;
}) {
  return (
    <div className="surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{label}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {configured ? 'API 키가 저장되어 주문 조회에 사용할 수 있습니다.' : '아직 API 키가 저장되지 않았습니다.'}
          </p>
        </div>
        <span className={cx(ui.pill, configured ? '' : 'bg-slate-50')}>
          <span
            aria-hidden="true"
            className={cx('h-2 w-2 rounded-full', configured ? 'bg-emerald-500' : 'bg-amber-500')}
          />
          {configured ? '설정 완료' : '설정 필요'}
        </span>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500">저장 상태</dt>
          <dd className="font-medium text-slate-800">{configured ? '연결됨' : '미연결'}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500">저장된 키</dt>
          <dd className="font-medium text-slate-800" translate="no">
            {maskedSummary ?? '저장된 키 없음'}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500">최근 변경</dt>
          <dd className="text-right text-slate-600">{formatUpdatedAt(updatedAt)}</dd>
        </div>
      </dl>
    </div>
  );
}

function ProviderMissingState({
  provider,
  message,
  ctaLabel,
}: {
  provider: string;
  message: string;
  ctaLabel: string;
}) {
  return (
    <div className="px-4 py-10">
      <div className={ui.emptyState}>
        <p className="text-base font-semibold text-slate-900">{provider} API 키를 먼저 설정하세요.</p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{message}</p>
        <div className="mt-5">
          <Link href="/settings" className={ui.buttonSecondary}>
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ShippingView({ settingsSummary }: { settingsSummary: ShippingSettingsSummary }) {
  const fetchNaverOrders = shippingActions.fetchNaverOrders;
  const sendNaverTrackingNumbers = shippingActions.sendNaverTrackingNumbers;
  const fetchCoupangOrders = shippingActions.fetchCoupangOrders;
  const sendCoupangTrackingNumbers = shippingActions.sendCoupangTrackingNumbers;

  const [courierRows, setCourierRows] = useState<CourierRow[]>([]);
  const [fileName, setFileName] = useState('');

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
  const hasAllProviderConfig = hasNaverConfig && hasCoupangConfig;

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !hasAnyProviderConfig) return;

      setFileName(file.name);
      setNaverSentMessage('');
      setCoupangSentMessage('');

      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = evt.target?.result;
        if (!data) return;

        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        const parsed = jsonRows.map(parseExcelRow).filter((r) => r.trackingNumber);
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
      };
      reader.readAsArrayBuffer(file);
    },
    [fetchCoupangOrders, fetchNaverOrders, hasAnyProviderConfig, hasCoupangConfig, hasNaverConfig]
  );

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
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Setup</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">배송 채널 연동 상태</h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-500">
              엑셀 파일은 운송장 번호를 매칭하는 재료일 뿐입니다. 네이버와 쿠팡 주문 목록은 사용자별 API 키가 있어야만 조회할 수 있습니다.
            </p>
          </div>
          <Link href="/settings" className={ui.buttonSecondary}>
            설정으로 이동
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ProviderStatusCard
            label="네이버"
            configured={hasNaverConfig}
            maskedSummary={settingsSummary.naver.masked.clientId}
            updatedAt={settingsSummary.naver.updatedAt}
          />
          <ProviderStatusCard
            label="쿠팡"
            configured={hasCoupangConfig}
            maskedSummary={
              [settingsSummary.coupang.masked.accessKey, settingsSummary.coupang.masked.vendorId]
                .filter(Boolean)
                .join(' / ') || undefined
            }
            updatedAt={settingsSummary.coupang.updatedAt}
          />
        </div>

        {!hasAnyProviderConfig ? (
          <div className={ui.emptyState}>
            <p className="text-base font-semibold text-slate-900">API 연동 설정이 필요합니다.</p>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              엑셀 업로드만으로는 주문 목록을 불러올 수 없습니다. 먼저 설정 화면에서 네이버 또는 쿠팡 API 키를 저장한 뒤 다시 시도하세요.
            </p>
            <div className="mt-5">
              <Link href="/settings" className={ui.buttonPrimary}>
                설정으로 이동
              </Link>
            </div>
          </div>
        ) : !hasAllProviderConfig ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4">
            <p className="text-base font-semibold text-slate-900">일부 연동만 완료되었습니다.</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              설정된 채널만 주문을 조회할 수 있습니다. 누락된 채널은 설정을 마친 뒤 같은 엑셀 파일로 함께 처리하세요.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {!hasNaverConfig ? (
                <>
                  <p className="self-center text-sm font-medium text-slate-800">네이버 API 키를 먼저 설정하세요.</p>
                  <Link href="/settings" className={ui.buttonSecondary}>
                    네이버 설정하기
                  </Link>
                </>
              ) : null}
              {!hasCoupangConfig ? (
                <>
                  <p className="self-center text-sm font-medium text-slate-800">쿠팡 API 키를 먼저 설정하세요.</p>
                  <Link href="/settings" className={ui.buttonSecondary}>
                    쿠팡 설정하기
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-4">
            <p className="text-base font-semibold text-slate-900">두 채널 모두 연동되었습니다.</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              엑셀 파일을 업로드하면 네이버와 쿠팡 주문을 동시에 조회해 운송장 번호를 매칭합니다.
            </p>
          </div>
        )}
      </section>

      {hasAnyProviderConfig ? (
        <div className={cx(ui.panel, ui.panelBody)}>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <label htmlFor="shipping-excel-upload" className={cx(ui.buttonPrimary, 'cursor-pointer')}>
              <span>엑셀 업로드</span>
            </label>
            <input
              id="shipping-excel-upload"
              name="shipping-excel-upload"
              type="file"
              accept=".xlsx,.xls"
              className="sr-only"
              onChange={handleFileUpload}
            />
            {fileName ? (
              <div className="text-sm text-slate-600">
                <span className="font-medium">{fileName}</span>
                <span className="ml-2 text-slate-400">({courierRows.length}건 운송장 로드됨)</span>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                {hasAllProviderConfig
                  ? '업로드 즉시 두 채널의 미발송 주문을 조회합니다.'
                  : '업로드 후 설정된 채널만 주문을 조회합니다.'}
              </p>
            )}
          </div>
        </div>
      ) : null}

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
                  className={cx(ui.buttonPrimary, 'px-4 py-2 text-sm')}
                >
                  {naverSending ? '발송 중…' : '보내기'}
                </button>
              </div>
            </div>

            {!hasNaverConfig ? (
              <ProviderMissingState
                provider="네이버"
                message="이 채널은 설정 전이라 엑셀을 올려도 주문 목록을 확인할 수 없습니다. 설정 화면에서 API 키를 저장한 뒤 다시 업로드하세요."
                ctaLabel="네이버 설정하기"
              />
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
                  className={cx(ui.buttonPrimary, 'px-4 py-2 text-sm')}
                >
                  {coupangSending ? '발송 중…' : '보내기'}
                </button>
              </div>
            </div>

            {!hasCoupangConfig ? (
              <ProviderMissingState
                provider="쿠팡"
                message="이 채널은 설정 전이라 엑셀을 올려도 주문 목록을 확인할 수 없습니다. 설정 화면에서 API 키를 저장한 뒤 다시 업로드하세요."
                ctaLabel="쿠팡 설정하기"
              />
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
