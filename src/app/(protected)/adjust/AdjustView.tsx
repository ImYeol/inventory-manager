'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adjustInventory } from '@/lib/actions';
import { cx, ui } from '../../components/ui';

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

type WarehouseTab = '오금동' | '대자동';

export default function AdjustView({ models }: { models: ModelWithRelations[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedModelId, setSelectedModelId] = useState<number | ''>('');
  const [warehouseTab, setWarehouseTab] = useState<WarehouseTab>('오금동');
  const [editedCells, setEditedCells] = useState<Record<string, number>>({});
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);

  const selectedModel = models.find((m) => m.id === selectedModelId);

  const cellKey = (colorId: number, sizeId: number) => `${colorId}-${sizeId}`;

  const getInvItem = (colorId: number, sizeId: number, warehouse: string) => {
    if (!selectedModel) return null;
    return selectedModel.inventory.find(
      (inv) => inv.colorId === colorId && inv.sizeId === sizeId && inv.warehouse === warehouse
    ) || null;
  };

  const getQty = (colorId: number, sizeId: number) => {
    const key = cellKey(colorId, sizeId);
    if (editedCells[key] !== undefined) return editedCells[key];
    const inv = getInvItem(colorId, sizeId, warehouseTab);
    return inv?.quantity ?? 0;
  };

  const getOriginalQty = (colorId: number, sizeId: number) => {
    const inv = getInvItem(colorId, sizeId, warehouseTab);
    return inv?.quantity ?? 0;
  };

  const isEdited = (colorId: number, sizeId: number) => {
    const key = cellKey(colorId, sizeId);
    return editedCells[key] !== undefined && editedCells[key] !== getOriginalQty(colorId, sizeId);
  };

  const handleCellChange = (colorId: number, sizeId: number, value: string) => {
    const key = cellKey(colorId, sizeId);
    const numVal = value === '' ? 0 : parseInt(value, 10);
    if (isNaN(numVal)) return;
    setEditedCells((prev) => ({ ...prev, [key]: numVal }));
  };

  const changeWarehouseTab = (wh: WarehouseTab) => {
    setWarehouseTab(wh);
    setEditedCells({});
    setEditingCell(null);
  };

  const changeModel = (id: number | '') => {
    setSelectedModelId(id);
    setEditedCells({});
    setEditingCell(null);
  };

  const changedCount = Object.keys(editedCells).filter((key) => {
    const [cId, sId] = key.split('-').map(Number);
    return editedCells[key] !== getOriginalQty(cId, sId);
  }).length;

  const saveChanges = () => {
    if (!selectedModel || changedCount === 0) return;

    startTransition(async () => {
      const adjustments: Promise<unknown>[] = [];
      for (const [key, newQty] of Object.entries(editedCells)) {
        const [colorId, sizeId] = key.split('-').map(Number);
        const originalQty = getOriginalQty(colorId, sizeId);
        if (newQty === originalQty) continue;

        const inv = getInvItem(colorId, sizeId, warehouseTab);
        if (inv) {
          adjustments.push(adjustInventory(inv.id, newQty));
        } else {
          // Need to create new inventory entry via adjustInventory
          // For cells with no existing inventory, we use addTransaction with 재고조정
          const { addTransaction } = await import('@/lib/actions');
          const today = new Date();
          const dateStr = today.toISOString().slice(0, 10);
          adjustments.push(
            addTransaction({
              date: dateStr,
              modelId: selectedModel.id,
              sizeId: sizeId,
              colorId: colorId,
              type: '재고조정',
              quantity: newQty,
              warehouse: warehouseTab,
            })
          );
        }
      }
      await Promise.all(adjustments);
      setEditedCells({});
      setEditingCell(null);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      {savedMessage && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center font-medium text-slate-700">
          재고조정이 완료되었습니다!
        </div>
      )}

      {/* Model Selector */}
      <div className={cx(ui.panel, ui.panelBody)}>
        <label className={ui.label}>모델 선택</label>
        <select
          value={selectedModelId}
          onChange={(e) => changeModel(e.target.value ? Number(e.target.value) : '')}
          className={ui.control}
        >
          <option value="">모델을 선택하세요</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {selectedModel && (
        <>
          {/* Warehouse Tabs */}
          <div className="flex gap-2">
            {(['오금동', '대자동'] as WarehouseTab[]).map((wh) => (
              <button
                key={wh}
                onClick={() => changeWarehouseTab(wh)}
                className={cx('flex-1 h-12 rounded-xl text-base font-medium transition-colors', warehouseTab === wh ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50')}
              >
                {wh}
              </button>
            ))}
          </div>

          {selectedModel.sizes.length === 0 || selectedModel.colors.length === 0 ? (
            <div className={ui.emptyState}>
              사이즈 또는 색상 데이터가 없습니다.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={cx('hidden md:block', ui.tableShell)}>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full border-collapse min-w-max">
                    <thead>
                      <tr>
                        <th className="ui-table-head sticky left-0 z-10 px-3 py-2.5 text-left min-w-[100px]">
                          색상
                        </th>
                        {selectedModel.sizes.map((size) => (
                          <th
                            key={size.id}
                            className="ui-table-head px-3 py-2.5 text-center min-w-[80px]"
                          >
                            {size.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedModel.colors.map((color) => (
                        <tr key={color.id} className="hover:bg-slate-50/70">
                          <td className="ui-table-cell sticky left-0 z-10 bg-white font-medium text-sm text-slate-700">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block w-4 h-4 rounded-full border border-slate-200 flex-shrink-0"
                                style={{ backgroundColor: color.rgbCode }}
                              />
                              {color.name}
                            </div>
                          </td>
                          {selectedModel.sizes.map((size) => {
                            const key = cellKey(color.id, size.id);
                            const edited = isEdited(color.id, size.id);
                            const isActive = editingCell === key;
                            return (
                              <td key={size.id} className={cx('px-1 py-1 text-center', edited ? 'bg-slate-50' : '')}>
                                {isActive ? (
                                  <input
                                    type="number"
                                    autoFocus
                                    value={getQty(color.id, size.id)}
                                    onChange={(e) => handleCellChange(color.id, size.id, e.target.value)}
                                    onBlur={() => setEditingCell(null)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') setEditingCell(null);
                                    }}
                                    className={cx(ui.controlSm, 'text-center font-semibold')}
                                    min={0}
                                  />
                                ) : (
                                  <button
                                    onClick={() => setEditingCell(key)}
                                    className={cx(
                                      'h-10 w-full rounded-lg text-base font-semibold transition-colors',
                                      edited
                                        ? 'bg-slate-100 text-slate-900'
                                        : getQty(color.id, size.id) === 0
                                        ? 'text-slate-300 hover:bg-slate-50'
                                        : 'text-slate-800 hover:bg-slate-100',
                                    )}
                                  >
                                    {getQty(color.id, size.id)}
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {selectedModel.colors.map((color) => (
                  <div
                    key={color.id}
                    className="surface p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="inline-block w-5 h-5 rounded-full border border-slate-200"
                        style={{ backgroundColor: color.rgbCode }}
                      />
                      <span className="font-semibold text-slate-800">{color.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedModel.sizes.map((size) => {
                        return (
                          <div key={size.id} className="flex flex-col">
                            <label className="mb-1 text-xs text-slate-500">{size.name}</label>
                            <input
                              type="number"
                              value={getQty(color.id, size.id)}
                              onChange={(e) => handleCellChange(color.id, size.id, e.target.value)}
                              className={cx(ui.control, 'h-12 text-center font-semibold')}
                              min={0}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Save Button */}
              {changedCount > 0 && (
                <div className="sticky bottom-20 md:bottom-4 z-20">
                  <button
                    onClick={saveChanges}
                    disabled={isPending}
                    className={cx(ui.buttonPrimary, 'h-14 w-full text-lg font-semibold')}
                  >
                    {isPending ? '저장 중…' : `변경사항 저장 (${changedCount}건)`}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
