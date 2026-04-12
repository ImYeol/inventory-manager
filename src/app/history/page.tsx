import { prisma } from '@/lib/db';
import HistoryView from './HistoryView';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const [transactions, models] = await Promise.all([
    prisma.transaction.findMany({
      include: {
        model: true,
        size: true,
        color: true,
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.model.findMany({ orderBy: { name: 'asc' } }),
  ]);

  // Serialize dates for client component
  const serialized = transactions.map((t) => ({
    id: t.id,
    date: t.date,
    type: t.type,
    quantity: t.quantity,
    warehouse: t.warehouse,
    createdAt: t.createdAt.toISOString(),
    modelName: t.model.name,
    sizeName: t.size.name,
    colorName: t.color.name,
    colorRgb: t.color.rgbCode,
  }));

  return (
    <div className="px-4 py-5 md:px-8 md:py-6 max-w-6xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-5">📋 입출고이력</h1>
      <HistoryView
        transactions={serialized}
        models={models.map((m) => ({ id: m.id, name: m.name }))}
      />
    </div>
  );
}
