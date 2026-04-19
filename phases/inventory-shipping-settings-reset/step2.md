# Step 2: inventory-table-and-quick-entry-simplification

## 읽어야 할 파일
- `/Users/yeol-mac/Development/seleccase-inventory/AGENTS.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/PRD.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ARCHITECTURE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/UI_GUIDE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/components/inventory/InventoryWorkspace.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/inout/InOutForm.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/history/HistoryView.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/components/ui/basic-data-table.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/components/ui/table.tsx`

## 작업
- 재고 목록을 dense table, search, warehouse filter, status filter, column visibility 기준으로 재구성한다.
- 제공된 data-table 예시의 row motion, dropdown, column toggle 패턴을 도메인에 맞게 적응한다.
- shared primitive는 `src/components/ui`에 추가한다.
- 입고/출고 overlay는 fixed mode, compact context, editable table, footer action만 남긴다.
- 팝업 안의 중복 타입 토글과 `표 붙여넣기` 기능은 제거한다.
- `이력`은 전역 메뉴가 아니라 재고 운영 내부 view로 다듬는다.

## Acceptance Criteria
```bash
npm run lint
npm run build
npm run test
```

## 검증 절차
1. 창고와 상품명 기준 필터링이 바로 동작한다.
2. 컬럼 표시/숨김 dropdown이 동작한다.
3. 입고 버튼을 눌렀을 때 입고 고정 모드만 열린다.
4. 출고 버튼을 눌렀을 때 출고 고정 모드만 열린다.
5. 팝업 안에 `표 붙여넣기`와 중복 타입 선택 UI가 없다.

## 금지사항
- demo 테이블의 repository/avatar 같은 필드를 그대로 복제하지 마라. 이유: 운영 도메인과 무관한 AI slop가 된다.
- 한 화면에 큰 카드, 긴 설명, 테이블, 팝업 보조 패널을 동시에 얹지 마라. 이유: 작업 표면이 묻힌다.
- `next.config.ts`, `package.json`, `src/app/layout.tsx`, `src/app/globals.css`를 건드리지 마라. 이유: step 2의 재고 테이블/입출고 UX 단순화와 무관한 전역 빌드/폰트 변경은 회귀 범위를 넓힌다.
