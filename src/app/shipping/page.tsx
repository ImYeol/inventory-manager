import ShippingView from './ShippingView';

export const dynamic = 'force-dynamic';

export default function ShippingPage() {
  return (
    <div className="px-4 py-5 md:px-8 md:py-6 max-w-6xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-5">🚚 운송장 관리</h1>
      <ShippingView />
    </div>
  );
}
