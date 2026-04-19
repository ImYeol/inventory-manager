'use client'

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
import { ui } from '@/app/components/ui'
type Props = {
  data: { label: string; quantity: number }[]
}

export default function InventoryTrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className={ui.emptyState}>데이터가 없습니다.</div>
    );
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
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
  )
}
