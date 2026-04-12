'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ui } from '../../../components/ui'

const BAR_COLORS = ['#334155', '#94a3b8', '#0ea5e9', '#f59e0b', '#10b981', '#ec4899', '#14b8a6', '#8b5cf6']

type WarehouseTotal = {
  id: number
  name: string
  quantity: number
}

type Props = {
  data: {
    modelName: string
    warehouseTotals: WarehouseTotal[]
  }[]
}

type ChartRow = {
  modelName: string
  [key: `w_${number}`]: number
}

export default function WarehouseCompareChart({ data }: Props) {
  const warehouseNames = new Map<number, string>()
  const allWarehouses = data.flatMap((entry) => entry.warehouseTotals)
  for (const warehouse of allWarehouses) {
    if (!warehouseNames.has(warehouse.id)) {
      warehouseNames.set(warehouse.id, warehouse.name)
    }
  }

  const chartRows: ChartRow[] = data.map((entry) => {
    const row: ChartRow = { modelName: entry.modelName }
    for (const total of entry.warehouseTotals) {
      row[`w_${total.id}`] = total.quantity
    }
    return row
  })

  if (data.length === 0) {
    return (
      <div className={ui.panel}>
        <div className="surface-header px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-700">창고별 비교</h3>
        </div>
        <div className="flex h-[300px] items-center justify-center px-4 text-sm text-slate-400">
          데이터가 없습니다.
        </div>
      </div>
    )
  }

  return (
    <div className={ui.panel}>
      <div className="surface-header px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">창고별 비교</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartRows} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" fontSize={11} tick={{ fill: '#64748b' }} />
          <YAxis
            type="category"
            dataKey="modelName"
            fontSize={11}
            tick={{ fill: '#64748b' }}
            width={90}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
            }}
          />
          <Legend />
          {Array.from(warehouseNames.entries()).map(([id, name], index) => (
            <Bar
              key={id}
              dataKey={`w_${id}`}
              name={name}
              fill={BAR_COLORS[index % BAR_COLORS.length]}
              radius={[0, 4, 4, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
