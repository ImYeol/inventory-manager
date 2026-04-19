'use client'

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
import { ui } from '@/app/components/ui'
type Props = {
  data: { label: string; inbound: number; outbound: number }[]
}

export default function TransactionBarChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className={ui.emptyState}>데이터가 없습니다.</div>
    );
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" fontSize={11} tick={{ fill: '#64748b' }} />
          <YAxis fontSize={11} tick={{ fill: '#64748b' }} />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: '13px',
            }}
          />
          <Legend />
          <Bar dataKey="inbound" name="입고" fill="#334155" radius={[4, 4, 0, 0]} />
          <Bar dataKey="outbound" name="출고" fill="#94a3b8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
