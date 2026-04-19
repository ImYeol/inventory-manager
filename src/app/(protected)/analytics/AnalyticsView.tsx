'use client';

import { useState, useEffect, useTransition } from 'react';
import InventoryTrendChart from './charts/InventoryTrendChart';
import TransactionBarChart from './charts/TransactionBarChart';
import WarehouseCompareChart from './charts/WarehouseCompareChart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
        getInventoryHistory(period, selectedModel, dateFrom || undefined, dateTo || undefined),
        getWarehouseComparison(selectedModel, dateFrom || undefined, dateTo || undefined),
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
            <Select value={selectedModel !== undefined ? String(selectedModel) : 'all'} onValueChange={(value) => setSelectedModel(value === 'all' ? undefined : Number(value))}>
              <SelectTrigger aria-label="모델" className={ui.controlSm}>
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {models.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={ui.controlSm}
            />
          </div>
          <div>
            <label className={ui.label}>종료일</label>
            <input
              type="date"
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
        <WarehouseCompareChart data={warehouseData} />
      </div>
    </div>
  );
}
