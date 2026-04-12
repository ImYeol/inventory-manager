'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ui } from '../../../components/ui';

type Props = {
  data: { label: string; quantity: number }[];
};

export default function InventoryTrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className={ui.panel}>
        <div className="surface-header px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-700">재고 추이</h3>
        </div>
        <div className="flex h-[300px] items-center justify-center px-4 text-sm text-slate-400">
          데이터가 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className={ui.panel}>
      <div className="surface-header px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">재고 추이</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" fontSize={11} tick={{ fill: '#64748b' }} />
          <YAxis fontSize={11} tick={{ fill: '#64748b' }} />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="quantity"
            name="재고량"
            stroke="#334155"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
