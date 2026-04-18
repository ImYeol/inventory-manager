# Step 6: settings-consolidation-and-regression

## 읽어야 할 파일
- `/Users/yeol-mac/Development/seleccase-inventory/AGENTS.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/PRD.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ARCHITECTURE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/UI_GUIDE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/analytics/AnalyticsView.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/settings/*`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/shipping/ShippingView.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/lib/actions/analytics.ts`
- `/Users/yeol-mac/Development/seleccase-inventory/src/lib/actions/shipping.ts`

## 작업
- `기준 데이터`와 기타 관리자 기능을 `설정` 아래로 정리한다.
- 새 메뉴 구조 안에서 analytics/shipping 접근성과 주요 화면 렌더링 회귀를 검증한다.
- 최종적으로 phase 전체 완료 조건을 검증한다.

## Acceptance Criteria
```bash
npm run lint
npm run build
npm run test
```

## 검증 절차
1. `기준 데이터`가 top-level 핵심 메뉴가 아니어도 필요한 관리 기능은 계속 접근 가능하다.
2. `/analytics`와 `/shipping`이 새 내비게이션에서 계속 접근 가능하다.
3. phase index와 문서 요약이 실제 구현 결과와 일치하도록 갱신된다.

## 금지사항
- 관리 기능을 아예 숨기거나 제거하지 마라. 이유: 준비 데이터 운영이 막힌다.
- 분석/운송장 회귀 검증 없이 phase 완료로 처리하지 마라. 이유: 리디자인 범위 밖 회귀를 놓치게 된다.
