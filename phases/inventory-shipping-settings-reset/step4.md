# Step 4: regression-and-phase-closeout

## 읽어야 할 파일
- `/Users/yeol-mac/Development/seleccase-inventory/AGENTS.md`
- `/Users/yeol-mac/Development/seleccase-inventory/phases/inventory-shipping-settings-reset/index.json`
- `/Users/yeol-mac/Development/seleccase-inventory/tests/`

## 작업
- 관련 테스트를 모두 녹색으로 맞춘다.
- lint, build, test 결과를 phase 산출물에 기록한다.
- 문서, route, nav, shared primitive, inventory, shipping, settings가 서로 충돌하지 않는지 최종 검토한다.

## Acceptance Criteria
```bash
npm run lint
npm run build
npm run test
```

## 검증 절차
1. nav, inventory, shipping, settings 관련 회귀 테스트가 통과한다.
2. phase index의 요약이 실제 결과와 맞는다.
3. 남는 제약이 있으면 output에 명시한다.

## 금지사항
- 검증 없이 phase를 완료 처리하지 마라. 이유: UI 리셋 범위는 회귀 위험이 크다.
