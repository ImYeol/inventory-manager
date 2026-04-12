'use client';

import { useState, useEffect, useTransition } from 'react';
import InventoryTrendChart from './charts/InventoryTrendChart';
import TransactionBarChart from './charts/TransactionBarChart';
import ModelPieChart from './charts/ModelPieChart';
import WarehouseCompareChart from './charts/WarehouseCompareChart';
import { cx, ui } from '../../components/ui';
import {
  getTransactionTrend,
  getInventoryHistory,
  getWarehouseComparison,
  type TrendItem,
  type InventoryHistoryItem,
  type WarehouseCompareItem,
} from '@/lib/actions/analytics';

type ModelInfo = { id: number; name: string };
type SummaryItem = { modelName: string; total: number };

type Period = 'daily' | 'monthly' | 'yearly';

const periodLabels: Record<Period, string> = {
  daily: '일별',
  monthly: '월별',
  yearly: '연도별',
};

export default function AnalyticsView({
  models,
  initialSummary,
}: {
  models: ModelInfo[];
  initialSummary: SummaryItem[];
}) {
  const [selectedModel, setSelectedModel] = useState<number | undefined>();
  const [period, setPeriod] = useState<Period>('monthly');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [trendData, setTrendData] = useState<TrendItem[]>([]);
  const [historyData, setHistoryData] = useState<InventoryHistoryItem[]>([]);
  const [warehouseData, setWarehouseData] = useState<WarehouseCompareItem[]>([]);

  const [loading, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const [trend, history, warehouse] = await Promise.all([
        getTransactionTrend(period, selectedModel, dateFrom || undefined, dateTo || undefined),
        getInventoryHistory(period, selectedModel),
        getWarehouseComparison(selectedModel),
      ]);
      setTrendData(trend);
      setHistoryData(history);
      setWarehouseData(warehouse);
    });
  }, [period, selectedModel, dateFrom, dateTo]);

  return (
    <div className="space-y-5">
      {/* 필터 */}
      <div className={cx(ui.panel, ui.panelBody)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className={ui.label}>모델</label>
            <select
              value={selectedModel ?? ''}
              onChange={(e) => setSelectedModel(e.target.value ? Number(e.target.value) : undefined)}
              className={ui.controlSm}
            >
              <option value="">전체</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={ui.label}>기간 단위</label>
            <div className="flex gap-1">
              {(Object.keys(periodLabels) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cx('flex-1', period === p ? ui.tabActive : ui.tab)}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={ui.label}>시작일</label>
            <input
              type="text"
              placeholder="YY.MM.DD"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={ui.controlSm}
            />
          </div>
          <div>
            <label className={ui.label}>종료일</label>
            <input
              type="text"
              placeholder="YY.MM.DD"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={ui.controlSm}
            />
          </div>
        </div>
        {loading && (
          <div className="mt-2 text-sm text-slate-500">데이터 로딩 중…</div>
        )}
      </div>

      {/* 차트 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <InventoryTrendChart data={historyData} />
        <TransactionBarChart data={trendData} />
        <ModelPieChart data={initialSummary} />
        <WarehouseCompareChart data={warehouseData} />
      </div>

      {/* 모델별 재고 요약 테이블 */}
      <div className={ui.tableShell}>
        <div className="surface-header px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-700">모델별 현재 재고 요약</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="ui-table-head text-left">
                <th className="px-4 py-3">순위</th>
                <th className="px-4 py-3">모델명</th>
                <th className="px-4 py-3 text-right">총 재고</th>
                <th className="px-4 py-3">비율</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const grandTotal = initialSummary.reduce((sum, s) => sum + s.total, 0);
                return initialSummary.map((s, i) => (
                  <tr key={s.modelName} className="hover:bg-slate-50/70 transition-colors">
                    <td className="ui-table-cell text-sm text-slate-500">{i + 1}</td>
                    <td className="ui-table-cell text-sm font-medium text-slate-800">{s.modelName}</td>
                    <td className="ui-table-cell text-right text-sm font-semibold text-slate-800">{s.total}</td>
                    <td className="ui-table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-slate-900"
                            style={{ width: `${grandTotal > 0 ? (s.total / grandTotal) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-xs text-slate-500">
                          {grandTotal > 0 ? ((s.total / grandTotal) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
