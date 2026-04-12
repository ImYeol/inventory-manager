'use client';

import { useState, useCallback, useTransition } from 'react';
import * as XLSX from 'xlsx';
import { parseExcelRow, type CourierRow } from '@/lib/excel';
import {
  fetchNaverOrders,
  sendNaverTrackingNumbers,
  fetchCoupangOrders,
  sendCoupangTrackingNumbers,
  type NaverOrder,
  type CoupangOrder,
} from '@/lib/actions/shipping';
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

export default function ShippingView() {
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

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

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

        // 동시에 네이버/쿠팡 주문 조회
        startNaverTransition(async () => {
          setNaverError('');
          const result = await fetchNaverOrders();
          if (result.success) {
            setNaverOrders(matchOrders(result.orders, parsed) as MatchedNaverOrder[]);
          } else {
            setNaverError(result.error ?? '네이버 주문 조회 실패');
          }
        });

        startCoupangTransition(async () => {
          setCoupangError('');
          const result = await fetchCoupangOrders();
          if (result.success) {
            setCoupangOrders(matchOrders(result.orders, parsed) as MatchedCoupangOrder[]);
          } else {
            setCoupangError(result.error ?? '쿠팡 주문 조회 실패');
          }
        });
      };
      reader.readAsArrayBuffer(file);
    },
    []
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
      {/* 엑셀 업로드 */}
      <div className={cx(ui.panel, ui.panelBody)}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label className={cx(ui.buttonPrimary, 'cursor-pointer')}>
            <span>📁 엑셀 업로드</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
          {fileName && (
            <div className="text-sm text-slate-600">
              <span className="font-medium">{fileName}</span>
              <span className="text-slate-400 ml-2">
                ({courierRows.length}건 운송장 로드됨)
              </span>
            </div>
          )}
        </div>
      </div>

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

            {naverError && (
              <div className="px-4 py-3 text-sm text-red-600">{naverError}</div>
            )}

            {naverLoading ? (
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
                            <input
                              type="checkbox"
                              checked={!o.excluded}
                              onChange={() => toggleNaverExclude(i)}
                              className="w-4 h-4 rounded border-slate-300"
                            />
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
                          <input
                            type="checkbox"
                            checked={!o.excluded}
                            onChange={() => toggleNaverExclude(i)}
                            className="w-4 h-4 rounded border-slate-300"
                          />
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

            {coupangError && (
              <div className="px-4 py-3 text-sm text-red-600">{coupangError}</div>
            )}

            {coupangLoading ? (
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
                            <input
                              type="checkbox"
                              checked={!o.excluded}
                              onChange={() => toggleCoupangExclude(i)}
                              className="w-4 h-4 rounded border-slate-300"
                            />
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
                          <input
                            type="checkbox"
                            checked={!o.excluded}
                            onChange={() => toggleCoupangExclude(i)}
                            className="w-4 h-4 rounded border-slate-300"
                          />
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
