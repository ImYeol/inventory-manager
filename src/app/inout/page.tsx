import { prisma } from '@/lib/db';
import InOutForm from './InOutForm';

export const dynamic = 'force-dynamic';

export default async function InOutPage() {
  const models = await prisma.model.findMany({
    orderBy: { name: 'asc' },
    include: {
      sizes: { orderBy: { sortOrder: 'asc' } },
      colors: { orderBy: { sortOrder: 'asc' } },
    },
  });

  return (
    <div className="px-4 py-5 md:px-8 md:py-6 max-w-2xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-5">📥 입출고 입력</h1>
      <InOutForm models={models} />
    </div>
  );
}
