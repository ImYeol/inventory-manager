# Step 0: docs-and-ia-reset

## 읽어야 할 파일
- `/Users/yeol-mac/Development/seleccase-inventory/AGENTS.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/PRD.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ARCHITECTURE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/UI_GUIDE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ADR.md`
- `/Users/yeol-mac/Development/seleccase-inventory/phases/index.json`

## 작업
- 사용 맥락 기준으로 전역 IA를 다시 정의한다.
- `상품 관리`를 top-level 도메인으로 승격하고 `상품` / `창고` 관리 책임을 명확히 적는다.
- `재고 운영`은 목록과 이력 view, 입고/출고 action 중심으로 재정의한다.
- `설정`은 `스토어 연결`의 canonical owner로 고정한다.
- 운송장, 설정, 재고 운영의 중복 설명 카드와 AI slop 패턴을 문서에서 명시적으로 제거한다.

## Acceptance Criteria
```bash
npm run lint
npm run build
npm run test
```

## 검증 절차
1. 문서 전반의 메뉴 구조가 서로 충돌하지 않는다.
2. `상품 관리`, `재고 운영`, `소싱`, `운송장`, `설정`의 책임 경계가 분명하다.
3. 기존 `기준 데이터`와 `/integrations` 설명은 stale source of truth로 남지 않는다.

## 금지사항
- 기존 mixed-sidebar 규칙을 그대로 유지한다고 가정하지 마라. 이유: 이번 작업의 출발점이 그 판단의 재검토다.
- 화면 수 기준으로 메뉴를 나누지 마라. 이유: 사용 맥락 중심 IA와 충돌한다.
