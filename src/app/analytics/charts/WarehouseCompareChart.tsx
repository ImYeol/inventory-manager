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

type Props = {
  data: { modelName: string; ogeumdog: number; daejadong: number }[];
};

export default function WarehouseCompareChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-600 mb-3">창고별 비교</h3>
        <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
          데이터가 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
      <h3 className="text-sm font-semibold text-slate-600 mb-3">창고별 비교</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" fontSize={11} tick={{ fill: '#64748b' }} />
          <YAxis
            type="category"
            dataKey="modelName"
            fontSize={11}
            tick={{ fill: '#64748b' }}
            width={80}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
            }}
          />
          <Legend />
          <Bar dataKey="ogeumdog" name="오금동" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          <Bar dataKey="daejadong" name="대자동" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
