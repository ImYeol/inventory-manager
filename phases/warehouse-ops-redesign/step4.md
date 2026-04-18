# Step 4: receive-to-warehouse-and-history

## 읽어야 할 파일
- `/Users/yeol-mac/Development/seleccase-inventory/AGENTS.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/PRD.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ARCHITECTURE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/UI_GUIDE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/history/HistoryView.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/lib/actions.ts`
- `/Users/yeol-mac/Development/seleccase-inventory/src/lib/data.ts`

## 작업
- 입고 예정 항목에서 warehouse를 선택해 원클릭 입고 반영하는 흐름을 만든다.
- 반영 시 inventory, transactions, arrival received quantity를 한 트랜잭션 흐름으로 갱신한다.
- 부분 입고와 중복 반영 방지 로직을 구현한다.
- 재고 운영 허브의 `이력` workspace에서 source metadata를 보여준다.

## Acceptance Criteria
```bash
npm run lint
npm run build
npm run test
```

## 검증 절차
1. 예정 수량 일부만 입고하면 상태가 `부분입고`로 바뀐다.
2. 이미 입고 처리된 수량을 다시 반영하지 않는다.
3. 수동 입력, CSV 입력, 공장 예정입고 반영이 각각 필터 가능하다.

## 금지사항
- receipt 처리와 상태 갱신을 별도 액션으로 분리하지 마라. 이유: 중간 실패 시 데이터 불일치가 생긴다.
- source metadata 없이 단순 수량 반영만 하지 마라. 이유: 이력 추적이 불가능해진다.
