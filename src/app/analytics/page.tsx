import { prisma } from '@/lib/db';
import AnalyticsView from './AnalyticsView';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const [models, inventory] = await Promise.all([
    prisma.model.findMany({ orderBy: { name: 'asc' } }),
    prisma.inventory.findMany({ include: { model: true } }),
  ]);

  const summaryMap: Record<string, number> = {};
  for (const inv of inventory) {
    summaryMap[inv.model.name] = (summaryMap[inv.model.name] ?? 0) + inv.quantity;
  }

  const initialSummary = Object.entries(summaryMap)
    .map(([modelName, total]) => ({ modelName, total }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="px-4 py-5 md:px-8 md:py-6 max-w-6xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-5">📊 재고 분석</h1>
      <AnalyticsView
        models={models.map((m) => ({ id: m.id, name: m.name }))}
        initialSummary={initialSummary}
      />
    </div>
  );
}
