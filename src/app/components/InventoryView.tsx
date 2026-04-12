'use client';

import { useState } from 'react';
import { cx, ui } from './ui';

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
            className={ui.panel}
          >
            {/* Model Header */}
            <button
              onClick={() => setExpanded(isOpen ? null : model.id)}
              className="flex w-full items-center justify-between px-4 py-4 text-left transition-colors hover:bg-slate-50 md:px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-inset"
            >
              <span className="text-base font-semibold tracking-tight text-slate-950 md:text-lg">
                {model.name}
              </span>
              <div className="flex items-center gap-3">
                <span className="ui-pill text-slate-700">
                  {totalQty}개
                </span>
                <span className="text-slate-400 text-lg">{isOpen ? '▴' : '▾'}</span>
              </div>
            </button>

            {/* Expanded Content */}
            {isOpen && (
              <div className="border-t border-slate-200 bg-slate-50/60">
                {/* Warehouse Tabs */}
                <div className="flex px-4 pt-3 gap-2">
                  {(['합계', '오금동', '대자동'] as WarehouseTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() =>
                        setWarehouseTab((prev) => ({ ...prev, [model.id]: tab }))
                      }
                      className={cx('px-4 py-2 rounded-lg text-sm font-medium transition-colors', wh === tab ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50')}
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
                  <div className="px-4 py-8 text-center text-sm text-slate-400">
                    사이즈 또는 색상 데이터가 없습니다.
                  </div>
                ) : (
                  <div className="p-3 md:p-4 overflow-x-auto scrollbar-thin">
                    <table className="w-full border-collapse min-w-max">
                      <thead>
                        <tr>
                          <th className="ui-table-head sticky left-0 z-10 px-3 py-2.5 text-left min-w-[100px]">
                            색상
                          </th>
                          {model.sizes.map((size) => (
                            <th
                              key={size.id}
                              className="ui-table-head px-3 py-2.5 text-center min-w-[60px]"
                            >
                              {size.name}
                            </th>
                          ))}
                          <th className="ui-table-head px-3 py-2.5 text-center min-w-[60px]">
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
                            <tr key={color.id} className="hover:bg-slate-50/70">
                              <td className="ui-table-cell sticky left-0 z-10 bg-white font-medium text-sm text-slate-700">
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
                                    className={cx('ui-table-cell text-center text-base font-semibold', qty === 0 ? 'text-slate-300' : 'text-slate-900')}
                                  >
                                    {qty}
                                  </td>
                                );
                              })}
                              <td className="ui-table-cell text-center text-base font-semibold text-slate-950 bg-slate-50">
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
