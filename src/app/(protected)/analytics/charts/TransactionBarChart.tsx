'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ui } from '../../../components/ui';

type Props = {
  data: { label: string; inbound: number; outbound: number }[];
};

export default function TransactionBarChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className={ui.panel}>
        <div className="surface-header px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-700">입출고 현황</h3>
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
        <h3 className="text-sm font-semibold text-slate-700">입출고 현황</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
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
          <Bar dataKey="inbound" name="입고" fill="#334155" radius={[4, 4, 0, 0]} />
          <Bar dataKey="outbound" name="출고" fill="#94a3b8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
