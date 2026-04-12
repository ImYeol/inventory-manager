'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  type PieLabelRenderProps,
} from 'recharts';
import { ui } from '../../../components/ui';

type Props = {
  data: { modelName: string; total: number }[];
};

const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'];

export default function ModelPieChart({ data }: Props) {
  const filtered = data.filter((d) => d.total > 0);

  if (filtered.length === 0) {
    return (
      <div className={ui.panel}>
        <div className="surface-header px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-700">모델별 재고 비율</h3>
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
        <h3 className="text-sm font-semibold text-slate-700">모델별 재고 비율</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={filtered}
            dataKey="total"
            nameKey="modelName"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={(props: PieLabelRenderProps) =>
              `${props.name ?? ''} (${((props.percent ?? 0) * 100).toFixed(0)}%)`
            }
            labelLine={{ strokeWidth: 1 }}
            fontSize={11}
          >
            {filtered.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`${value}개`, '재고']}
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
