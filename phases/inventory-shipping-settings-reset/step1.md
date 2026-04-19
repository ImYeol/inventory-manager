# Step 1: navigation-products-and-settings-ownership

## 읽어야 할 파일
- `/Users/yeol-mac/Development/seleccase-inventory/AGENTS.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/PRD.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ARCHITECTURE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/UI_GUIDE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/components/Nav.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/settings/page.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/settings/SettingsView.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/integrations/page.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/master-data/page.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/settings/master-data/page.tsx`

## 작업
- 전역 메뉴를 `대시보드`, `재고 운영`, `상품 관리`, `소싱`, `운송장`, `분석`, `설정` 기준으로 재배치한다.
- `상품 관리` canonical route를 만들고 기존 master-data 진입점은 redirect로 정리한다.
- `설정` 안에 스토어 연결 관리 surface를 합치고 `/integrations`는 redirect 또는 thin alias로 축소한다.
- 필요 시 `소싱`은 top-level direct item으로 정리하고 내부 전환은 local navigation으로 풀어낸다.

## Acceptance Criteria
```bash
npm run lint
npm run build
npm run test
```

## 검증 절차
1. 네비게이션에서 `상품 관리`를 바로 찾을 수 있다.
2. `설정`과 `스토어 연결`의 ownership이 한 화면으로 수렴한다.
3. 기존 `/master-data`, `/settings/master-data`, `/integrations` 접근은 깨지지 않고 canonical owner로 이동한다.

## 금지사항
- `설정`과 `스토어 연결`에 같은 form을 동시에 남기지 마라. 이유: ownership이 다시 갈라진다.
- `상품 관리`를 다시 `기준 데이터`라는 내부 용어로만 숨기지 마라. 이유: 사용자가 찾지 못한다.
