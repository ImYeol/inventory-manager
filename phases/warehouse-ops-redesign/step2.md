# Step 2: inventory-operations-hub

## 읽어야 할 파일
- `/Users/yeol-mac/Development/seleccase-inventory/AGENTS.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/PRD.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ARCHITECTURE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/UI_GUIDE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/components/InventoryView.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/inventory/page.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/inout/InOutForm.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/history/HistoryView.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/lib/actions.ts`
- `/Users/yeol-mac/Development/seleccase-inventory/src/lib/data.ts`

## 작업
- `/inventory`를 단일 재고 운영 허브로 개편한다.
- warehouse selector를 공통 컨텍스트로 도입한다.
- 허브 안에서 `개요`, `입고`, `출고`, `CSV`, `이력` workspace 전환을 제공한다.
- 재고 개요 테이블과 요약 영역을 첫 번째 레퍼런스 수준의 밀도로 재설계한다.
- 수동 입고/출고는 quick entry dialog 또는 sheet 기반 다건 입력 UX를 기본으로 설계한다.
- line-item editor, 마지막 행 복제, 표 붙여넣기, inline validation을 고려한다.
- 모바일에서는 table/card 전환, sticky action, 44px tap target, 14px 이상 body text를 만족시킨다.

## Acceptance Criteria
```bash
npm run lint
npm run build
npm run test
```

## 검증 절차
1. 특정 warehouse를 선택하면 summary, table, 입력 흐름이 함께 바뀐다.
2. 기존 입출고/이력 기능이 허브 안에서 연결된다.
3. 빈 상태와 데이터 존재 상태 모두 일관된 workspace shell 안에서 렌더링된다.
4. 2개 이상 아이템 수기 입력이 한 overlay 안에서 완료 가능하다.
5. 모바일에서 주요 액션과 핵심 데이터가 축소로 인해 읽기 어려워지지 않는다.

## 금지사항
- `입고`, `출고`, `이력`을 다시 1차 메뉴 수준으로 분리하지 마라. 이유: 이번 리디자인의 핵심 방향에 역행한다.
- 모델/옵션 정보를 희생하고 창고명만 강조하지 마라. 이유: SKU 수준 운영 판단이 어려워진다.
