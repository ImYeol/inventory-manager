import { prisma } from '@/lib/db';
import InventoryView from './components/InventoryView';

export const dynamic = 'force-dynamic';

export default async function Home() {
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
      <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-5">📦 재고현황</h1>
      {models.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-lg">
          등록된 모델이 없습니다.
        </div>
      ) : (
        <InventoryView models={models} />
      )}
    </div>
  );
}
