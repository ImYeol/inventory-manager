# Step 3: sourcing-schema-and-arrivals

## 읽어야 할 파일
- `/Users/yeol-mac/Development/seleccase-inventory/AGENTS.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/PRD.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ARCHITECTURE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/UI_GUIDE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/prisma/schema.prisma`
- `/Users/yeol-mac/Development/seleccase-inventory/src/lib/actions.ts`
- `/Users/yeol-mac/Development/seleccase-inventory/src/lib/data.ts`

## 작업
- `factories`, `factory_arrivals`, `factory_arrival_items` 도메인을 추가한다.
- `소싱 > 외부 공장`, `소싱 > 입고 예정` 화면을 구현한다.
- 입고 예정의 수동 등록과 CSV 등록을 모두 지원한다.
- 예정 데이터는 실제 재고와 분리된 staging 상태로 유지한다.

## Acceptance Criteria
```bash
npm run lint
npm run build
npm run test
```

## 검증 절차
1. 공장을 등록하고 예정 입고를 연결할 수 있다.
2. 예정 등록만으로 실제 `inventory` 수량이 바뀌지 않는다.
3. CSV 등록 결과가 성공/실패 기준으로 분리되어 보인다.

## 금지사항
- 공장 관리와 입고 예정을 한 화면에 억지로 합치지 마라. 이유: 관리와 운영 작업의 정보 밀도가 다르다.
- 실제 재고 테이블을 복제하는 두 번째 원장을 만들지 마라. 이유: 데이터 불일치 위험이 커진다.
