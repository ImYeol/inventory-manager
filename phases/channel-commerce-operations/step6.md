# Step 6: inventory-sourcing-dashboard-integration

## 읽어야 할 파일
- `AGENTS.md`
- `docs/UI_GUIDE.md`
- `src/app/components/inventory/InventoryWorkspace.tsx`
- `src/components/ui/inventory-data-table.tsx`
- `src/app/(protected)/sourcing/arrivals/ArrivalsView.tsx`
- `src/app/components/DashboardView.tsx`
- `src/app/(protected)/page.tsx`
- `tests/inventory-workspace.test.ts`
- `tests/arrivals-view.test.ts`
- `tests/dashboard-page.test.ts`

## 작업
- inventory state calculation, combobox selection, sourcing incoming, dashboard summary 테스트를 먼저 작성한다.
- shared `ProductVariantCombobox`를 추가한다. 검색 결과는 상품/옵션/SKU와 두 ChannelBadge 슬롯을 보여주며 자유 텍스트 상품 생성은 허용하지 않는다.
- 재고 목록 기본 열을 상품, SKU/옵션, 창고, onHand, committed, available, incoming, 상태로 변경한다. channelReported는 row detail에서만 노출한다.
- toolbar에 `재고 추가` action을 추가해 ProductVariant+창고+초기 수량을 선택한다. 기존 조합이면 신규 row가 아니라 입고/조정 action으로 전환한다.
- 소싱 arrival item 입력은 ProductVariantCombobox를 재사용하고 remaining ordered-received를 incoming으로 집계한다. 기존 부분 입고 RPC와 factory/memo 흐름은 유지한다.
- 대시보드를 신규 주문, 출고 준비, 확인 필요, 오늘 발송 KPI, 14일 입고/출고 추이, 창고별 onHand/committed/available, 주문 예외, 곧 도착할 소싱으로 정리한다. 불필요한 generic chart/table은 제거한다.
- 모든 페이지는 Simple Surface First와 기존 token/component budget을 지킨다. `src/app/globals.css`는 수정하지 않는다.
- 최종 전체 회귀 검증을 실행한다.

## 완료 조건
- `npm run test -- --run tests/inventory-workspace.test.ts tests/arrivals-view.test.ts tests/dashboard-page.test.ts tests/product-variant-combobox.test.ts`
- `npm run test`
- `npm run lint`
- `npm run build`; 외부 font/network 또는 기존 환경 문제면 신규 회귀와 분리해 summary에 정확히 기록한다.

## 금지사항
- 소싱/재고마다 서로 다른 상품 selector를 만들지 마라. 이유: ProductVariantCombobox가 canonical owner다.
- channelReported를 기본 재고 열에 반복하지 마라. 이유: 상품 관리와 중복되고 실재고와 혼동된다.
- dashboard에 설명 카드나 범용 chart를 추가하지 마라. 이유: 즉시 행동 가능한 운영 상태만 남긴다.

## 결과 기록
완료 시 step 6과 phase를 completed로 바꾸고 전체 검증, 알려진 baseline/environment 문제, 최종 UX 결과를 summary에 기록한다.
