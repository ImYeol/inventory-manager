'use client';

import { useState, useMemo } from 'react';
import { cx, ui } from '../../components/ui';

type TransactionItem = {
  id: number;
  date: string;
  type: string;
  quantity: number;
  warehouse: string;
  warehouseId: number;
  createdAt: string;
  modelName: string;
  sizeName: string;
  colorName: string;
  colorRgb: string;
};

type ModelItem = { id: number; name: string };
type WarehouseItem = { id: number; name: string };

const PAGE_SIZE = 20;

const typeStyle: Record<string, string> = {
  '입고': 'bg-slate-100 text-slate-700',
  '출고': 'bg-slate-200 text-slate-800',
  '재고조정': 'bg-slate-100 text-slate-600',
};

export default function HistoryView({
  transactions,
  models,
  warehouses,
}: {
  transactions: TransactionItem[];
  models: ModelItem[];
  warehouses: WarehouseItem[];
}) {
  const [filterModel, setFilterModel] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterWarehouseId, setFilterWarehouseId] = useState<number | ''>('');
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = transactions;
    if (filterModel) result = result.filter((t) => t.modelName === filterModel);
    if (filterType) result = result.filter((t) => t.type === filterType);
    if (filterWarehouseId) result = result.filter((t) => t.warehouseId === filterWarehouseId);
    if (dateFrom) result = result.filter((t) => t.createdAt.slice(0, 10) >= dateFrom)
    if (dateTo) result = result.filter((t) => t.createdAt.slice(0, 10) <= dateTo)
    return result;
  }, [transactions, filterModel, filterType, filterWarehouseId, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const resetFilters = () => {
    setFilterModel('');
    setFilterType('');
    setFilterWarehouseId('');
    setDateFrom('')
    setDateTo('')
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className={cx(ui.panel, ui.panelBody, 'space-y-3')}>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">조회 가이드</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              모델, 창고, 기간 조건을 조합해 특정 입고·출고 이력을 좁혀 보세요. 재고조정도 같은 목록에서 확인할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={ui.pill}>조건별 필터</span>
            <span className={ui.pillMuted}>최근순 정렬</span>
          </div>
        </div>
      </div>

      <div className={cx(ui.panel, ui.panelBody)}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="history-model" className={ui.label}>모델</label>
            <select
              id="history-model"
              value={filterModel}
              onChange={(e) => { setFilterModel(e.target.value); setPage(1); }}
              className={ui.controlSm}
            >
              <option value="">전체</option>
              {models.map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="history-type" className={ui.label}>구분</label>
            <select
              id="history-type"
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className={ui.controlSm}
            >
              <option value="">전체</option>
              <option value="입고">입고</option>
              <option value="출고">출고</option>
              <option value="재고조정">재고조정</option>
            </select>
          </div>
          <div>
            <label htmlFor="history-warehouse" className={ui.label}>창고</label>
            <select
              id="history-warehouse"
              value={filterWarehouseId}
              onChange={(e) => {
                setFilterWarehouseId(e.target.value ? Number(e.target.value) : '');
                setPage(1);
              }}
              className={ui.controlSm}
            >
              <option value="">전체</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="history-date-from" className={ui.label}>시작일</label>
            <input
              id="history-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className={ui.controlSm}
            />
          </div>
          <div>
            <label htmlFor="history-date-to" className={ui.label}>종료일</label>
            <input
              id="history-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className={ui.controlSm}
            />
          </div>
        </div>
        {(filterModel || filterType || filterWarehouseId || dateFrom || dateTo) && (
          <button
            onClick={resetFilters}
            className="mt-3 text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            필터 초기화
          </button>
        )}
        <div className="mt-2 text-sm text-slate-500">
          {filtered.length}건 조회됨
        </div>
      </div>

      {/* Desktop Table */}
      <div className={cx('hidden md:block', ui.tableShell)}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="ui-table-head text-left">
                <th className="px-4 py-3">날짜</th>
                <th className="px-4 py-3">모델</th>
                <th className="px-4 py-3">색상</th>
                <th className="px-4 py-3">사이즈</th>
                <th className="px-4 py-3">구분</th>
                <th className="px-4 py-3 text-right">수량</th>
                <th className="px-4 py-3">창고</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                    이력이 없습니다.
                  </td>
                </tr>
              ) : (
                paged.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="ui-table-cell text-sm text-slate-700">{t.date}</td>
                    <td className="ui-table-cell text-sm font-medium text-slate-800">{t.modelName}</td>
                    <td className="ui-table-cell text-sm text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-3 h-3 rounded-full border border-slate-200 flex-shrink-0"
                          style={{ backgroundColor: t.colorRgb }}
                        />
                        {t.colorName}
                      </div>
                    </td>
                    <td className="ui-table-cell text-sm text-slate-700">{t.sizeName}</td>
                    <td className="ui-table-cell">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${typeStyle[t.type] || 'bg-slate-100 text-slate-600'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="ui-table-cell text-right text-sm font-semibold text-slate-800">
                      {t.quantity}
                    </td>
                    <td className="ui-table-cell text-sm text-slate-600">{t.warehouse}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-2">
        {paged.length === 0 ? (
          <div className={ui.emptyState}>이력이 없습니다.</div>
        ) : (
          paged.map((t) => (
            <div
              key={t.id}
              className="surface px-4 py-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">{t.date}</span>
                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${typeStyle[t.type] || 'bg-slate-100 text-slate-600'}`}>
                  {t.type}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-slate-800">{t.modelName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-sm text-slate-500">
                    <span
                      className="inline-block w-3 h-3 rounded-full border border-slate-200"
                      style={{ backgroundColor: t.colorRgb }}
                    />
                    {t.colorName} / {t.sizeName} / {t.warehouse}
                  </div>
                </div>
                <span className="text-xl font-bold text-slate-800">{t.quantity}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-10 px-4 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            이전
          </button>
          <span className="text-sm text-slate-600 px-3">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="h-10 px-4 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
