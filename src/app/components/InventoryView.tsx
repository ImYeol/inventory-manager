'use client';

import { useState } from 'react';

type InventoryItem = {
  id: number;
  modelId: number;
  sizeId: number;
  colorId: number;
  warehouse: string;
  quantity: number;
};

type ColorType = {
  id: number;
  name: string;
  rgbCode: string;
  textWhite: boolean;
  sortOrder: number;
  modelId: number;
};

type SizeType = {
  id: number;
  name: string;
  sortOrder: number;
  modelId: number;
};

type ModelWithRelations = {
  id: number;
  name: string;
  sizes: SizeType[];
  colors: ColorType[];
  inventory: InventoryItem[];
};

type WarehouseTab = '합계' | '오금동' | '대자동';

export default function InventoryView({ models }: { models: ModelWithRelations[] }) {
  const [expanded, setExpanded] = useState<number | null>(models.length === 1 ? models[0].id : null);
  const [warehouseTab, setWarehouseTab] = useState<Record<number, WarehouseTab>>({});

  const getWarehouse = (modelId: number) => warehouseTab[modelId] || '합계';

  const getQty = (model: ModelWithRelations, colorId: number, sizeId: number, wh: WarehouseTab) => {
    if (wh === '합계') {
      return model.inventory
        .filter((inv) => inv.colorId === colorId && inv.sizeId === sizeId)
        .reduce((sum, inv) => sum + inv.quantity, 0);
    }
    const inv = model.inventory.find(
      (i) => i.colorId === colorId && i.sizeId === sizeId && i.warehouse === wh
    );
    return inv?.quantity ?? 0;
  };

  const getTotalQty = (model: ModelWithRelations, wh: WarehouseTab) => {
    if (wh === '합계') {
      return model.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    }
    return model.inventory
      .filter((inv) => inv.warehouse === wh)
      .reduce((sum, inv) => sum + inv.quantity, 0);
  };

  return (
    <div className="space-y-3">
      {models.map((model) => {
        const isOpen = expanded === model.id;
        const wh = getWarehouse(model.id);
        const totalQty = getTotalQty(model, '합계');

        return (
          <div
            key={model.id}
            className="border border-slate-200 rounded-xl shadow-sm overflow-hidden"
          >
            {/* Model Header */}
            <button
              onClick={() => setExpanded(isOpen ? null : model.id)}
              className="w-full flex items-center justify-between px-4 py-4 md:px-6 bg-white hover:bg-slate-50 transition-colors"
            >
              <span className="text-base md:text-lg font-semibold text-slate-800">
                {model.name}
              </span>
              <div className="flex items-center gap-3">
                <span className="bg-blue-100 text-blue-700 text-sm font-bold px-3 py-1 rounded-full">
                  {totalQty}개
                </span>
                <span className="text-slate-400 text-lg">{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>

            {/* Expanded Content */}
            {isOpen && (
              <div className="border-t border-slate-100 bg-slate-50/50">
                {/* Warehouse Tabs */}
                <div className="flex px-4 pt-3 gap-2">
                  {(['합계', '오금동', '대자동'] as WarehouseTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() =>
                        setWarehouseTab((prev) => ({ ...prev, [model.id]: tab }))
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        wh === tab
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {tab}
                      <span className="ml-1.5 text-xs opacity-80">
                        ({getTotalQty(model, tab)})
                      </span>
                    </button>
                  ))}
                </div>

                {/* Matrix Table */}
                {model.sizes.length === 0 || model.colors.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400">
                    사이즈 또는 색상 데이터가 없습니다.
                  </div>
                ) : (
                  <div className="p-3 md:p-4 overflow-x-auto scrollbar-thin">
                    <table className="w-full border-collapse min-w-max">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 bg-slate-100 px-3 py-2.5 text-left text-sm font-semibold text-slate-600 border-b border-slate-200 min-w-[100px]">
                            색상
                          </th>
                          {model.sizes.map((size) => (
                            <th
                              key={size.id}
                              className="px-3 py-2.5 text-center text-sm font-semibold text-slate-600 bg-slate-100 border-b border-slate-200 min-w-[60px]"
                            >
                              {size.name}
                            </th>
                          ))}
                          <th className="px-3 py-2.5 text-center text-sm font-bold text-slate-700 bg-slate-100 border-b border-slate-200 min-w-[60px]">
                            소계
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {model.colors.map((color) => {
                          const rowTotal = model.sizes.reduce(
                            (sum, size) => sum + getQty(model, color.id, size.id, wh),
                            0
                          );
                          return (
                            <tr key={color.id} className="hover:bg-blue-50/50">
                              <td className="sticky left-0 z-10 bg-white px-3 py-2.5 border-b border-slate-100 font-medium text-sm text-slate-700">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="inline-block w-4 h-4 rounded-full border border-slate-200 flex-shrink-0"
                                    style={{ backgroundColor: color.rgbCode }}
                                  />
                                  <span>{color.name}</span>
                                </div>
                              </td>
                              {model.sizes.map((size) => {
                                const qty = getQty(model, color.id, size.id, wh);
                                return (
                                  <td
                                    key={size.id}
                                    className={`px-3 py-2.5 text-center border-b border-slate-100 text-base font-semibold ${
                                      qty === 0 ? 'text-slate-300' : 'text-slate-800'
                                    }`}
                                  >
                                    {qty}
                                  </td>
                                );
                              })}
                              <td className="px-3 py-2.5 text-center border-b border-slate-100 text-base font-bold text-blue-700 bg-blue-50/50">
                                {rowTotal}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
