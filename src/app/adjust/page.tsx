import { prisma } from '@/lib/db';
import AdjustView from './AdjustView';

export const dynamic = 'force-dynamic';

export default async function AdjustPage() {
  const models = await prisma.model.findMany({
    orderBy: { name: 'asc' },
    include: {
      sizes: { orderBy: { sortOrder: 'asc' } },
      colors: { orderBy: { sortOrder: 'asc' } },
      inventory: true,
    },
  });

  return (
    <div className="px-4 py-5 md:px-8 md:py-6 max-w-6xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-5">🔧 재고조정</h1>
      <AdjustView models={models} />
    </div>
  );
}
