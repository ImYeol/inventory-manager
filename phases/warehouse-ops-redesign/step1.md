# Step 1: navigation-and-route-simplification

## 읽어야 할 파일
- `/Users/yeol-mac/Development/seleccase-inventory/AGENTS.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/PRD.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ARCHITECTURE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/UI_GUIDE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/components/Nav.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/components/ui.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/globals.css`

## 작업
- 전역 내비게이션을 mixed sidebar 구조로 재설계한다.
- `재고 운영`, `운송장`, `분석`, `스토어 연결`, `설정`은 direct item으로 둔다.
- `소싱`만 expandable section으로 구성한다.
- `/inventory`를 재고 운영 허브의 canonical route로 정리한다.
- 필요 시 `/inout`, `/history`, `/master-data`는 alias 또는 redirect 전략으로 정리한다.
- `운송장`, `분석`에 singleton category wrapper를 만들지 않는다.
- overlay와 mobile navigation에 필요한 공통 primitive 방향도 함께 정리한다.

## Acceptance Criteria
```bash
npm run lint
npm run build
npm run test
```

## 검증 절차
1. 하위 화면이 없는 메뉴는 확장형이 아니다.
2. 모바일에서 하단 고정 탭 대신 drawer/sheet 기반 탐색이 가능하다.
3. 기존 `/analytics`, `/shipping`, `/settings` 접근성이 유지된다.
4. 기존 deep link 회귀를 줄이기 위한 alias/redirect 전략이 문서와 구현에 반영된다.
5. `운송장`과 `분석`이 불필요한 추가 뎁스 없이 direct item으로 유지된다.

## 금지사항
- 실제 child가 없는 섹션에 서브메뉴를 억지로 만들지 마라. 이유: IA만 복잡해진다.
- page-local className 땜질로 디자인 시스템을 우회하지 마라. 이유: 후속 화면 재사용이 어려워진다.
