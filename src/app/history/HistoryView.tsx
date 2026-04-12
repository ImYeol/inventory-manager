'use client';

import { useState, useMemo } from 'react';

type TransactionItem = {
  id: number;
  date: string;
  type: string;
  quantity: number;
  warehouse: string;
  createdAt: string;
  modelName: string;
  sizeName: string;
  colorName: string;
  colorRgb: string;
};

type ModelItem = { id: number; name: string };

const PAGE_SIZE = 20;

const typeStyle: Record<string, string> = {
  '입고': 'bg-green-100 text-green-700',
  '반출': 'bg-red-100 text-red-700',
  '재고조정': 'bg-blue-100 text-blue-700',
};

export default function HistoryView({
  transactions,
  models,
}: {
  transactions: TransactionItem[];
  models: ModelItem[];
}) {
  const [filterModel, setFilterModel] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = transactions;
    if (filterModel) result = result.filter((t) => t.modelName === filterModel);
    if (filterType) result = result.filter((t) => t.type === filterType);
    if (filterWarehouse) result = result.filter((t) => t.warehouse === filterWarehouse);
    return result;
  }, [transactions, filterModel, filterType, filterWarehouse]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const resetFilters = () => {
    setFilterModel('');
    setFilterType('');
    setFilterWarehouse('');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">모델</label>
            <select
              value={filterModel}
              onChange={(e) => { setFilterModel(e.target.value); setPage(1); }}
              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">전체</option>
              {models.map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">구분</label>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">전체</option>
              <option value="입고">입고</option>
              <option value="반출">반출</option>
              <option value="재고조정">재고조정</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">창고</label>
            <select
              value={filterWarehouse}
              onChange={(e) => { setFilterWarehouse(e.target.value); setPage(1); }}
              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">전체</option>
              <option value="오금동">오금동</option>
              <option value="대자동">대자동</option>
            </select>
          </div>
        </div>
        {(filterModel || filterType || filterWarehouse) && (
          <button
            onClick={resetFilters}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            필터 초기화
          </button>
        )}
        <div className="mt-2 text-sm text-slate-400">
          {filtered.length}건 조회됨
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 text-sm font-semibold text-slate-600 border-b border-slate-200">날짜</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-600 border-b border-slate-200">모델</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-600 border-b border-slate-200">색상</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-600 border-b border-slate-200">사이즈</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-600 border-b border-slate-200">구분</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-600 border-b border-slate-200 text-right">수량</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-600 border-b border-slate-200">창고</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    이력이 없습니다.
                  </td>
                </tr>
              ) : (
                paged.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-700 border-b border-slate-100">{t.date}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800 border-b border-slate-100">{t.modelName}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-3 h-3 rounded-full border border-slate-200 flex-shrink-0"
                          style={{ backgroundColor: t.colorRgb }}
                        />
                        {t.colorName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 border-b border-slate-100">{t.sizeName}</td>
                    <td className="px-4 py-3 border-b border-slate-100">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${typeStyle[t.type] || 'bg-slate-100 text-slate-600'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800 border-b border-slate-100 text-right">
                      {t.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 border-b border-slate-100">{t.warehouse}</td>
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
          <div className="text-center py-12 text-slate-400">이력이 없습니다.</div>
        ) : (
          paged.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">{t.date}</span>
                <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${typeStyle[t.type] || 'bg-slate-100 text-slate-600'}`}>
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
